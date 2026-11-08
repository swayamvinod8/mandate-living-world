import { BN, web3 } from "@coral-xyz/anchor";
import { client, fail } from "./client";
import { getNpcPda, explorerTxUrl } from "../web/lib/pdas";

async function main() {
  // Rival traits were not supplied in the team split. Require explicit values.
  const args = process.argv.slice(2);
  if (args.length !== 3 || args.some(value => !/^\d+$/.test(value))) {
    throw new Error("Usage: seed-npcs.ts <rival-greed> <rival-loyalty> <rival-bond>");
  }
  const [greed, loyalty] = args.map(Number);
  const bond = new BN(args[2]);
  if (greed > 255 || loyalty > 255 || bond.bitLength() > 64) {
    throw new Error("Traits must fit u8 and bond must fit u64.");
  }
  const { program, authority } = await client();
  const definitions = [
    { id: 1, name: "Kael", greed: 70, loyalty: 3, bond: new BN(100) },
    { id: 2, name: "Vex", greed, loyalty, bond },
  ];
  for (const definition of definitions) {
    const [npc] = getNpcPda(authority, definition.id);
    const validate = (account: Awaited<ReturnType<typeof program.account.npc.fetch>>) => {
      if (!account.authority.equals(authority) || account.id !== definition.id ||
          account.name !== definition.name || account.greed !== definition.greed ||
          account.loyalty !== definition.loyalty || !account.bond.eq(definition.bond)) {
        throw new Error(`${definition.name} account does not match expected values. Check deployed NPC logic.`);
      }
    };
    const existing = await program.account.npc.fetchNullable(npc);
    if (existing) {
      validate(existing);
      console.log(`${definition.name} already exists: ${npc.toBase58()}`);
      continue;
    }
    const signature = await program.methods.createNpc(
      definition.id, definition.name, definition.greed, definition.loyalty, definition.bond,
    ).accountsStrict({ npc, authority, systemProgram: web3.SystemProgram.programId }).rpc();
    console.log(explorerTxUrl(signature));
    validate(await program.account.npc.fetch(npc));
    console.log(`${definition.name} created: ${npc.toBase58()}`);
  }
}
main().catch(fail);
