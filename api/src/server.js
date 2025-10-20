// api/server.js
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import multer from "multer";
import path from "path";
import fs from "fs";

import { bkashCreate, bkashExecute } from "./bkash/sdk.js";
import { bkashCfg } from "./bkash/config.js";


import { Prisma } from "@prisma/client";




// import asyncRoute from "./lib/asyncRoute.js"; 


dotenv.config();
const app = express();
const prisma = new PrismaClient();

/* ----------------------------------
   Core middleware
---------------------------------- */
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

/* ----------------------------------
   Helpers
---------------------------------- */

function hasField(model, field) {
  return Boolean(prisma._runtimeData?.clientVersion) // prisma >=5/6 guard
    ? !!(prisma[model]?.fields?.find?.(f => f.name === field))
    : true; // if unknown Prisma internals, assume true (no crash)
}


const toSafe = (v) => {
  if (typeof v === "bigint") return Number(v);
  if (v instanceof Date) return v.toISOString();
  if (Array.isArray(v)) return v.map(toSafe);
  if (v && typeof v === "object") {
    return Object.fromEntries(Object.entries(v).map(([k, val]) => [k, toSafe(val)]));
  }
  return v;
};
const asyncRoute = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

const auth = (req, res, next) => {
  const header = req.headers.authorization || "";
  const [bearer, token] = header.split(" ");
  if (bearer !== "Bearer" || !token) return res.status(401).json({ error: "No token" });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || "devsecret"); // { user_id, role }
    next();
  } catch (e) {
    return res.status(401).json({ error: "Invalid token", detail: e.message });
  }
};
const adminOnly = (req, res, next) => {
  if (!req.user || String(req.user.role).toLowerCase() !== "admin") {
    return res.status(403).json({ error: "Admin only" });
  }
  next();
};

const notify = async ({ user_id, title, body }) => {
  try {
    await prisma.notifications.create({ data: { user_id, title, body: body || null, is_read: false } });
  } catch (e) {
    console.error("Notify failed:", e.message);
  }
};

/* ----------------------------------
   File uploads (local)
---------------------------------- */
/* ----------------------------------
   File uploads (local)
---------------------------------- */


const UPLOAD_ROOT = path.join(process.cwd(), "uploads");
const AVATAR_DIR = path.join(UPLOAD_ROOT, "avatars");
const COVER_DIR  = path.join(UPLOAD_ROOT, "covers");
const PROOFS_DIR = path.join(UPLOAD_ROOT, "proofs");

// ensure folders exist
for (const dir of [UPLOAD_ROOT, AVATAR_DIR, COVER_DIR, PROOFS_DIR]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

// serve uploads statically
app.use("/uploads", express.static(UPLOAD_ROOT));

const filenameGen = (req, file, cb) => {
  const ext = path.extname(file.originalname || "").toLowerCase();
  cb(null, `${req.user?.user_id || "anon"}_${Date.now()}${ext}`);
};

// One uploader per destination (don’t rely on fieldname)
const avatarUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, AVATAR_DIR),
    filename: filenameGen
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = ["image/png", "image/jpeg", "image/jpg", "image/webp"].includes(file.mimetype);
    cb(ok ? null : new Error("Only PNG/JPG/WEBP images allowed"), ok);
  }
});

const coverUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, COVER_DIR),
    filename: filenameGen
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = ["image/png", "image/jpeg", "image/jpg", "image/webp"].includes(file.mimetype);
    cb(ok ? null : new Error("Only PNG/JPG/WEBP images allowed"), ok);
  }
});

const proofsUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, PROOFS_DIR),
    filename: filenameGen
  }),
  limits: { fileSize: 10 * 1024 * 1024 }, // allow a bit bigger
  fileFilter: (_req, file, cb) => {
    const ok = ["image/png", "image/jpeg", "image/jpg", "image/webp", "application/pdf"].includes(file.mimetype);
    cb(ok ? null : new Error("Only PNG/JPG/WEBP/PDF allowed"), ok);
  }
});

// avatar -> /uploads/avatars/xxx
app.post("/api/upload/avatar", auth, avatarUpload.single("file"), asyncRoute(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  const url = `/uploads/avatars/${req.file.filename}`;
  await prisma.users.update({ where: { user_id: req.user.user_id }, data: { avatar: url } });
  res.json({ ok: true, url });
}));

// cover -> /uploads/covers/xxx
app.post("/api/upload/cover", auth, coverUpload.single("file"), asyncRoute(async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No file uploaded" });
  const url = `/uploads/covers/${req.file.filename}`;
  await prisma.users.update({ where: { user_id: req.user.user_id }, data: { cover_photo: url } });
  res.json({ ok: true, url });
}));

// multiple proof files -> /uploads/proofs/xxx
app.post("/api/uploads/proofs", auth, proofsUpload.array("files"), asyncRoute(async (req, res) => {
  if (!req.files?.length) return res.status(400).json({ error: "No files uploaded" });
  const urls = req.files.map(f => `/uploads/proofs/${f.filename}`);
  res.json({ ok: true, urls });
}));


/* ----------------------------------
   Health
---------------------------------- */
app.get("/api/health", asyncRoute(async (_req, res) => {
  const [row] = await prisma.$queryRaw`SELECT NOW() AS now`;
  res.json({ ok: true, dbTime: row.now });
}));

/* ----------------------------------
   Auth: register / login / me
---------------------------------- */
app.post("/api/auth/register", asyncRoute(async (req, res) => {
  const { first_name, last_name, username, email, password } = req.body;
  if (!first_name || !last_name || !username || !email || !password) {
    return res.status(400).json({ error: "All fields required" });
  }
  const hashed = await bcrypt.hash(password, 10);
  const user = await prisma.users.create({
    data: {
      first_name, last_name, username, email,
      password_hash: hashed,
      role: "user",
      status: "active"
    },
    select: { user_id: true, first_name: true, last_name: true, username: true, email: true }
  });
  const token = jwt.sign({ user_id: user.user_id, role: "user" }, process.env.JWT_SECRET || "devsecret", { expiresIn: "1d" });
  res.json({ user, token });
}));

app.post("/api/auth/login", asyncRoute(async (req, res) => {
  const { emailOrUsername, password } = req.body;
  if (!emailOrUsername || !password) return res.status(400).json({ error: "emailOrUsername and password required" });

  const user = await prisma.users.findFirst({ where: { OR: [{ email: emailOrUsername }, { username: emailOrUsername }] } });
  if (!user) return res.status(400).json({ error: "User not found" });

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return res.status(400).json({ error: "Wrong password" });

  const token = jwt.sign({ user_id: user.user_id, role: user.role }, process.env.JWT_SECRET || "devsecret", { expiresIn: "1d" });

  res.json({
    token,
    user: {
      user_id: user.user_id,
      first_name: user.first_name,
      last_name: user.last_name,
      username: user.username,
      email: user.email,
      role: user.role,
      avatar: user.avatar
    }
  });
}));

app.get("/api/me", auth, asyncRoute(async (req, res) => {
  const me = await prisma.users.findUnique({
    where: { user_id: req.user.user_id },
    select: {
      user_id: true, first_name: true, last_name: true, username: true, email: true,
      role: true, avatar: true, cover_photo: true, profession: true, status: true
    }
  });
  if (me?.status === "blocked") {
    return res.status(403).json({ error: "Your profile has been blocked. Contact meetexpert111@meetexpert.com" });
  }
  res.json(me);
}));

/* ----------------------------------
   Immediate media update (avatar/cover)
---------------------------------- */
app.patch("/api/me/avatar", auth, asyncRoute(async (req, res) => {
  const { avatar } = req.body; // URL from /api/upload
  if (!avatar) return res.status(400).json({ error: "avatar required" });
  await prisma.users.update({ where: { user_id: req.user.user_id }, data: { avatar } });
  res.json({ ok: true, avatar });
}));
app.patch("/api/me/cover", auth, asyncRoute(async (req, res) => {
  const { cover_photo } = req.body; // URL from /api/upload
  if (!cover_photo) return res.status(400).json({ error: "cover_photo required" });
  await prisma.users.update({ where: { user_id: req.user.user_id }, data: { cover_photo } });
  res.json({ ok: true, cover_photo });
}));

/* ----------------------------------
   Expert profile + posts + ratings
---------------------------------- */
app.post("/api/dev/make-expert", auth, asyncRoute(async (req, res) => {
  const exists = await prisma.expert_profiles.findUnique({ where: { expert_id: req.user.user_id } });
  if (exists) return res.json({ ok: true, expert: exists, note: "Already expert" });
  const expert = await prisma.expert_profiles.create({
    data: { expert_id: req.user.user_id, price_model: "per_chat", price_amount: 5, currency: "USD", is_verified: false }
  });
  res.json({ ok: true, expert });
}));

// Posts
app.post("/api/posts", auth, asyncRoute(async (req, res) => {
  const expert = await prisma.expert_profiles.findUnique({ where: { expert_id: req.user.user_id } });
  if (!expert) return res.status(403).json({ error: "Only experts can create posts" });
  const { title, content, visibility } = req.body;
  if (!title || !content) return res.status(400).json({ error: "title and content required" });
  const post = await prisma.posts.create({
    data: {
      expert_id: req.user.user_id,
      title, content,
      visibility: visibility === "subscribers" ? "subscribers" : "public"
    }
  });
  res.json(post);
}));

app.get("/api/posts", asyncRoute(async (_req, res) => {
  const posts = await prisma.posts.findMany({
    where: { deleted_at: null, visibility: "public" },
    orderBy: { created_at: "desc" }
  });
  const ids = [...new Set(posts.map(p => p.expert_id))];
  const authors = await prisma.users.findMany({
    where: { user_id: { in: ids } },
    select: { user_id: true, username: true, first_name: true, last_name: true, avatar: true }
  });
  const map = new Map(authors.map(a => [a.user_id, a]));
  res.json(posts.map(p => ({ ...p, author: map.get(p.expert_id) })));
}));

// Ratings
app.post("/api/ratings", auth, asyncRoute(async (req, res) => {
  const { expert_id, rating_value, review } = req.body;
  if (!expert_id || !rating_value) return res.status(400).json({ error: "expert_id and rating_value required" });
  if (rating_value < 1 || rating_value > 5) return res.status(400).json({ error: "rating_value must be 1..5" });

  const seeker_id = req.user.user_id;
  const hadSub = await prisma.subscriptions.findFirst({
    where: { seeker_id, expert_id, status: { in: ["active", "expired", "canceled", "refunded"] } },
    orderBy: { start_at: "desc" }
  });
  if (!hadSub) return res.status(403).json({ error: "You can rate only experts you subscribed to at least once." });

  const existing = await prisma.ratings.findUnique({ where: { subscription_id: hadSub.subscription_id } });
  const ratingRecord = existing
    ? await prisma.ratings.update({ where: { rating_id: existing.rating_id }, data: { rating_value, review: review ?? existing.review } })
    : await prisma.ratings.create({ data: { subscription_id: hadSub.subscription_id, seeker_id, expert_id, rating_value, review: review ?? null } });

  try {
    const agg = await prisma.ratings.aggregate({ _avg: { rating_value: true }, where: { expert_id } });
    await prisma.expert_profiles.update({ where: { expert_id }, data: { overall_rating: Number(agg._avg.rating_value?.toFixed(2) || 0) } });
  } catch {}

  res.json({ ok: true, rating: ratingRecord });
}));


// GET /api/experts/:id/details
app.get("/api/experts/:id/details", asyncRoute(async (req, res) => {
  const expert_id = Number(req.params.id);

  const user = await prisma.users.findUnique({
    where: { user_id: expert_id },
    select: { user_id: true, username: true, first_name: true, last_name: true, avatar: true, profession: true }
  });

  const ep = await prisma.expert_profiles.findUnique({
    where: { expert_id },
    select: {
      price_model: true, price_amount: true, currency: true, is_verified: true,
      company: true, position: true, primary_skill: true, description: true, proof_urls: true, overall_rating: true
    }
  });

  if (!user || !ep) return res.status(404).json({ error: "Expert not found" });

  res.json({ user, details: ep });
}));



// GET /api/experts/:id/ratings
app.get("/api/experts/:id/ratings", asyncRoute(async (req, res) => {
  const expert_id = Number(req.params.id);

  const list = await prisma.ratings.findMany({
    where: { expert_id },
    orderBy: { created_at: "desc" },
    select: {
      rating_id: true,
      rating_value: true,
      review: true,
      created_at: true,
      seeker_id: true
    }
  });

  const seekerIds = [...new Set(list.map(r => r.seeker_id))];
  const seekers = seekerIds.length
    ? await prisma.users.findMany({
        where: { user_id: { in: seekerIds } },
        select: { user_id: true, username: true, first_name: true, last_name: true, avatar: true }
      })
    : [];
  const map = new Map(seekers.map(s => [s.user_id, s]));
  const withUsers = list.map(r => ({
    ...r,
    rating_id: Number(r.rating_id),
    rating_value: Number(r.rating_value ?? 0),
    seeker: map.get(r.seeker_id)
  }));

  const agg = await prisma.ratings.aggregate({
    _avg: { rating_value: true },
    _count: { rating_id: true },
    where: { expert_id }
  });

  const avg = Number(agg._avg.rating_value ?? 0);
  const total = Number(agg._count.rating_id ?? 0);

  res.json({
    avg: Number.isFinite(avg) ? Number(avg.toFixed(2)) : 0,
    total,
    items: withUsers
  });
}));


// Expert public profile
// GET /api/experts/:id
app.get("/api/experts/:id", asyncRoute(async (req, res) => {
  const expert_id = Number(req.params.id);

  const user = await prisma.users.findUnique({
    where: { user_id: expert_id },
    select: {
      user_id: true, username: true, first_name: true, last_name: true,
      avatar: true, cover_photo: true, bio: true, profession: true
    }
  });

  const expert = await prisma.expert_profiles.findUnique({
    where: { expert_id },
    select: {
      price_model: true,
      price_amount: true,
      currency: true,
      overall_rating: true,
      is_verified: true
    }
  });

  if (!user || !expert) return res.status(404).json({ error: "Expert not found" });

  const agg = await prisma.ratings.aggregate({
    _avg: { rating_value: true },
    _count: { rating_id: true },
    where: { expert_id }
  });

  res.json({
    ...user,
    price_model: expert.price_model,
    price_amount: Number(expert.price_amount ?? 0),
    currency: expert.currency,
    overall_rating: Number(expert.overall_rating ?? 0),
    is_verified: !!expert.is_verified,
    rating: {
      avg: Number((agg._avg.rating_value ?? 0).toFixed?.(2) ?? 0),
      total: Number(agg._count.rating_id ?? 0)
    }
  });
}));


// GET /api/experts
app.get("/api/experts", asyncRoute(async (req, res) => {
  const q        = (req.query.q || "").trim();
  const minPrice = req.query.minPrice ? Number(req.query.minPrice) : null;
  const maxPrice = req.query.maxPrice ? Number(req.query.maxPrice) : null;
  const sort     = (req.query.sort || "rating_desc").toString();
  const page     = Math.max(1, Number(req.query.page || 1));
  const limit    = Math.min(50, Math.max(1, Number(req.query.limit || 10)));
  const skip     = (page - 1) * limit;

  const whereUser = {
    status: "active",
    ...(q ? {
      OR: [
        { first_name: { contains: q } },
        { last_name:  { contains: q } },
        { username:   { contains: q } },
        { profession: { contains: q } },
      ]
    } : {})
  };

  const whereExpert = {
    ...(minPrice !== null ? { price_amount: { gte: minPrice } } : {}),
    ...(maxPrice !== null ? { price_amount: { lte: maxPrice } } : {}),
  };

  const orderBy =
    sort === "price_asc"  ? [{ price_amount: "asc" }]  :
    sort === "price_desc" ? [{ price_amount: "desc" }] :
    sort === "rating_asc" ? [{ overall_rating: "asc" }] :
                            [{ overall_rating: "desc" }];

  const total = await prisma.expert_profiles.count({
    where: { ...whereExpert, users: { ...whereUser } }
  });

  const experts = await prisma.expert_profiles.findMany({
    where: { ...whereExpert, users: { ...whereUser } },
    orderBy, skip, take: limit,
    select: {
      expert_id: true,
      price_model: true,
      price_amount: true,
      currency: true,
      overall_rating: true,
      is_verified: true,
      users: {
        select: {
          user_id: true, username: true, first_name: true, last_name: true, avatar: true, profession: true
        }
      }
    }
  });

  const items = experts.map(e => ({
    expert_id: Number(e.expert_id),
    price_model: e.price_model,
    price_amount: Number(e.price_amount ?? 0),
    currency: e.currency,
    overall_rating: Number(e.overall_rating ?? 0),
    is_verified: !!e.is_verified,
    user: e.users
  }));

  res.json({ page, limit, total, items });
}));


/* ----------------------------------
   Subscriptions & Chats
---------------------------------- */
app.post("/api/subscriptions", auth, asyncRoute(async (req, res) => {
  const seeker_id = req.user.user_id;
  const { expert_id, amount } = req.body;

  const expert = await prisma.expert_profiles.findUnique({ where: { expert_id: Number(expert_id) } });
  if (!expert) return res.status(404).json({ error: "Expert not found" });

  let sub = await prisma.subscriptions.findFirst({ where: { seeker_id, expert_id: Number(expert_id), status: "active" } });
  if (!sub) {
    sub = await prisma.subscriptions.create({
      data: { seeker_id, expert_id: Number(expert_id), start_at: new Date(), amount_paid: Number(amount) || 0, status: "active" }
    });
  }

  let chat = await prisma.chats.findFirst({ where: { subscription_id: sub.subscription_id } });
  if (!chat) chat = await prisma.chats.create({ data: { subscription_id: sub.subscription_id, created_at: new Date() } });

  res.json(toSafe({ ok: true, subscription: sub, chat }));
}));

app.get("/api/chats", auth, asyncRoute(async (req, res) => {
  const uid = Number(req.user.user_id);
  const rows = await prisma.$queryRaw`
    SELECT
      c.chat_id, c.created_at,
      s.subscription_id, s.seeker_id, s.expert_id, s.status, s.start_at, s.end_at,
      CASE WHEN s.seeker_id = ${uid} THEN e.user_id    ELSE k.user_id    END AS peer_user_id,
      CASE WHEN s.seeker_id = ${uid} THEN e.username   ELSE k.username   END AS peer_username,
      CASE WHEN s.seeker_id = ${uid} THEN e.first_name ELSE k.first_name END AS peer_first_name,
      CASE WHEN s.seeker_id = ${uid} THEN e.last_name  ELSE k.last_name  END AS peer_last_name,
      CASE WHEN s.seeker_id = ${uid} THEN e.avatar     ELSE k.avatar     END AS peer_avatar
    FROM chats c
    JOIN subscriptions s ON s.subscription_id = c.subscription_id
    JOIN users k ON k.user_id = s.seeker_id
    JOIN users e ON e.user_id = s.expert_id
    WHERE s.status = 'active' AND (s.seeker_id = ${uid} OR s.expert_id = ${uid})
    ORDER BY c.created_at DESC
  `;
  res.json(rows.map(r => ({
    chat_id: Number(r.chat_id),
    created_at: r.created_at,
    subscription_id: Number(r.subscription_id),
    seeker_id: Number(r.seeker_id),
    expert_id: Number(r.expert_id),
    status: r.status,
    start_at: r.start_at,
    end_at: r.end_at,
    peer: {
      user_id: Number(r.peer_user_id),
      username: r.peer_username,
      first_name: r.peer_first_name,
      last_name: r.peer_last_name,
      avatar: r.peer_avatar
    }
  })));
}));

app.get("/api/chats/:id/messages", auth, asyncRoute(async (req, res) => {
  const chat_id = Number(req.params.id);
  const uid = req.user.user_id;

  const [row] = await prisma.$queryRaw`
    SELECT s.seeker_id, s.expert_id, s.status
    FROM chats c
    JOIN subscriptions s ON s.subscription_id = c.subscription_id
    WHERE c.chat_id = ${chat_id} LIMIT 1
  `;
  if (!row) return res.status(404).json({ error: "Chat not found" });
  if (![row.seeker_id, row.expert_id].includes(uid)) return res.status(403).json({ error: "Not a participant" });
  if (row.status !== "active") return res.status(403).json({ error: "Subscription is not active" });

  const msgs = await prisma.messages.findMany({
    where: { chat_id },
    orderBy: { created_at: "asc" },
    select: { message_id: true, chat_id: true, sender_id: true, content: true, has_attachment: true, is_urgent: true, created_at: true }
  });
  res.json(msgs.map(m => ({ ...m, message_id: Number(m.message_id), chat_id: Number(m.chat_id), sender_id: Number(m.sender_id), created_at: toSafe(m.created_at) })));
}));

app.post("/api/chats/:id/messages", auth, asyncRoute(async (req, res) => {
  const chat_id = Number(req.params.id);
  const myId = req.user.user_id;
  const { content, is_urgent } = req.body;
  if (!content || !content.trim()) return res.status(400).json({ error: "content required" });

  const [row] = await prisma.$queryRaw`
    SELECT s.seeker_id, s.expert_id, s.status
    FROM chats c
    JOIN subscriptions s ON s.subscription_id = c.subscription_id
    WHERE c.chat_id = ${chat_id} LIMIT 1
  `;
  if (!row) return res.status(404).json({ error: "Chat not found" });
  if (![row.seeker_id, row.expert_id].includes(myId)) return res.status(403).json({ error: "Not a participant" });
  if (row.status !== "active") return res.status(403).json({ error: "Subscription is not active" });

  const msg = await prisma.messages.create({
    data: { chat_id, sender_id: myId, content: content.trim(), is_urgent: !!is_urgent },
    select: { message_id: true, chat_id: true, sender_id: true, content: true, has_attachment: true, is_urgent: true, created_at: true }
  });
  res.json({ ...msg, message_id: Number(msg.message_id), chat_id: Number(msg.chat_id), sender_id: Number(msg.sender_id), created_at: toSafe(msg.created_at) });
}));

app.post("/api/chats/open", auth, asyncRoute(async (req, res) => {
  const expert_id = Number(req.body.expert_id);
  if (!expert_id) return res.status(400).json({ error: "expert_id required" });

  const sub = await prisma.subscriptions.findFirst({ where: { seeker_id: req.user.user_id, expert_id, status: "active" }, orderBy: { start_at: "desc" } });
  if (!sub) return res.status(403).json({ error: "No active subscription with this expert" });

  let chat = await prisma.chats.findFirst({ where: { subscription_id: sub.subscription_id } });
  if (!chat) chat = await prisma.chats.create({ data: { subscription_id: sub.subscription_id } });
  res.json({ chat });
}));


app.get("/api/subscriptions/status/:expertId", auth, asyncRoute(async (req, res) => {
  const seeker_id = req.user.user_id;
  const expert_id = Number(req.params.expertId);

  // active == status 'active' and (end_at is null OR end_at > now)
  const active = await prisma.subscriptions.findFirst({
    where: {
      seeker_id, expert_id,
      status: "active",
      OR: [{ end_at: null }, { end_at: { gt: new Date() } }]
    },
    select: { subscription_id: true, end_at: true, status: true }
  });

  res.json({
    canSubscribe: !active,
    activeUntil: active?.end_at || null
  });
}));



app.post("/api/subscriptions/:expertId", auth, asyncRoute(async (req, res) => {
  const seeker_id = req.user.user_id;
  const expert_id = Number(req.params.expertId);

  // 1) pull expert pricing
  const expert = await prisma.expert_profiles.findUnique({
    where: { expert_id },
    select: { price_model: true, price_amount: true, currency: true, is_verified: true }
  });
  if (!expert) return res.status(404).json({ error: "Expert not found" });
  const amount = Number(expert.price_amount || 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ error: "Expert is not purchasable" });
  }

  // 2) ensure no active sub exists already
  const existing = await prisma.subscriptions.findFirst({
    where: {
      seeker_id, expert_id,
      status: "active",
      OR: [{ end_at: null }, { end_at: { gt: new Date() } }]
    },
    select: { subscription_id: true, end_at: true }
  });
  if (existing) {
    return res.status(400).json({ error: "You already have an active subscription with this expert" });
  }

  // 3) check balance
  const me = await prisma.users.findUnique({
    where: { user_id: seeker_id },
    select: { wallet: true }
  });
  const balance = Number(me?.wallet || 0);
  if (balance < amount) {
    return res.status(402).json({ error: "Insufficient wallet balance" }); // front-end will redirect to /wallet
  }

  // 4) create everything atomically
  const now = new Date();
  const endAt = expert.price_model === "monthly"
    ? new Date(now.getTime() + 30 * 24 * 3600 * 1000)
    : null; // for per_chat / per_question we keep it open-ended but still 'active'

  const result = await prisma.$transaction(async (tx) => {
    // 4a) debit wallet + ledger row
    await tx.users.update({
      where: { user_id: seeker_id },
      data: { wallet: { decrement: amount } }
    });

    const wtx = await tx.wallet_transactions.create({
      data: {
        user_id: seeker_id,
        amount,
        kind: "debit",
        method: "wallet",
        reference: null,
        note: `subscription:${expert_id}`,
        status: "success"
      },
      select: { tx_id: true }
    });

    // 4b) subscription
    const sub = await tx.subscriptions.create({
      data: {
        seeker_id,
        expert_id,
        plan: expert.price_model, // 'monthly' | 'per_chat' | 'per_question'
        start_at: now,
        end_at: endAt,
        amount_paid: amount,
        currency: expert.currency || "USD",
        status: "active"
      },
      select: { subscription_id: true }
    });

    // 4c) optional: payments table row for admin accounting
    await tx.payments.create({
      data: {
        payer_id: seeker_id,
        expert_id,
        subscription_id: sub.subscription_id,
        amount,
        currency: expert.currency || "USD",
        gateway: "wallet",
        gateway_txn_id: String(wtx.tx_id),
        status: "succeeded"
      }
    });

    // 4d) create chat bound to subscription (so Inbox opens)
    await tx.chats.create({
      data: { subscription_id: sub.subscription_id }
    });

    // 4e) notify expert + seeker (optional)
    await tx.notifications.create({
      data: {
        user_id: expert_id,
        title: "New subscriber",
        body: "You have a new subscriber via wallet."
      }
    });
    await tx.notifications.create({
      data: {
        user_id: seeker_id,
        title: "Subscription active",
        body: "Your subscription is now active. Check your Inbox to chat."
      }
    });

    return {
      subscription_id: sub.subscription_id,
      tx_id: wtx.tx_id,
      end_at: endAt
    };
  });

  res.json({ ok: true, ...result });
}));



/* ----------------------------------
   Search + public user
---------------------------------- */
app.get("/api/search", asyncRoute(async (req, res) => {
  const q = (req.query.q || "").trim();
  if (!q) return res.json({ users: [], companies: [], skills: [] });

  const users = await prisma.users.findMany({
    where: { OR: [{ first_name: { contains: q } }, { last_name: { contains: q } }, { username: { contains: q } }], status: "active" },
    select: { user_id: true, username: true, first_name: true, last_name: true, avatar: true }
  });
  const companies = await prisma.companies.findMany({ where: { company_name: { contains: q } }, select: { company_id: true, company_name: true, location: true } });
  const skills = await prisma.skills.findMany({ where: { skill_name: { contains: q } }, select: { skill_id: true, skill_name: true } });
  res.json(toSafe({ users, companies, skills }));
}));

app.get("/api/users/:id", asyncRoute(async (req, res) => {
  const user_id = Number(req.params.id);
  const u = await prisma.users.findUnique({
    where: { user_id },
    select: { user_id: true, username: true, first_name: true, last_name: true, avatar: true, cover_photo: true, profession: true, bio: true }
  });
  if (!u) return res.status(404).json({ error: "User not found" });
  res.json(u);
}));

/* ----------------------------------
   Skills (dropdown + “Other…”)
---------------------------------- */
app.get("/api/skills", asyncRoute(async (req, res) => {
  const q = String(req.query.q || "").trim();
  const items = await prisma.skills.findMany({
    where: q ? { skill_name: { contains: q } } : undefined,
    orderBy: { skill_name: "asc" },
    take: 100
  });
  res.json(items);
}));
app.post("/api/skills", auth, asyncRoute(async (req, res) => {
  const name = (req.body.name || req.body.skill_name || "").trim();
  if (!name) return res.status(400).json({ error: "skill name required" });
  const existing = await prisma.skills.findFirst({ where: { skill_name: name } });
  const row = existing || (await prisma.skills.create({ data: { skill_name: name } }));
  res.json(row);
}));

// ========================
// Become Expert Request
// ========================
app.post("/api/expert-requests", auth, asyncRoute(async (req, res) => {
  const user_id = req.user.user_id;

  const {
    company = null,
    position = null,
    skill,
    description,
    proof_urls = [],
  } = req.body;

  // Basic validation
  if (!skill || !String(skill).trim()) {
    return res.status(400).json({ error: "skill is required" });
  }
  if (!description || !String(description).trim()) {
    return res.status(400).json({ error: "description is required" });
  }

  // Normalize proof URLs array
  let proof_url = "[]";
  if (Array.isArray(proof_urls) && proof_urls.length > 0) {
    proof_url = JSON.stringify(proof_urls);
  }

  // Create the expert request (no price model / amount here!)
  const created = await prisma.expert_requests.create({
    data: {
      user_id,
      company: company || null,
      position: position || null,
      skill: String(skill).trim(),
      description: String(description).trim(),
      proof_url,
      status: "pending",
    },
    select: {
      request_id: true,
      status: true,
      created_at: true,
    },
  });

  return res.json({ ok: true, request: created });
}));



// =========================
// ADMIN • Expert Requests — LIST
// GET /api/admin/expert-requests?status=pending|approved|rejected
// =========================
app.get(
  "/api/admin/expert-requests",
  auth,
  adminOnly,
  asyncRoute(async (req, res) => {
    const status = (req.query.status || "").toString();
    const where = status ? { status } : {};

    const rows = await prisma.expert_requests.findMany({
      where,
      orderBy: { request_id: "desc" },
      select: {
        request_id: true,
        user_id: true,
        company: true,
        position: true,
        skill: true,
        description: true,
        proof_url: true,
        status: true,
        admin_message: true,
        created_at: true,
        reviewed_at: true,
        // requester basic info for avatar/name
        users: {
          select: {
            user_id: true,
            first_name: true,
            last_name: true,
            username: true,
            email: true,
            avatar: true,
          },
        },
      },
    });

    res.json(rows);
  })
);





app.patch("/api/admin/expert-requests/:id/decision",
  auth, adminOnly,
  asyncRoute(async (req, res) => {
    const request_id = Number(req.params.id);
    const { decision, message = "", price_model: bodyModel, price_amount: bodyAmount } = req.body; // optional pricing
    if (!["approved", "rejected"].includes(decision)) {
      return res.status(400).json({ error: "decision must be approved or rejected" });
    }

    // Load request + user (avatar for UI). Only select fields that exist in your schema.
    const er = await prisma.expert_requests.findUnique({
      where: { request_id },
      select: {
        request_id: true,
        user_id: true,
        status: true,
        company: true,
        position: true,
        skill: true,
        description: true,
        proof_url: true,
        users: { select: { user_id: true, first_name: true, last_name: true, username: true, avatar: true } },
      },
    });

    if (!er) return res.status(404).json({ error: "Request not found" });
    if (er.status !== "pending") return res.status(400).json({ error: "Request is not pending" });

    if (decision === "approved") {
      // Pricing comes from admin's body; fallback to safe defaults
      const priceModel = (bodyModel === "monthly" || bodyModel === "per_question") ? bodyModel : "per_chat";
      const amountNum = Number(bodyAmount);
      const priceAmount = Number.isFinite(amountNum) && amountNum > 0 ? amountNum : 5;

      // Prepare upsert payload
      const createData = {
        expert_id: er.user_id,
        price_model: priceModel,
        price_amount: priceAmount,
        currency: "USD",
        is_verified: true,
        overall_rating: 0,
      };
      const updateData = {
        price_model: priceModel,
        price_amount: priceAmount,
        currency: "USD",
        is_verified: true,
        updated_at: new Date(),
      };

      // copy extended fields into expert_profiles only if those columns exist
      const hasField = (model, field) =>
        !!(prisma[model]?.fields?.find?.((f) => f.name === field));

      if (hasField("expert_profiles", "company"))        { createData.company = er.company || null;        updateData.company = er.company || null; }
      if (hasField("expert_profiles", "position"))       { createData.position = er.position || null;       updateData.position = er.position || null; }
      if (hasField("expert_profiles", "primary_skill"))  { createData.primary_skill = er.skill || null;     updateData.primary_skill = er.skill || null; }
      if (hasField("expert_profiles", "description"))    { createData.description = er.description || null; updateData.description = er.description || null; }
      if (hasField("expert_profiles", "proof_urls") && er.proof_url) {
        // your table stores a single string; normalize into a JSON array if possible
        try { createData.proof_urls = JSON.parse(er.proof_url); updateData.proof_urls = JSON.parse(er.proof_url); } catch {}
      }

      await prisma.expert_profiles.upsert({
        where: { expert_id: er.user_id },
        update: updateData,
        create: createData,
      });

      await prisma.expert_requests.update({
        where: { request_id },
        data: { status: "approved", reviewed_at: new Date(), admin_message: message || null },
      });

      await prisma.notifications.create({
        data: { user_id: er.user_id, title: "Expert request approved", body: message || "Congrats! Your expert profile is live." },
      });

      return res.json({ ok: true });
    }

    // rejected
    await prisma.expert_requests.update({
      where: { request_id },
      data: { status: "rejected", reviewed_at: new Date(), admin_message: message || null },
    });
    await prisma.notifications.create({
      data: { user_id: er.user_id, title: "Expert request rejected", body: message || "Your request was rejected." },
    });
    res.json({ ok: true });
  })
);




/* ----------------------------------
   Profile Change Requests (user + admin)
---------------------------------- */
const ALLOWED_PROFILE_FIELDS = new Set(["first_name", "last_name", "username", "profession", "bio"]);

// create request (payload column)
app.post("/api/profile-requests", auth, async (req, res) => {
  try {
    const user_id = req.user.user_id;

    const existing = await prisma.profile_change_requests.findFirst({
      where: { user_id, status: "pending" },
      select: { req_id: true }
    });
    if (existing) return res.status(409).json({ error: "You already have a pending request." });

    const clean = {};
    for (const key of Object.keys(req.body || {})) {
      if (ALLOWED_PROFILE_FIELDS.has(key)) {
        const val = String(req.body[key] ?? "").trim();
        if (val) clean[key] = val;
      }
    }
    if (!Object.keys(clean).length) return res.status(400).json({ error: "Provide at least one field to change." });

    const created = await prisma.profile_change_requests.create({
      data: { user_id, payload: JSON.stringify(clean), status: "pending" }
    });

    await notify({ user_id, title: "Profile change submitted", body: "Your request is pending admin review." });
    res.json(created);
  } catch (e) {
    console.error("POST /api/profile-requests", e);
    res.status(500).json({ error: "Failed to submit profile change request" });
  }
});

// list (admin)
app.get("/api/admin/profile-requests", auth, adminOnly, asyncRoute(async (_req, res) => {
  const items = await prisma.profile_change_requests.findMany({ orderBy: { created_at: "desc" }, include: { users: true } });
  res.json(items);
}));

// PATCH /api/admin/profile-requests/:id/decision
app.patch("/api/admin/profile-requests/:id/decision", auth, adminOnly, asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const { decision, message = "" } = req.body; // "approved" | "rejected"

  if (!["approved", "rejected"].includes(decision)) {
    return res.status(400).json({ error: "decision must be approved or rejected" });
  }

  // NOTE: profile-requests uses `req_id` (not request_id)
  const pr = await prisma.profile_change_requests.findUnique({ where: { req_id: id } });
  if (!pr) return res.status(404).json({ error: "Request not found" });
  if (pr.status !== "pending") return res.status(400).json({ error: "Request is not pending" });

  if (decision === "approved") {
    // ----- apply basic user field changes (from `payload`) -----
    const payload = pr.payload ? JSON.parse(pr.payload) : {}; // { first_name?, last_name?, username?, profession?, bio?, avatar?, cover_photo? ... }

    const userUpdates = {
      first_name: payload.first_name ?? undefined,
      last_name: payload.last_name ?? undefined,
      username: payload.username ?? undefined,
      profession: payload.profession ?? undefined,
      bio: payload.bio ?? undefined,
      avatar: payload.avatar ?? undefined,
      cover_photo: payload.cover_photo ?? undefined
    };
    const cleanUserUpdates = Object.fromEntries(
      Object.entries(userUpdates).filter(([, v]) => v !== undefined)
    );

    if (Object.keys(cleanUserUpdates).length) {
      await prisma.users.update({
        where: { user_id: pr.user_id },
        data: cleanUserUpdates
      });
    }

    // ----- apply expert edits if present (from `expert_changes`) -----
    const expertChanges = pr.expert_changes ? JSON.parse(pr.expert_changes) : null;
    if (expertChanges) {
      const {
        company = null,
        position = null,
        primary_skill = null,
        description = null,
        proof_urls = null,      // expect array, we store as JSON column
        price_model = null,     // 'monthly' | 'per_chat' | 'per_question'
        price_amount = null
      } = expertChanges;

      const epData = {};
      if (company !== null)        epData.company = company;
      if (position !== null)       epData.position = position;
      if (primary_skill !== null)  epData.primary_skill = primary_skill;
      if (description !== null)    epData.description = description;
      if (Array.isArray(proof_urls)) epData.proof_urls = proof_urls;
      if (price_model)             epData.price_model = price_model;
      if (price_amount != null)    epData.price_amount = Number(price_amount);

      if (Object.keys(epData).length) {
        await prisma.expert_profiles.upsert({
          where: { expert_id: pr.user_id },
          update: epData,
          create: { expert_id: pr.user_id, currency: "USD", is_verified: 1, ...epData }
        });
      }
    }
  }

  // mark request decided (NO reviewer_id)
  const updated = await prisma.profile_change_requests.update({
    where: { req_id: id },
    data: {
      status: decision,
      reviewed_at: new Date(),
      admin_message: message
    }
  });

  // notify requester
  await prisma.notifications.create({
    data: {
      user_id: pr.user_id,
      title: `Profile change ${decision}`,
      body: message || "",
      is_read: false
    }
  });

  res.json({ ok: true, updated });
}));

/* ----------------------------------
   Admin: summary, users, deleted, tx, stats
---------------------------------- */
app.get("/api/admin/summary", auth, adminOnly, asyncRoute(async (_req, res) => {
  const [
    totalUsers, expertMentors, profileReqs, expertReqs, deletedUsers, blockedUsers, txCount
  ] = await Promise.all([
    prisma.users.count(),
    prisma.expert_profiles.count(),
    prisma.profile_change_requests.count({ where: { status: "pending" } }),
    prisma.expert_requests.count({ where: { status: "pending" } }),
    prisma.users.count({ where: { status: "deleted" } }),
    prisma.users.count({ where: { status: "blocked" } }),
    prisma.payments.count()
  ]);
  res.json({ totalUsers, expertMentors, profileReqs, expertReqs, deletedUsers, blockedUsers, txCount });
}));

app.get("/api/admin/users", auth, adminOnly, asyncRoute(async (req, res) => {
  const {
    q = "", role = "", status = "", expert = "",
    sort = "name_asc", page = "1", limit = "20"
  } = req.query;

  const expertFlag = String(expert).toLowerCase();
  let expertRelationFilter;
  if (expertFlag === "yes") expertRelationFilter = { isNot: null };
  if (expertFlag === "no")  expertRelationFilter = { is: null };

  const where = {
    ...(status ? { status } : {}),
    ...(role ? { role } : {}),
    ...(q ? { OR: [
      { first_name: { contains: q } },
      { last_name: { contains: q } },
      { username: { contains: q } },
      { profession: { contains: q } }
    ] } : {}),
    ...(expertRelationFilter ? { expert_profiles: expertRelationFilter } : {})
  };

  const orderBy =
    sort === "price_desc" ? [{ expert_profiles: { price_amount: "desc" } }] :
    sort === "price_asc"  ? [{ expert_profiles: { price_amount: "asc" } }]  :
    sort === "name_desc"  ? [{ first_name: "desc" }] :
                            [{ first_name: "asc" }];

  const pageNum = Math.max(1, Number(page) || 1);
  const take = Math.min(50, Math.max(1, Number(limit) || 20));
  const skip = (pageNum - 1) * take;

  const [total, items] = await Promise.all([
    prisma.users.count({ where }),
    prisma.users.findMany({ where, include: { expert_profiles: true }, orderBy, skip, take })
  ]);
  res.json({ page: pageNum, limit: take, total, items });
}));

app.patch("/api/admin/users/:id/block", auth, adminOnly, asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const { block = true, reason = "" } = req.body;
  const u = await prisma.users.update({ where: { user_id: id }, data: { status: block ? "blocked" : "active" } });
  await notify({ user_id: id, title: block ? "Account blocked" : "Account unblocked", body: reason || "" });
  res.json(u);
}));

app.delete("/api/admin/users/:id", auth, adminOnly, asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const u = await prisma.users.update({ where: { user_id: id }, data: { status: "deleted" } });
  res.json(u);
}));

app.patch("/api/admin/users/:id/restore", auth, adminOnly, asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const restored = await prisma.users.update({ where: { user_id: id }, data: { status: "active" } });
  await notify({ user_id: id, title: "Account restored", body: "Your account has been restored by admin." });
  res.json(restored);
}));

app.delete("/api/admin/users/:id/purge", auth, adminOnly, asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  await prisma.messages.deleteMany({ where: { sender_id: id } });
  await prisma.subscriptions.deleteMany({ where: { OR: [{ seeker_id: id }, { expert_id: id }] } });
  await prisma.expert_profiles.deleteMany({ where: { expert_id: id } });
  await prisma.posts.deleteMany({ where: { expert_id: id } });
  await prisma.ratings.deleteMany({ where: { OR: [{ seeker_id: id }, { expert_id: id }] } });
  await prisma.notifications.deleteMany({ where: { user_id: id } });
  await prisma.users.delete({ where: { user_id: id } });
  res.json({ ok: true });
}));

app.get("/api/admin/deleted-users", auth, adminOnly, asyncRoute(async (_req, res) => {
  const items = await prisma.users.findMany({ where: { status: "deleted" }, orderBy: { user_id: "desc" } });
  res.json(items);
}));





app.get(
  "/api/admin/transactions",
  auth,
  adminOnly,
  asyncRoute(async (req, res) => {
    const page  = Math.max(1, Number(req.query.page || 1));
    const limit = Math.min(100, Math.max(1, Number(req.query.limit || 25)));
    const skip  = (page - 1) * limit;

    const kind   = (req.query.kind   || "").trim();   // 'credit' | 'debit' | ''
    const method = (req.query.method || "").trim();   // 'bkash' | 'dev' | '' etc
    const q      = (req.query.q      || "").trim();   // search by name/username/email

    // Build filters
    const where = {
      ...(kind   ? { kind } : {}),
      ...(method ? { method } : {}),
      ...(q
        ? {
            OR: [
              { users: { username:   { contains: q } } },
              { users: { first_name: { contains: q } } },
              { users: { last_name:  { contains: q } } },
              { users: { email:      { contains: q } } },
            ],
          }
        : {}),
    };

    const total = await prisma.wallet_transactions.count({ where });

    const rows = await prisma.wallet_transactions.findMany({
      where,
      orderBy: { tx_id: "desc" },
      skip,
      take: limit,
      include: {
        users: {
          select: {
            user_id: true,
            username: true,
            first_name: true,
            last_name: true,
            avatar: true,
            email: true,
          },
        },
      },
    });

    const items = rows.map((r) => ({
      tx_id: Number(r.tx_id),
      user_id: r.user_id,
      amount: Number(r.amount),
      kind: r.kind,             // 'credit' | 'debit'
      method: r.method,         // 'bkash' | 'dev' | ...
      reference: r.reference,   // optional string/NULL
      gateway_ref: r.gateway_ref ?? null, // if you keep it
      note: r.note ?? "",
      created_at: r.created_at,
      user: r.users,
    }));

    res.json({ page, limit, total, items });
  })
);



app.get("/api/admin/statistics", auth, adminOnly, asyncRoute(async (req, res) => {
  const { range = "30d" } = req.query;
  const now = new Date();
  const map = { today: 1, "7d": 7, "30d": 30, "90d": 90, "365d": 365 };
  const since = range === "all" ? null : new Date(now.getTime() - (map[range] || 30) * 86400000);
  const whereDate = since ? { gte: since } : undefined;
  const [newUsers, subs, paymentsCount] = await Promise.all([
    prisma.users.count({ where: { created_at: whereDate } }),
    prisma.subscriptions.count({ where: { start_at: whereDate } }),
    prisma.payments.count({ where: { created_at: whereDate } })
  ]);
  res.json({ range, newUsers, subs, paymentsCount });
}));

/* ----------------------------------
   Notifications (user)
---------------------------------- */
app.get("/api/notifications", auth, asyncRoute(async (req, res) => {
  const items = await prisma.notifications.findMany({
    where: { user_id: req.user.user_id },
    orderBy: { created_at: "desc" },
    select: { notification_id: true, title: true, body: true, is_read: true, created_at: true }
  });
  res.json(items.map(n => ({ ...n, message: n.body })));
}));
app.patch("/api/notifications/:id/read", auth, asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const n = await prisma.notifications.update({ where: { notification_id: id }, data: { is_read: true } });
  res.json(n);
}));
app.patch("/api/notifications/read-all", auth, asyncRoute(async (req, res) => {
  const result = await prisma.notifications.updateMany({ where: { user_id: req.user.user_id, is_read: false }, data: { is_read: true } });
  res.json({ ok: true, updated: result.count });
}));



/* =========================
   WALLET
   ========================= */

// Get balance
app.get("/api/wallet/balance", auth, asyncRoute(async (req, res) => {
  const me = await prisma.users.findUnique({
    where: { user_id: req.user.user_id },
    select: { wallet: true }
  });
  res.json({ balance: Number(me?.wallet || 0) });
}));

// My transactions (latest first)
app.get("/api/wallet/transactions", auth, asyncRoute(async (req, res) => {
  const items = await prisma.wallet_transactions.findMany({
    where: { user_id: req.user.user_id },
    orderBy: { tx_id: "desc" },
    take: 200,
    select: {
      tx_id: true, amount: true, kind: true, method: true,
      reference: true, note: true, gateway_ref: true, created_at: true
    }
  });
  // normalize amounts
  res.json({ items: items.map(i => ({ ...i, amount: Number(i.amount) })) });
}));


// Start a top-up via bKash (create pending ledger row, get redirect URL)
app.post("/api/wallet/topup/init", auth, asyncRoute(async (req, res) => {
  const { amount } = req.body;
  const amt = Number(amount);
  if (!Number.isFinite(amt) || amt <= 0) return res.status(400).json({ error: "Invalid amount" });

  // Create a pending row (credit) - NOTE: no “status” column in your schema
  const txRow = await prisma.wallet_transactions.create({
    data: {
      user_id: req.user.user_id,
      amount: new Prisma.Decimal(amt),
      kind: "credit",
      method: "bkash",
      gateway_ref: null,
      note: "init",
    },
    select: { tx_id: true },
  });

  const data = await bkashCreate(amt);
  if (!data?.bkashURL || !data?.paymentID) {
    return res.status(500).json({ error: "bKash create failed" });
  }

  await prisma.wallet_transactions.update({
    where: { tx_id: txRow.tx_id },
    data: { gateway_ref: data.paymentID, note: "created" },
  });

  res.json({ url: data.bkashURL });
}));

// bKash callback (server-to-server) → credit wallet once
app.get("/api/wallet/bkash/callback", asyncRoute(async (req, res) => {
  try {
    if (req.query.status !== "success") return res.redirect(bkashCfg.frontFail);

    const { paymentID } = req.query;
    if (!paymentID) return res.redirect(bkashCfg.frontFail);

    const exec = await bkashExecute(paymentID);
    if (exec?.statusCode !== "0000") {
      // mark the row note as failed (no status column in your schema)
      await prisma.wallet_transactions.updateMany({
        where: { gateway_ref: paymentID },
        data: { note: "execute failed" },
      });
      return res.redirect(bkashCfg.frontFail);
    }

    // Find the tx row
    const tx = await prisma.wallet_transactions.findFirst({
      where: { gateway_ref: paymentID },
      select: { tx_id: true, user_id: true, amount: true, note: true },
    });
    if (!tx) return res.redirect(bkashCfg.frontFail);

    // Idempotent credit: only once; we use a note marker “credited”
    if (tx.note !== "credited") {
      await prisma.$transaction([
        prisma.users.update({
          where: { user_id: tx.user_id },
          data: { wallet: { increment: tx.amount } },
        }),
        prisma.wallet_transactions.update({
          where: { tx_id: tx.tx_id },
          data: { note: "credited" },
        }),
      ]);
    }

    return res.redirect(bkashCfg.frontOk);
  } catch (e) {
    console.error("bkash callback error", e);
    return res.redirect(bkashCfg.frontFail);
  }
}));

// dev-only: POST /api/dev/wallet/complete
// body: { tx_id }
app.post("/api/dev/wallet/complete", auth, asyncRoute(async (req, res) => {
  if (process.env.NODE_ENV !== "development") {
    return res.status(403).json({ error: "dev only" });
  }

  const tx_id = Number(req.body.tx_id);
  if (!tx_id) return res.status(400).json({ error: "tx_id required" });

  const txRow = await prisma.wallet_transactions.findUnique({
    where: { tx_id },
    select: { tx_id: true, user_id: true, amount: true, kind: true, note: true },
  });
  if (!txRow) return res.status(404).json({ error: "tx not found" });

  // idempotency: if we've stamped it already, don't double-apply
  if ((txRow.note || "").includes("[dev-complete]")) {
    return res.json({ ok: true, note: "already applied" });
  }

  // Only credit if it is a credit tx
  if (txRow.kind !== "credit") {
    return res.status(400).json({ error: "tx is not a credit" });
  }

  await prisma.$transaction(async (t) => {
    await t.users.update({
      where: { user_id: txRow.user_id },
      data: { wallet: { increment: txRow.amount } },
    });
    await t.wallet_transactions.update({
      where: { tx_id: txRow.tx_id },
      data: { note: `${txRow.note || ""} [dev-complete]` },
    });
  });

  const me = await prisma.users.findUnique({
    where: { user_id: txRow.user_id },
    select: { wallet: true },
  });

  res.json({ ok: true, balance: Number(me?.wallet || 0) });
}));

app.post("/api/wallet/topup/dev", auth, asyncRoute(async (req, res) => {
  if (process.env.NODE_ENV !== "development") {
    return res.status(403).json({ error: "dev only" });
  }

  const user_id = req.user.user_id;
  const amount = Number(req.body.amount || 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    return res.status(400).json({ error: "amount must be > 0" });
  }

  const result = await prisma.$transaction(async (tx) => {
    // 1) credit wallet
    const { wallet } = await tx.users.update({
      where: { user_id },
      data: { wallet: { increment: new Prisma.Decimal(amount) } },
      select: { wallet: true },
    });

    // 2) ledger row (no "status" field in schema)
    const txRow = await tx.wallet_transactions.create({
      data: {
        user_id,
        amount: new Prisma.Decimal(amount),
        kind: "credit",
        method: "dev",
        reference: null,
        note: "Dev topup",
      },
      select: { tx_id: true, created_at: true },
    });

    return { balance: wallet, tx: txRow };
  });

  res.json({ ok: true, ...result });
}));






/* ----------------------------------
   Errors & start
---------------------------------- */
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: err.message || "Server error" });
});
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`));
