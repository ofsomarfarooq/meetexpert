// src/bkash/sdk.js
import { bkashCfg } from "./config.js";
import { getAuthHeaders } from "./token.js";

// Create a payment session; returns { bkashURL, paymentID, ... }
export async function bkashCreate(amountBDT) {
  const headers = await getAuthHeaders();
  const body = {
    mode: "0011",
    payerReference: " ",
    callbackURL: bkashCfg.backendCallback,
    amount: String(amountBDT),
    currency: "BDT",
    intent: "sale",
    merchantInvoiceNumber: "INV" + Math.floor(Math.random() * 1e9),
  };
  const r = await fetch(bkashCfg.createUrl, { method: "POST", headers, body: JSON.stringify(body) });
  const data = await r.json();
  return data;
}

// Execute (server-to-server) by paymentID; returns bKash result
export async function bkashExecute(paymentID) {
  const headers = await getAuthHeaders();
  const r = await fetch(bkashCfg.executeUrl, {
    method: "POST",
    headers,
    body: JSON.stringify({ paymentID }),
  });
  const data = await r.json();
  return data;
}
