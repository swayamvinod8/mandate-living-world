import * as anchor from "@coral-xyz/anchor";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Mandate } from "../web/lib/idl/mandate";
import idl from "../web/lib/idl/mandate.json";
import { PROGRAM_ID, NPC_AUTHORITY } from "../web/lib/pdas";

export async function client() {
  if (!PROGRAM_ID.equals(new anchor.web3.PublicKey(idl.address))) {
    throw new Error("NEXT_PUBLIC_PROGRAM_ID must match the IDL address.");
  }
  const keypair = anchor.web3.Keypair.fromSecretKey(Uint8Array.from(JSON.parse(
    readFileSync(resolve("scripts/keys/server.json"), "utf8")
  )));
  if (!NPC_AUTHORITY || !NPC_AUTHORITY.equals(keypair.publicKey)) {
    throw new Error("NEXT_PUBLIC_NPC_AUTHORITY must match scripts/keys/server.json.");
  }
  const connection = new anchor.web3.Connection(anchor.web3.clusterApiUrl("devnet"), "confirmed");
  const deployed = await connection.getAccountInfo(PROGRAM_ID);
  if (!deployed?.executable) throw new Error("Program is not deployed on devnet yet.");
  if (await connection.getBalance(keypair.publicKey) === 0) {
    throw new Error("Server wallet needs devnet SOL.");
  }
  const provider = new anchor.AnchorProvider(connection, new anchor.Wallet(keypair), {
    commitment: "confirmed", preflightCommitment: "confirmed",
  });
  const program = new anchor.Program<Mandate>(idl as Mandate, provider);
  return { program, authority: keypair.publicKey };
}

export function fail(error: unknown) {
  console.error(error instanceof Error ? error.message : "Request failed.");
  process.exitCode = 1;
}
