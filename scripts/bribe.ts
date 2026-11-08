import { BN, web3 } from "@coral-xyz/anchor";
import { client, fail } from "./client";
import { getCharacterPda, getNpcPda, getRelationshipPda, explorerTxUrl, FLAGS } from "../web/lib/pdas";

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 1 || args.length > 2 || (args[1] && !/^\d+$/.test(args[1]))) {
    throw new Error("Usage: bribe.ts <character-account-public-key> [offer=500]");
  }
  const character = new web3.PublicKey(args[0]);
  const offer = new BN(args[1] ?? "500");
  if (offer.bitLength() > 64) throw new Error("Offer must fit u64.");
  const { program, authority } = await client();
  const [npc] = getNpcPda(authority, 1);
  const [relationship] = getRelationshipPda(npc, character);
  const [before, kael, rel] = await Promise.all([
    program.account.character.fetch(character), program.account.npc.fetch(npc),
    program.account.relationship.fetch(relationship),
  ]);
  if (!getCharacterPda(before.owner)[0].equals(character)) throw new Error("Invalid character PDA.");
  if (!kael.authority.equals(authority)) throw new Error("Wrong NPC authority.");
  if (!rel.npc.equals(npc) || !rel.character.equals(character)) throw new Error("Relationship mismatch.");
  if (rel.betrayed) throw new Error("Kael already betrayed this character.");
  if (!kael.hiredBy?.equals(character)) throw new Error("This character must hire Kael first.");
  const threshold = rel.bondEscrow.add(new BN(rel.trust).muln(10));
  console.log(`Offer: ${offer.toString()}; threshold: ${threshold.toString()}`);
  if (offer.lte(threshold)) throw new Error("Offer must be above the betrayal threshold.");
  // The rival signer is the server authority, not the rival NPC PDA.
  const signature = await program.methods.bribeAndBetray(offer).accountsStrict({
    character, npc, relationship, rival: authority,
  }).rpc();
  console.log(explorerTxUrl(signature));
  const [after, updatedRel, updatedNpc] = await Promise.all([
    program.account.character.fetch(character), program.account.relationship.fetch(relationship),
    program.account.npc.fetch(npc),
  ]);
  if (!updatedRel.betrayed || !updatedRel.bondEscrow.isZero() || updatedNpc.hiredBy !== null ||
      !(after.flags & FLAGS.BETRAYED_BY_COMPANION) || !after.gold.eq(before.gold.add(rel.bondEscrow))) {
    throw new Error("Transaction confirmed but expected betrayal state was not observed. Check program logic and concurrent transactions.");
  }
  console.log(`Betrayal verified. Gold: ${before.gold.toString()} -> ${after.gold.toString()}`);
}
main().catch(fail);
