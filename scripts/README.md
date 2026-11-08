# Server scripts

Run all commands from the repository root. Requires the existing npm dependencies and Node with `--env-file` support. The scripts load the existing server keypair; they never generate or replace it. They always connect to devnet.

Compile:

```bash
npx tsc -p scripts/tsconfig.json
```

Seed Kael and a rival:

```bash
node --env-file=web/.env.local scripts/.build/scripts/seed-npcs.js <rival-greed> <rival-loyalty> <rival-bond>
```

Replace the three placeholders with team-approved integers. The split specifies only rival ID 2, so this script deliberately requires its traits rather than inventing them. Kael is fixed at ID 1, greed 70, loyalty 3, bond 100. Existing matching NPC accounts are skipped; mismatches stop execution.

After a player creates a character and hires Kael:

```bash
node --env-file=web/.env.local scripts/.build/scripts/bribe.js <character-account-public-key> 500
```

Pass the Character account address, not the player's wallet address. Offer defaults to 500. The server authority signs as `rival`; the instruction does not accept a separate rival NPC account. Offers at or below the current bond plus trust times 10 are rejected locally. Ryan's program tests should test on-chain rejection directly.

Both scripts use the shared PDA helpers and explicit accountsStrict account lists. Keep NEXT_PUBLIC_PROGRAM_ID aligned with the supplied IDL, and NEXT_PUBLIC_NPC_AUTHORITY aligned with scripts/keys/server.json. A funded wallet and a deployed program with completed handler logic are required. Empty skeleton handlers can confirm transactions without producing valid game state; the scripts check resulting state and report a failure in that case.

Never commit scripts/keys/server.json or web/.env.local. No private keys are included in these files.
