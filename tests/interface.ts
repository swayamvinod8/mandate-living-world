import * as anchor from "@coral-xyz/anchor";
import { expect } from "chai";
import { Connection, Keypair, SystemProgram } from "@solana/web3.js";
import idl from "../target/idl/mandate.json";
import type { Mandate } from "../target/types/mandate";

if (process.env.NEXT_PUBLIC_PROGRAM_ID && process.env.NEXT_PUBLIC_PROGRAM_ID !== idl.address) {
  throw new Error("NEXT_PUBLIC_PROGRAM_ID must match target/idl/mandate.json");
}
process.env.NEXT_PUBLIC_PROGRAM_ID = idl.address;
const { getCharacterPda, getNpcPda, getRelationshipPda } =
  require("../web/lib/pdas") as typeof import("../web/lib/pdas");

// These checks build and encode locally; no validator, wallet file, or SOL needed.
describe("Mandate client interface (offline)", () => {
  const owner = Keypair.generate().publicKey;
  const authority = Keypair.generate().publicKey;
  const [character] = getCharacterPda(owner);
  const [npc] = getNpcPda(authority, 1);
  const [relationship] = getRelationshipPda(npc, character);
  const provider = new anchor.AnchorProvider(
    new Connection("http://127.0.0.1:8899"),
    new anchor.Wallet(Keypair.generate()),
    {},
  );
  const program = new anchor.Program<Mandate>(idl as unknown as Mandate, provider);

  it("encodes all four character classes with the current IDL", async () => {
    for (const classId of [0, 1, 2, 3]) {
      const instruction = await program.methods.createCharacter(classId).accountsStrict({
        character, owner, systemProgram: SystemProgram.programId,
      }).instruction();
      expect(instruction.programId.toBase58()).to.equal(idl.address);
      expect(instruction.data.length).to.equal(9);
      expect(instruction.data[8]).to.equal(classId);
      expect(instruction.keys.find((key) => key.pubkey.equals(owner))?.isSigner).to.equal(true);
    }
  });

  it("allows settlement without any instruction signer", async () => {
    const instruction = await program.methods.settle().accountsStrict({ character }).instruction();
    expect(instruction.keys.length).to.equal(1);
    expect(instruction.keys[0].pubkey.equals(character)).to.equal(true);
    expect(instruction.keys[0].isWritable).to.equal(true);
    expect(instruction.keys[0].isSigner).to.equal(false);
  });

  it("builds the remaining demo instructions with explicit accounts", async () => {
    const instructions = await Promise.all([
      program.methods.guildJob().accountsStrict({ character, owner }).instruction(),
      program.methods.checkEvent().accountsStrict({ character, owner }).instruction(),
      program.methods.createNpc(1, "Kael", 70, 3, new anchor.BN(100)).accountsStrict({
        npc, authority, systemProgram: SystemProgram.programId,
      }).instruction(),
      program.methods.hire().accountsStrict({
        character, npc, relationship, owner, systemProgram: SystemProgram.programId,
      }).instruction(),
      program.methods.bribeAndBetray(new anchor.BN(500)).accountsStrict({
        character, npc, relationship, rival: authority,
      }).instruction(),
    ]);
    const expectedSigners = [owner, owner, authority, owner, authority];
    for (const [index, instruction] of instructions.entries()) {
      const signers = instruction.keys.filter((key) => key.isSigner);
      expect(signers.length).to.equal(1);
      expect(signers[0].pubkey.equals(expectedSigners[index])).to.equal(true);
    }
  });

  it("keeps the relationship character key at the recap's byte offset 40", async () => {
    const data = await program.coder.accounts.encode("relationship", {
      npc, character, trust: 3, bondEscrow: new anchor.BN(100), betrayed: false,
      bump: getRelationshipPda(npc, character)[1],
    });
    expect(data.subarray(40, 72).equals(character.toBuffer())).to.equal(true);
    const decoded = program.coder.accounts.decode("relationship", data);
    expect(decoded.trust).to.equal(3);
    expect(decoded.bondEscrow.toNumber()).to.equal(100);
    expect(decoded.betrayed).to.equal(false);
  });
});
