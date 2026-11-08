import * as anchor from "@coral-xyz/anchor";
import { expect } from "chai";
import { Connection, Keypair, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import idl from "../target/idl/mandate.json";
import type { Mandate } from "../target/types/mandate";

// pdas.ts reads the program ID at import time. Use this build's ID, not its fallback.
if (process.env.NEXT_PUBLIC_PROGRAM_ID && process.env.NEXT_PUBLIC_PROGRAM_ID !== idl.address) {
  throw new Error("NEXT_PUBLIC_PROGRAM_ID must match target/idl/mandate.json");
}
process.env.NEXT_PUBLIC_PROGRAM_ID = idl.address;
const { getCharacterPda, getNpcPda, getRelationshipPda, FLAGS, NPC_IDS } =
  require("../web/lib/pdas") as typeof import("../web/lib/pdas");

// Final class economy confirmed by Aadharsh.
const CLASSES = [
  { name: "Warrior", gold: 100, income: 12, rent: 4 },
  { name: "Rogue", gold: 80, income: 10, rent: 2 },
  { name: "Merchant", gold: 150, income: 20, rent: 8 },
  { name: "Paladin", gold: 120, income: 8, rent: 2 },
];

async function expectAnchorError(action: Promise<unknown>, code: string) {
  try {
    await action;
  } catch (error) {
    const parsed = error as { error?: { errorCode?: { code?: string } } };
    expect(parsed.error?.errorCode?.code, String(error)).to.equal(code);
    return;
  }
  expect.fail(`Expected ${code}, but the transaction succeeded`);
}

describe("mandate", () => {
  let provider: anchor.AnchorProvider;
  let program: anchor.Program<Mandate>;
  const player = Keypair.generate();
  const authority = Keypair.generate();
  let character: PublicKey;
  let npc: PublicKey;
  let relationship: PublicKey;

  async function fund(recipient: PublicKey) {
    await provider.sendAndConfirm(new Transaction().add(SystemProgram.transfer({
      fromPubkey: provider.wallet.publicKey,
      toPubkey: recipient,
      lamports: 30_000_000,
    })));
  }

  async function createPlayer(owner: Keypair, classId: number) {
    const [address] = getCharacterPda(owner.publicKey);
    await program.methods.createCharacter(classId).accountsStrict({
      character: address,
      owner: owner.publicKey,
      systemProgram: SystemProgram.programId,
    }).signers([owner]).rpc();
    return address;
  }

  function guildJob(owner = player, address = character) {
    return program.methods.guildJob().accountsStrict({
      character: address, owner: owner.publicKey,
    }).signers([owner]).rpc();
  }

  function checkEvent(owner = player, address = character) {
    return program.methods.checkEvent().accountsStrict({
      character: address, owner: owner.publicKey,
    }).signers([owner]).rpc();
  }

  function bribe(offer: number, rival = authority) {
    return program.methods.bribeAndBetray(new anchor.BN(offer)).accountsStrict({
      character, npc, relationship, rival: rival.publicKey,
    }).signers([rival]).rpc();
  }

  // Simulate to get event logs directly; no indexing delays or subscriptions.
  async function simulatedEvents(transaction: Transaction) {
    transaction.feePayer = provider.wallet.publicKey;
    const result = await provider.connection.simulateTransaction(transaction);
    expect(result.value.err, "Transaction simulation failed").to.equal(null);
    return [...new anchor.EventParser(program.programId, program.coder)
      .parseLogs(result.value.logs ?? [])].map((event) => ({
        name: event.name,
        data: event.data as Record<string, unknown>,
      }));
  }

  function eventNamed(events: Awaited<ReturnType<typeof simulatedEvents>>, name: string) {
    const event = events.find((entry) => entry.name.toLowerCase() === name.toLowerCase());
    expect(event, `Missing ${name} event`).not.to.equal(undefined);
    return event!.data;
  }

  before(async () => {
    const environment = anchor.AnchorProvider.env();
    provider = new anchor.AnchorProvider(
      new Connection(environment.connection.rpcEndpoint, "confirmed"),
      environment.wallet,
      { ...environment.opts, commitment: "confirmed", preflightCommitment: "confirmed" },
    );
    anchor.setProvider(provider);
    program = new anchor.Program<Mandate>(idl as unknown as Mandate, provider);
    const endpoint = new URL(provider.connection.rpcEndpoint);
    const local = ["localhost", "127.0.0.1", "[::1]"].includes(endpoint.hostname);
    if (!local) {
      const genesis = await provider.connection.getGenesisHash();
      if (genesis !== "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG") {
        throw new Error("Run these funded integration tests on localnet or Solana devnet");
      }
    }
    const account = await provider.connection.getAccountInfo(program.programId);
    if (!account?.executable) {
      throw new Error("Mandate is not deployed on this cluster. Build and deploy the current source first.");
    }
    await fund(player.publicKey);
    await fund(authority.publicKey);
    [character] = getCharacterPda(player.publicKey);
    [npc] = getNpcPda(authority.publicKey, NPC_IDS.KAEL);
    [relationship] = getRelationshipPda(npc, character);
  });

  for (const [classId, config] of CLASSES.entries()) {
    it(`initializes a ${config.name} character`, async () => {
      const owner = classId === 2 ? player : Keypair.generate();
      if (owner !== player) await fund(owner.publicKey);
      const startSlot = await provider.connection.getSlot();
      const startTime = await provider.connection.getBlockTime(startSlot);
      const address = await createPlayer(owner, classId);
      const state = await program.account.character.fetch(address);
      const endSlot = await provider.connection.getSlot();
      const endTime = await provider.connection.getBlockTime(endSlot);
      expect(state.owner.equals(owner.publicKey)).to.equal(true);
      expect(state.class).to.equal(classId);
      expect(state.gold.toNumber()).to.equal(config.gold);
      expect(state.incomePerHour.toNumber()).to.equal(config.income);
      expect(state.rentPerHour.toNumber()).to.equal(config.rent);
      expect(state.thievesRep).to.equal(0);
      expect(state.flags).to.equal(0);
      expect(state.bump).to.equal(getCharacterPda(owner.publicKey)[1]);
      expect(state.lastUpdate.toNumber()).to.be.greaterThan(0);
      if (startTime !== null) expect(state.lastUpdate.toNumber()).to.be.at.least(startTime);
      if (endTime !== null) expect(state.lastUpdate.toNumber()).to.be.at.most(endTime);
    });
  }

  it("rejects class 4 without creating an account", async () => {
    const invalid = Keypair.generate();
    await fund(invalid.publicKey);
    const [address] = getCharacterPda(invalid.publicKey);
    await expectAnchorError(createPlayer(invalid, 4), "InvalidClass");
    expect(await program.account.character.fetchNullable(address)).to.equal(null);
  });

  it("settles zero elapsed hours without the character owner's signature", async () => {
    const before = await program.account.character.fetch(character);
    const transaction = await program.methods.settle().accountsStrict({ character }).transaction();
    expect(transaction.instructions[0].keys.some((key) => key.isSigner)).to.equal(false);
    const event = eventNamed(await simulatedEvents(transaction), "Settled");
    expect(String(event.hours)).to.equal("0");
    expect(String(event.goldBefore)).to.equal(before.gold.toString());
    expect(String(event.goldAfter)).to.equal(before.gold.toString());
    await program.methods.settle().accountsStrict({ character }).rpc();
    const after = await program.account.character.fetch(character);
    expect(after.gold.eq(before.gold)).to.equal(true);
    expect(after.lastUpdate.gte(before.lastUpdate)).to.equal(true);
  });

  it("requires both betrayal and guild reputation to unlock the event", async () => {
    await expectAnchorError(checkEvent(), "EventConditionsNotMet");
    await guildJob();
    expect((await program.account.character.fetch(character)).thievesRep).to.equal(5);
    await guildJob();
    const state = await program.account.character.fetch(character);
    expect(state.thievesRep).to.equal(10);
    await expectAnchorError(checkEvent(), "EventConditionsNotMet");
    expect((await program.account.character.fetch(character)).flags & FLAGS.EVENT_HUNT_KAEL_UNLOCKED)
      .to.equal(0);
  });

  it("prevents another signer from doing jobs or checking the player's event", async () => {
    await expectAnchorError(guildJob(authority), "ConstraintSeeds");
    await expectAnchorError(checkEvent(authority), "ConstraintSeeds");
  });

  it("creates Kael and hires him with trust 3 and a 100 gold bond", async () => {
    await program.methods.createNpc(NPC_IDS.KAEL, "Kael", 70, 3, new anchor.BN(100))
      .accountsStrict({ npc, authority: authority.publicKey, systemProgram: SystemProgram.programId })
      .signers([authority]).rpc();
    const created = await program.account.npc.fetch(npc);
    expect(created.authority.equals(authority.publicKey)).to.equal(true);
    expect(created.id).to.equal(NPC_IDS.KAEL);
    expect(created.name).to.equal("Kael");
    expect(created.greed).to.equal(70);
    expect(created.loyalty).to.equal(3);
    expect(created.bond.toNumber()).to.equal(100);
    expect(created.hiredBy).to.equal(null);
    expect(created.bump).to.equal(getNpcPda(authority.publicKey, NPC_IDS.KAEL)[1]);

    await program.methods.hire().accountsStrict({
      character, npc, relationship, owner: player.publicKey, systemProgram: SystemProgram.programId,
    }).signers([player]).rpc();
    const rel = await program.account.relationship.fetch(relationship);
    expect(rel.npc.equals(npc)).to.equal(true);
    expect(rel.character.equals(character)).to.equal(true);
    expect(rel.trust).to.equal(3);
    expect(rel.bondEscrow.toNumber()).to.equal(100);
    expect(rel.betrayed).to.equal(false);
    expect(rel.bump).to.equal(getRelationshipPda(npc, character)[1]);
    expect((await program.account.npc.fetch(npc)).hiredBy!.equals(character)).to.equal(true);
  });

  it("rejects a second hire from another character", async () => {
    // A different relationship reaches NpcAlreadyHired instead of the init check.
    const other = Keypair.generate();
    await fund(other.publicKey);
    const otherCharacter = await createPlayer(other, 0);
    const [otherRelationship] = getRelationshipPda(npc, otherCharacter);
    await expectAnchorError(program.methods.hire().accountsStrict({
      character: otherCharacter, npc, relationship: otherRelationship,
      owner: other.publicKey, systemProgram: SystemProgram.programId,
    }).signers([other]).rpc(), "NpcAlreadyHired");
    expect(await program.account.relationship.fetchNullable(otherRelationship)).to.equal(null);
  });

  it("rejects a rival that does not control Kael", async () => {
    await expectAnchorError(bribe(500, player), "Unauthorized");
  });

  it("rejects bribes below or equal to 130 without changing balances", async () => {
    const before = await program.account.character.fetch(character);
    for (const offer of [0, 129, 130]) await expectAnchorError(bribe(offer), "BribeTooSmall");
    const rel = await program.account.relationship.fetch(relationship);
    expect(rel.betrayed).to.equal(false);
    expect(rel.bondEscrow.toNumber()).to.equal(100);
    const after = await program.account.character.fetch(character);
    expect(after.gold.eq(before.gold)).to.equal(true);
    expect(after.flags).to.equal(before.flags);
    expect((await program.account.npc.fetch(npc)).hiredBy!.equals(character)).to.equal(true);
  });

  it("accepts 500 and pays the slashed bond to the betrayed player", async () => {
    const before = await program.account.character.fetch(character);
    const transaction = await program.methods.bribeAndBetray(new anchor.BN(500)).accountsStrict({
      character, npc, relationship, rival: authority.publicKey,
    }).transaction();
    const event = eventNamed(await simulatedEvents(transaction), "Betrayed");
    expect(String(event.offer)).to.equal("500");
    expect(String(event.bondPaid)).to.equal("100");
    expect(String(event.npc)).to.equal(npc.toBase58());
    await bribe(500);
    const after = await program.account.character.fetch(character);
    const rel = await program.account.relationship.fetch(relationship);
    expect(after.gold.eq(before.gold.addn(100))).to.equal(true);
    expect(after.flags & FLAGS.BETRAYED_BY_COMPANION).to.equal(FLAGS.BETRAYED_BY_COMPANION);
    expect(rel.bondEscrow.toNumber()).to.equal(0);
    expect(rel.betrayed).to.equal(true);
    expect((await program.account.npc.fetch(npc)).hiredBy).to.equal(null);
  });

  it("prevents the same bond from being paid twice", async () => {
    const before = await program.account.character.fetch(character);
    await expectAnchorError(bribe(500), "AlreadyBetrayed");
    expect((await program.account.character.fetch(character)).gold.eq(before.gold)).to.equal(true);
  });

  it("unlocks the hunt and emits event 1 once both conditions hold", async () => {
    const before = await program.account.character.fetch(character);
    const transaction = await program.methods.checkEvent().accountsStrict({
      character, owner: player.publicKey,
    }).transaction();
    const event = eventNamed(await simulatedEvents(transaction), "EventUnlocked");
    expect(event.eventId).to.equal(1);
    await checkEvent();
    const after = await program.account.character.fetch(character);
    expect(after.flags).to.equal(before.flags | FLAGS.EVENT_HUNT_KAEL_UNLOCKED);
    expect(after.gold.eq(before.gold)).to.equal(true);
  });

  it("keeps the event locked for a betrayed character with insufficient reputation", async () => {
    const owner = Keypair.generate();
    await fund(owner.publicKey);
    const address = await createPlayer(owner, 1);
    const [rel] = getRelationshipPda(npc, address);
    await program.methods.hire().accountsStrict({
      character: address, npc, relationship: rel,
      owner: owner.publicKey, systemProgram: SystemProgram.programId,
    }).signers([owner]).rpc();
    await program.methods.bribeAndBetray(new anchor.BN(500)).accountsStrict({
      character: address, npc, relationship: rel, rival: authority.publicKey,
    }).signers([authority]).rpc();
    await guildJob(owner, address);
    const state = await program.account.character.fetch(address);
    expect(state.flags & FLAGS.BETRAYED_BY_COMPANION).to.equal(FLAGS.BETRAYED_BY_COMPANION);
    expect(state.thievesRep).to.equal(5);
    await expectAnchorError(checkEvent(owner, address), "EventConditionsNotMet");
    expect((await program.account.character.fetch(address)).flags & FLAGS.EVENT_HUNT_KAEL_UNLOCKED)
      .to.equal(0);
  });

  it("caps reputation at 100 across repeated guild jobs", async () => {
    // A few jobs per transaction stay comfortably below transaction size limits.
    for (let batch = 0; batch < 5; batch++) {
      const transaction = new Transaction();
      for (let job = 0; job < 4; job++) {
        transaction.add(await program.methods.guildJob().accountsStrict({
          character, owner: player.publicKey,
        }).instruction());
      }
      await provider.sendAndConfirm(transaction, [player]);
    }
    expect((await program.account.character.fetch(character)).thievesRep).to.equal(100);
    await guildJob();
    expect((await program.account.character.fetch(character)).thievesRep).to.equal(100);
  });
});
