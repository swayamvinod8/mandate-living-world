import type { PublicKey } from "@solana/web3.js";

export function shortKey(key: PublicKey | string): string {
  const s = key.toString();
  return `${s.slice(0, 4)}…${s.slice(-4)}`;
}

export function gold(n: number): string {
  return n.toLocaleString("en-US");
}

// 42 min, 3 h 5 min
export function duration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h === 0) return m <= 1 ? "a minute" : `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

export function ago(unixSeconds: number, nowSec = Date.now() / 1000): string {
  const diff = nowSec - unixSeconds;
  if (diff < 60) return "just now";
  return `${duration(diff)} ago`;
}

export function clockTime(ms: number): string {
  return new Date(ms).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}
