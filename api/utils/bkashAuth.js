const fetch = require("node-fetch");
const bkash = require("../config/bkashConfig.json");

let cachedToken = null;
let tokenExpiresAt = 0;

async function getAccessToken() {
  const now = Date.now();
  if (cachedToken && now < tokenExpiresAt - 10_000) return cachedToken;

  const res = await fetch(bkash.grant_token_url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      username: bkash.username,
      password: bkash.password
    },
    body: JSON.stringify({ app_key: bkash.app_key, app_secret: bkash.app_secret })
  });
  const data = await res.json();
  if (!data?.id_token) throw new Error("bKash auth failed");

  cachedToken = data.id_token;
  tokenExpiresAt = now + (data.expires_in ? Number(data.expires_in) * 1000 : 50 * 60 * 1000);
  return cachedToken;
}

async function authHeaders() {
  const token = await getAccessToken();
  return {
    "Content-Type": "application/json",
    accept: "application/json",
    authorization: token,
    "x-app-key": bkash.app_key
  };
}

module.exports = { authHeaders, bkash };
