const express = require('express');
const path = require('path');
const mysql = require('mysql');
const dotenv = require('dotenv');
const cookieParser = require('cookie-parser');
const session = require('express-session');

dotenv.config({ path: './.env' });

const app = express();

const db = mysql.createConnection({
  host: process.env.DATABASE_HOST,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD || "",
  database: process.env.DATABASE
});

// Make db accessible in req (optional helper)
app.use((req, res, next) => {
  req.db = db;
  next();
});

const publicDirectory = path.join(__dirname,'./public');
app.use(express.static(publicDirectory));
// Serve uploaded avatars
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use(express.urlencoded({ extended: false }));
app.use(express.json());
app.use(cookieParser());

app.use(session({
  secret: process.env.SESSION_SECRET || 'devsessionsecret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000
  }
}));

app.set('view engine', 'hbs');

// Middleware to expose session user to views
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});

db.connect((error)=>{
  if(error){
    console.log("Database connection failed: ", error);
  } else {
    console.log("Database connected successfully.");
  }
});

app.use('/', require('./routes/pages'));
app.use('/auth', require('./routes/auth'));

app.listen(5000, () => {
  console.log("Server is running on Port 5000");
});