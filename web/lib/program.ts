import { AnchorProvider, Program } from "@coral-xyz/anchor";
import type { AnchorWallet } from "@solana/wallet-adapter-react";
import type { Connection } from "@solana/web3.js";
import idl from "@/lib/idl/mandate.json";
import type { Mandate } from "@/lib/idl/mandate";
import { NPC_AUTHORITY, PROGRAM_ID } from "./pdas";

export function getProgram(connection: Connection, wallet: AnchorWallet): Program<Mandate> {
  const provider = new AnchorProvider(connection, wallet, {
    commitment: "confirmed",
    preflightCommitment: "confirmed",
  });
  return new Program<Mandate>(idl as Mandate, provider);
}

// Shown as a banner so a missing env var doesn't look like a broken game
export function configProblem(): string | null {
  if (PROGRAM_ID.toBase58() !== idl.address) {
    return "NEXT_PUBLIC_PROGRAM_ID in web/.env.local doesn't match the program in web/lib/idl/mandate.json.";
  }
  if (!NPC_AUTHORITY) {
    return "NEXT_PUBLIC_NPC_AUTHORITY is missing from web/.env.local, so Kael can't be found.";
  }
  return null;
}
