"use client";

// One hook for everything the page reads from and sends to the program.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { IdlAccounts } from "@coral-xyz/anchor";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import type { Mandate } from "@/lib/idl/mandate";
import { friendlyError } from "./errors";
import { getProgram } from "./program";
import {
  CLASS_NAMES,
  FLAGS,
  NPC_AUTHORITY,
  NPC_IDS,
  getCharacterPda,
  getNpcPda,
  getRelationshipPda,
  hasFlag,
} from "./pdas";

type RawCharacter = IdlAccounts<Mandate>["character"];
type RawNpc = IdlAccounts<Mandate>["npc"];
type RawRelationship = IdlAccounts<Mandate>["relationship"];

export type CharacterView = {
  address: PublicKey;
  classId: number;
  className: string;
  gold: number;
  incomePerHour: number;
  rentPerHour: number;
  lastUpdate: number;
  thievesRep: number;
  betrayed: boolean;
  huntUnlocked: boolean;
};

export type NpcView = {
  address: PublicKey;
  name: string;
  greed: number;
  loyalty: number;
  bond: number;
  hiredBy: PublicKey | null;
};

export type RelationshipView = {
  trust: number;
  bondEscrow: number;
  betrayed: boolean;
};

export type Activity = {
  id: number;
  label: string;
  status: "pending" | "confirmed" | "failed";
  signature?: string;
  message?: string;
  at: number;
};

// Often enough to notice a betrayal that happened while the page was open
const POLL_MS = 12_000;
const MAX_ACTIVITY = 12;

function toCharacter(address: PublicKey, c: RawCharacter): CharacterView {
  return {
    address,
    classId: c.class,
    className: CLASS_NAMES[c.class] ?? "Adventurer",
    gold: c.gold.toNumber(),
    incomePerHour: c.incomePerHour.toNumber(),
    rentPerHour: c.rentPerHour.toNumber(),
    lastUpdate: c.lastUpdate.toNumber(),
    thievesRep: c.thievesRep,
    betrayed: hasFlag(c.flags, FLAGS.BETRAYED_BY_COMPANION),
    huntUnlocked: hasFlag(c.flags, FLAGS.EVENT_HUNT_KAEL_UNLOCKED),
  };
}

function toNpc(address: PublicKey, n: RawNpc): NpcView {
  return {
    address,
    name: n.name,
    greed: n.greed,
    loyalty: n.loyalty,
    bond: n.bond.toNumber(),
    hiredBy: n.hiredBy ?? null,
  };
}

function toRelationship(r: RawRelationship): RelationshipView {
  return { trust: r.trust, bondEscrow: r.bondEscrow.toNumber(), betrayed: r.betrayed };
}

export function useMandate() {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();
  const owner = wallet?.publicKey ?? null;
  const ownerKey = owner?.toBase58() ?? null;

  const program = useMemo(
    () => (wallet ? getProgram(connection, wallet) : null),
    [connection, wallet]
  );

  const addresses = useMemo(() => {
    if (!ownerKey) return null;
    const character = getCharacterPda(new PublicKey(ownerKey))[0];
    const kael = NPC_AUTHORITY ? getNpcPda(NPC_AUTHORITY, NPC_IDS.KAEL)[0] : null;
    const relationship = kael ? getRelationshipPda(kael, character)[0] : null;
    return { character, kael, relationship };
  }, [ownerKey]);

  const [character, setCharacter] = useState<CharacterView | null>(null);
  const [kael, setKael] = useState<NpcView | null>(null);
  const [relationship, setRelationship] = useState<RelationshipView | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [activity, setActivity] = useState<Activity[]>([]);
  const nextId = useRef(1);

  const refresh = useCallback(async () => {
    if (!program || !addresses) return;
    try {
      const [c, k, r] = await Promise.all([
        program.account.character.fetchNullable(addresses.character),
        addresses.kael ? program.account.npc.fetchNullable(addresses.kael) : Promise.resolve(null),
        addresses.relationship
          ? program.account.relationship.fetchNullable(addresses.relationship)
          : Promise.resolve(null),
      ]);
      setCharacter(c ? toCharacter(addresses.character, c) : null);
      setKael(k && addresses.kael ? toNpc(addresses.kael, k) : null);
      setRelationship(r ? toRelationship(r) : null);
      setLoadError(null);
    } catch (err) {
      setLoadError(friendlyError(err));
    } finally {
      setLoaded(true);
    }
  }, [program, addresses]);

  // New wallet: start clean, load, then keep polling while the tab is visible
  useEffect(() => {
    setLoaded(false);
    setCharacter(null);
    setKael(null);
    setRelationship(null);
    setActivity([]);
    if (!program || !addresses) return;

    refresh();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [program, addresses, refresh]);

  // Sends one transaction and records it in the adventure log
  const run = useCallback(
    async (label: string, send: () => Promise<string>): Promise<boolean> => {
      const id = nextId.current++;
      setBusy(label);
      setActivity((list) =>
        [{ id, label, status: "pending" as const, at: Date.now() }, ...list].slice(0, MAX_ACTIVITY)
      );
      try {
        const signature = await send();
        setActivity((list) =>
          list.map((a) => (a.id === id ? { ...a, status: "confirmed", signature } : a))
        );
        await refresh();
        return true;
      } catch (err) {
        setActivity((list) =>
          list.map((a) =>
            a.id === id ? { ...a, status: "failed", message: friendlyError(err) } : a
          )
        );
        return false;
      } finally {
        setBusy(null);
      }
    },
    [refresh]
  );

  const actions = useMemo(() => {
    if (!program || !owner || !addresses) return null;
    const { character: characterPda, kael: kaelPda, relationship: relPda } = addresses;

    return {
      createCharacter: (classId: number) =>
        run(`Create ${CLASS_NAMES[classId]}`, () =>
          program.methods
            .createCharacter(classId)
            .accountsStrict({
              character: characterPda,
              owner,
              systemProgram: SystemProgram.programId,
            })
            .rpc()
        ),

      guildJob: () =>
        run("Take a guild job", () =>
          program.methods.guildJob().accountsStrict({ character: characterPda, owner }).rpc()
        ),

      settle: () =>
        run("Settle accounts", () =>
          program.methods.settle().accountsStrict({ character: characterPda }).rpc()
        ),

      checkEvent: () =>
        run("Seek rumors", () =>
          program.methods.checkEvent().accountsStrict({ character: characterPda, owner }).rpc()
        ),

      hire: () => {
        if (!kaelPda || !relPda) return Promise.resolve(false);
        return run("Hire Kael", () =>
          program.methods
            .hire()
            .accountsStrict({
              character: characterPda,
              npc: kaelPda,
              relationship: relPda,
              owner,
              systemProgram: SystemProgram.programId,
            })
            .rpc()
        );
      },
    };
  }, [program, owner, addresses, run]);

  return {
    connected: Boolean(wallet),
    owner,
    character,
    kael,
    relationship,
    loaded,
    loadError,
    busy,
    activity,
    actions,
    refresh,
  };
}

export type MandateState = ReturnType<typeof useMandate>;
