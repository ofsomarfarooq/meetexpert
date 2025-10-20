import http from "./http";

export const getBalance = () => http.get("/wallet/balance");
export const getMyTx = () => http.get("/wallet/transactions");
export const startTopup = (amount) => http.post("/wallet/topup/init", { amount });
