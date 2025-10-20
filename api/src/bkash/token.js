// src/bkash/token.js
import { bkashCfg } from "./config.js";

// in-memory token (simple)
let idToken = null;
let tokenExpireAt = 0; // epoch ms

const tokenHeaders = () => ({
  "Content-Type": "application/json",
  Accept: "application/json",
  username: bkashCfg.username,
  password: bkashCfg.password,
});

export async function getAuthHeaders() {
  const now = Date.now();
  if (!idToken || now >= tokenExpireAt) {
    const resp = await fetch(bkashCfg.grantTokenUrl, {
      method: "POST",
      headers: tokenHeaders(),
      body: JSON.stringify({ app_key: bkashCfg.appKey, app_secret: bkashCfg.appSecret }),
    });
    const data = await resp.json();
    if (!data?.id_token) throw new Error("bKash grant token failed");
    idToken = data.id_token;
    // bKash returns expires_in (seconds) usually; fallback 50 minutes
    const ttlMs = (Number(data.expires_in || 3000) - 60) * 1000;
    tokenExpireAt = now + ttlMs;
  }

  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    authorization: idToken,
    "x-app-key": bkashCfg.appKey,
  };
}
