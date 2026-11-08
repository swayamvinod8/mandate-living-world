"use client";

import { useCallback, useEffect, useState } from "react";
import type { PublicKey } from "@solana/web3.js";
import { ago, gold } from "@/lib/format";
import { explorerTxUrl } from "@/lib/pdas";
import { readWorld } from "@/lib/recap/chain";
import { fallbackRecap } from "@/lib/recap/fallback";
import type { RecapResponse, TimedEvent } from "@/lib/recap/types";

// "local" skips the narrator API (the static GitHub Pages build has no server)
const LOCAL_ONLY = process.env.NEXT_PUBLIC_RECAP_MODE === "local";

async function fetchNarrated(owner: string): Promise<RecapResponse> {
  const res = await fetch("/api/recap", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ owner }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json?.error ?? `Recap failed (${res.status})`);
  return json as RecapResponse;
}

// Reads the same events in the browser and writes the plain recap
async function buildLocal(owner: PublicKey): Promise<RecapResponse> {
  const world = await readWorld(owner);
  if (!world) throw new Error("No character for this wallet yet.");
  return { recap: fallbackRecap(world), facts: world, source: "chain", narrated: false };
}

type Props = {
  owner: PublicKey | null;
  storyKey: string;
};

function eventLine(e: TimedEvent): string {
  switch (e.kind) {
    case "hired":
      return `Hired ${e.npcName}`;
    case "betrayed":
      return `${e.npcName} took a ${gold(Number(e.offer))} gold bribe; ${gold(Number(e.bondPaid))} gold bond paid to you`;
    case "settled":
      return `Settled ${e.hours} ${e.hours === "1" ? "hour" : "hours"}: ${gold(Number(e.goldBefore))} to ${gold(Number(e.goldAfter))} gold`;
    case "eventUnlocked":
      return "The Thieves' Guild offered to hunt Kael";
  }
}

export default function Chronicle({ owner, storyKey }: Props) {
  const [data, setData] = useState<RecapResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ownerKey = owner?.toBase58() ?? null;

  const load = useCallback(async () => {
    if (!owner) return;
    setLoading(true);
    setError(null);
    try {
      if (LOCAL_ONLY) {
        setData(await buildLocal(owner));
      } else {
        try {
          setData(await fetchNarrated(owner.toBase58()));
        } catch {
          // Narrator unavailable: fall back to the plain ledger version
          setData(await buildLocal(owner));
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't write the chronicle.");
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerKey]);

  // Write on load, and again when something big changes on-chain
  useEffect(() => {
    load();
  }, [load, storyKey]);

  const events = data?.facts.events ?? [];
  const paragraphs = (data?.recap ?? "").split(/\n{2,}/).filter(Boolean);

  return (
    <section className="chronicle" aria-labelledby="chronicle-title" aria-busy={loading}>
      <div className="chronicle__head">
        <h2 id="chronicle-title" className="chronicle__title">
          While you were away
        </h2>
        <button className="btn btn--quiet btn--on-table" onClick={load} disabled={loading || !ownerKey}>
          {loading ? <span className="spinner" aria-hidden="true" /> : null}
          {loading ? "Reading the ledger…" : "Rewrite the chronicle"}
        </button>
      </div>

      <div className="readaloud">
        {error ? (
          <p className="inline-error" role="alert">
            {error}
          </p>
        ) : paragraphs.length > 0 ? (
          paragraphs.map((p, i) => <p key={i}>{p}</p>)
        ) : (
          <p className="readaloud__empty">
            {loading
              ? "The scribe is reading the ledger…"
              : "Nothing has happened yet. Take a guild job or hire Kael, then come back."}
          </p>
        )}
      </div>

      {events.length > 0 ? (
        <div className="sources">
          <h3 className="sources__title">Every line above comes from these transactions</h3>
          <ul>
            {events.map((e) => (
              <li key={`${e.signature}-${e.kind}`}>
                <span>{eventLine(e)}</span>
                <span className="sources__meta">
                  {e.blockTime ? ago(e.blockTime) : ""}
                  {e.signature.startsWith("mock") ? (
                    " sample"
                  ) : (
                    <>
                      {" "}
                      <a href={explorerTxUrl(e.signature)} target="_blank" rel="noreferrer">
                        Explorer
                      </a>
                    </>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {data?.source === "mock" ? (
        <p className="fine fine--table">
          This is the sample chronicle. Set RECAP_USE_MOCK=false in web/.env.local to read devnet.
        </p>
      ) : null}
    </section>
  );
}
