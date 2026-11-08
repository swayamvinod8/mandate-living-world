// Reads the player's world straight from devnet for the recap.
// Server-side only. Uses a read-only provider, so no wallet or key is needed.

import { promises as fs } from "fs";
import path from "path";
import { AnchorProvider, BorshCoder, EventParser, Program, type Idl } from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { CLASS_NAMES, FLAGS, getCharacterPda, hasFlag } from "../pdas";
import type { GameEvent, RelationshipState, TimedEvent, WorldSnapshot } from "./types";

const RPC_URL = process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";

// Character, Relationship and Npc accounts all start with an 8-byte discriminator.
// Relationship layout: discriminator (8) | npc (32) | character (32) ...
const REL_CHARACTER_OFFSET = 8 + 32;

// How many recent transactions to scan for events
const SIGNATURE_LIMIT = 25;

let cachedIdl: Idl | null = null;

// The IDL is copied in from target/idl/mandate.json after each anchor build.
// Loaded at runtime so the web app still builds before the program exists.
async function loadIdl(): Promise<Idl> {
  if (cachedIdl) return cachedIdl;
  const idlPath = path.join(process.cwd(), "lib", "idl", "mandate.json");
  try {
    const raw = await fs.readFile(idlPath, "utf8");
    cachedIdl = JSON.parse(raw) as Idl;
    return cachedIdl;
  } catch {
    throw new Error(
      "Missing web/lib/idl/mandate.json. Copy it from target/idl/ or set RECAP_USE_MOCK=true."
    );
  }
}

async function getProgram() {
  const idl = await loadIdl();
  const connection = new Connection(RPC_URL, "confirmed");

  // Throwaway wallet - we only read accounts, never sign
  const readOnlyWallet = {
    publicKey: Keypair.generate().publicKey,
    signTransaction: async () => {
      throw new Error("read-only");
    },
    signAllTransactions: async () => {
      throw new Error("read-only");
    },
  };

  const provider = new AnchorProvider(connection, readOnlyWallet as never, {
    commitment: "confirmed",
  });
  return { program: new Program(idl, provider), connection, idl };
}

// BN / number / anything -> string, so JSON never loses precision
function str(value: unknown): string {
  if (value === null || value === undefined) return "0";
  return value.toString();
}

function num(value: unknown): number {
  return Number(str(value));
}

// Anchor versions differ on event name casing (Settled vs settled), so compare loosely
function sameName(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

function decodeName(raw: unknown): string {
  if (typeof raw === "string") return raw;
  return "Unknown";
}

export async function readWorld(owner: PublicKey): Promise<WorldSnapshot | null> {
  const { program, connection, idl } = await getProgram();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const accounts = program.account as any;

  const [characterPda] = getCharacterPda(owner);
  const character = await accounts.character.fetchNullable(characterPda);
  if (!character) return null;

  // All relationships that point at this character
  const relRows = await accounts.relationship.all([
    { memcmp: { offset: REL_CHARACTER_OFFSET, bytes: characterPda.toBase58() } },
  ]);

  // Look up NPC names once
  const npcNames = new Map<string, string>();
  for (const row of relRows) {
    const npcKey = row.account.npc.toBase58();
    if (npcNames.has(npcKey)) continue;
    const npc = await accounts.npc.fetchNullable(row.account.npc);
    npcNames.set(npcKey, npc ? decodeName(npc.name) : "Unknown");
  }

  const relationships: RelationshipState[] = relRows.map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (row: any) => ({
      address: row.publicKey.toBase58(),
      npc: row.account.npc.toBase58(),
      npcName: npcNames.get(row.account.npc.toBase58()) ?? "Unknown",
      trust: num(row.account.trust),
      bondEscrow: str(row.account.bondEscrow),
      betrayed: Boolean(row.account.betrayed),
    })
  );

  // Every instruction touches the character account, so its history is the player's log
  const sigs = await connection.getSignaturesForAddress(characterPda, {
    limit: SIGNATURE_LIMIT,
  });

  const parser = new EventParser(program.programId, new BorshCoder(idl));
  const events: TimedEvent[] = [];

  // Oldest first so the story reads in order
  for (const sig of sigs.reverse()) {
    if (sig.err) continue;
    const tx = await connection.getTransaction(sig.signature, {
      commitment: "confirmed",
      maxSupportedTransactionVersion: 0,
    });
    const logs = tx?.meta?.logMessages;
    if (!logs) continue;

    for (const ev of parser.parseLogs(logs)) {
      const parsed = toGameEvent(ev.name, ev.data, npcNames);
      if (parsed) {
        events.push({ ...parsed, signature: sig.signature, blockTime: sig.blockTime ?? null });
      }
    }
  }

  const flags = num(character.flags);

  return {
    character: {
      address: characterPda.toBase58(),
      owner: owner.toBase58(),
      className: CLASS_NAMES[num(character.class)] ?? "Adventurer",
      gold: str(character.gold),
      incomePerHour: str(character.incomePerHour),
      rentPerHour: str(character.rentPerHour),
      lastUpdate: num(character.lastUpdate),
      thievesRep: num(character.thievesRep),
      betrayedByCompanion: hasFlag(flags, FLAGS.BETRAYED_BY_COMPANION),
      huntKaelUnlocked: hasFlag(flags, FLAGS.EVENT_HUNT_KAEL_UNLOCKED),
    },
    relationships,
    events,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toGameEvent(name: string, data: any, npcNames: Map<string, string>): GameEvent | null {
  if (sameName(name, "Settled")) {
    return {
      kind: "settled",
      goldBefore: str(data.goldBefore),
      goldAfter: str(data.goldAfter),
      hours: str(data.hours),
    };
  }
  if (sameName(name, "Hired")) {
    const npc = data.npc.toBase58();
    return { kind: "hired", npc, npcName: npcNames.get(npc) ?? "your companion" };
  }
  if (sameName(name, "Betrayed")) {
    const npc = data.npc.toBase58();
    return {
      kind: "betrayed",
      npc,
      npcName: npcNames.get(npc) ?? "your companion",
      offer: str(data.offer),
      bondPaid: str(data.bondPaid),
    };
  }
  if (sameName(name, "EventUnlocked")) {
    return { kind: "eventUnlocked", eventId: num(data.eventId) };
  }
  return null;
}
