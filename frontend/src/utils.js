import { formatUnits } from "ethers";
import { USDC_DECIMALS, PRICE_DECIMALS } from "./config";

const nf = (min, max) =>
  new Intl.NumberFormat("en-US", { minimumFractionDigits: min, maximumFractionDigits: max });

export const fmtUsd = (v) => `$${nf(2, 2).format(Number(formatUnits(v, USDC_DECIMALS)))}`;
export const fmtPrice = (v) => `$${nf(2, 2).format(Number(formatUnits(v, PRICE_DECIMALS)))}`;
export const fmtSigned = (v) => {
  const n = Number(formatUnits(v, USDC_DECIMALS));
  return `${n > 0 ? "+" : n < 0 ? "-" : ""}$${nf(2, 2).format(Math.abs(n))}`;
};
export const short = (a) => (a ? `${a.slice(0, 6)}…${a.slice(-4)}` : "");

export function parseError(e) {
  if (e?.code === "ACTION_REJECTED" || e?.code === 4001) return "Transaction rejected in MetaMask.";
  const msg = e?.reason || e?.shortMessage || e?.info?.error?.message || e?.message || "Unknown error";
  return msg.length > 160 ? msg.slice(0, 160) + "…" : msg;
}
