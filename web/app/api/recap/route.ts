// POST /api/recap
// Body: { owner: string, since?: number }
//   owner - the player's wallet address
//   since - optional unix seconds; only events after this are narrated
//           (frontend can pass the time the player last viewed a recap)
// Returns RecapResponse from lib/recap/types.ts

import { NextResponse } from "next/server";
import { PublicKey } from "@solana/web3.js";
import { readWorld } from "@/lib/recap/chain";
import { mockSnapshot } from "@/lib/recap/mock";
import { narrate } from "@/lib/recap/narrate";
import type { RecapResponse, WorldSnapshot } from "@/lib/recap/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const USE_MOCK = process.env.RECAP_USE_MOCK === "true";

// Same world state -> same recap, so we don't pay for repeat calls on refresh
const cache = new Map<string, RecapResponse>();
const CACHE_LIMIT = 100;

function cacheKey(world: WorldSnapshot, since: number | null): string {
  const lastSig = world.events.at(-1)?.signature ?? "none";
  return `${world.character.owner}:${lastSig}:${world.character.gold}:${since ?? 0}`;
}

export async function POST(req: Request) {
  let body: { owner?: unknown; since?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body must be JSON" }, { status: 400 });
  }

  if (typeof body.owner !== "string") {
    return NextResponse.json({ error: "owner is required" }, { status: 400 });
  }

  let owner: PublicKey;
  try {
    owner = new PublicKey(body.owner);
  } catch {
    return NextResponse.json({ error: "owner is not a valid address" }, { status: 400 });
  }

  const since = typeof body.since === "number" ? body.since : null;

  let world: WorldSnapshot | null;
  try {
    world = USE_MOCK ? mockSnapshot(owner.toBase58()) : await readWorld(owner);
  } catch (err) {
    console.error("recap: failed to read chain", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to read chain" },
      { status: 502 }
    );
  }

  if (!world) {
    return NextResponse.json({ error: "No character for this wallet yet" }, { status: 404 });
  }

  if (since !== null) {
    world = {
      ...world,
      events: world.events.filter((e) => e.blockTime === null || e.blockTime > since),
    };
  }

  const key = cacheKey(world, since);
  const cached = cache.get(key);
  if (cached) return NextResponse.json(cached);

  const { text, narrated } = await narrate(world);
  const response: RecapResponse = {
    recap: text,
    facts: world,
    source: USE_MOCK ? "mock" : "chain",
    narrated,
  };

  if (cache.size >= CACHE_LIMIT) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(key, response);

  return NextResponse.json(response);
}
