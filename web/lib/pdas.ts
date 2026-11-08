// Shared PDA helpers for the Mandate program.
// Everyone imports addresses from here - don't derive PDAs anywhere else.
// Seeds must match programs/mandate/src/instructions exactly:
//   Character    ["character", owner]
//   Npc          ["npc", authority, id as a single u8 byte]
//   Relationship ["rel", npc, character]

import { PublicKey } from "@solana/web3.js";

// Set NEXT_PUBLIC_PROGRAM_ID in web/.env.local once the skeleton is deployed
export const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_PROGRAM_ID ?? "11111111111111111111111111111111"
);

// Server key that owns the NPCs (public key only, safe to expose)
export const NPC_AUTHORITY = process.env.NEXT_PUBLIC_NPC_AUTHORITY
  ? new PublicKey(process.env.NEXT_PUBLIC_NPC_AUTHORITY)
  : null;

// NPC ids from the spec
export const NPC_IDS = {
  KAEL: 1,
  RIVAL: 2,
} as const;

const enc = new TextEncoder();

export function getCharacterPda(owner: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [enc.encode("character"), owner.toBuffer()],
    PROGRAM_ID
  );
}

export function getNpcPda(authority: PublicKey, id: number): [PublicKey, number] {
  if (!Number.isInteger(id) || id < 0 || id > 255) {
    throw new Error(`NPC id must be 0-255, got ${id}`);
  }
  return PublicKey.findProgramAddressSync(
    [enc.encode("npc"), authority.toBuffer(), Uint8Array.of(id)],
    PROGRAM_ID
  );
}

export function getRelationshipPda(
  npc: PublicKey,
  character: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [enc.encode("rel"), npc.toBuffer(), character.toBuffer()],
    PROGRAM_ID
  );
}

// Character.flags bits
export const FLAGS = {
  BETRAYED_BY_COMPANION: 1 << 0,
  EVENT_HUNT_KAEL_UNLOCKED: 1 << 1,
} as const;

export function hasFlag(flags: number, flag: number): boolean {
  return (flags & flag) !== 0;
}

export const CLASS_NAMES = ["Warrior", "Rogue", "Merchant", "Paladin"] as const;

export function explorerTxUrl(signature: string): string {
  return `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
}

export function explorerAddressUrl(address: PublicKey | string): string {
  return `https://explorer.solana.com/address/${address.toString()}?cluster=devnet`;
}
