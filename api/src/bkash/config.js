// src/bkash/config.js
export const bkashCfg = {
  grantTokenUrl: "https://tokenized.sandbox.bka.sh/v1.2.0-beta/tokenized/checkout/token/grant",
  createUrl:     "https://tokenized.sandbox.bka.sh/v1.2.0-beta/tokenized/checkout/create",
  executeUrl:    "https://tokenized.sandbox.bka.sh/v1.2.0-beta/tokenized/checkout/execute",

  // where your server will redirect users after callback
  frontOk:   process.env.FRONT_OK_URL   || "http://localhost:5173/wallet/status?ok=1",
  frontFail: process.env.FRONT_FAIL_URL || "http://localhost:5173/wallet/status?ok=0",

  // bKash app credentials (use env in real life)
  username:  process.env.BKASH_USERNAME || "sandboxTokenizedUser02",
  password:  process.env.BKASH_PASSWORD || "sandboxTokenizedUser02@12345",
  appKey:    process.env.BKASH_APP_KEY  || "4f6o0cjiki2rfm34kfdadl1eqq",
  appSecret: process.env.BKASH_APP_SECRET || "2is7hdktrekvrbljjh44ll3d9l1dtjo4pasmjvs5vl5qr3fug4b",

  // This server’s callback endpoint (must be publicly reachable)
  backendCallback: process.env.BKASH_CALLBACK || "http://localhost:5000/api/wallet/bkash/callback",
};

// optional default export so BOTH `import { bkashCfg }` and `import cfg` work
export default bkashCfg;
