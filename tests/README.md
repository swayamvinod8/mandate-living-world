Ryan's character logic and tests
===============================

Scope: `programs/mandate/src/instructions/character.rs` and `tests/`.
The shared accounts, seeds, IDL, PDA helpers, and NPC handlers are unchanged.

Final class economy
-------------------

Aadharsh confirmed these values. They live in `class_economy` in
`character.rs`; `tests/mandate.ts` checks the same table at character creation.

| Class | Start gold | Income/hr | Rent/hr | Net/hr |
| --- | ---: | ---: | ---: | ---: |
| Warrior | 100 | 12 | 4 | +8 |
| Rogue | 80 | 10 | 2 | +8 |
| Merchant | 150 | 20 | 8 | +12 |
| Paladin | 120 | 8 | 2 | +6 |

A Merchant gains at most **864 gold per settlement** at the 72-hour cap:
150 starting gold becomes 1,014, before any bond payouts or other changes.

Demo preparation
----------------

Create the demo character and hire Kael **2–3 hours before recording**.
Earn at least 10 Thieves' Guild reputation with two jobs. During recording,
run the rival's 500 gold bribe, then settle and check the hunt event.
The 100 gold bond payout visibly increases the player's balance, and settlement
adds a real offline-income line to the recap.

Settlement counts whole hours only. A newly created character settles zero
hours during a two-minute recording. Avoid settling between preparation and
recording: each settlement resets `last_update`, even for a partial hour.
Zero elapsed hours means no income; a betrayal can still appear in the recap.

Validation
----------

Install the root Node dependencies with `npm install`. For the chain tests,
use the team's Anchor 0.31.1 / Solana toolchain and a funded test wallet.

On Node 22+ disable Node's built-in TypeScript stripping so `ts-mocha` uses
the repository's TypeScript compiler. In PowerShell, set this before the
commands below:

```powershell
$env:NODE_OPTIONS = "--no-experimental-strip-types"
```

In Bash, use `export NODE_OPTIONS=--no-experimental-strip-types`.
Node 20 does not need this flag.

```sh
# Type-check all TypeScript tests, using the checked-in IDL.
npx tsc --noEmit

# Offline IDL, signer, PDA integration, and account layout checks.
npx ts-mocha -p ./tsconfig.json -t 10000 tests/interface.ts

# Rust unit tests, including actual settlement math at 72 and 73 hours.
cargo test --locked -p mandate

# Full integration suite against a fresh local validator.
anchor test --provider.cluster localnet

# Run against the current program already deployed to devnet.
anchor test --provider.cluster devnet --skip-deploy
```

The local deployment needs the program keypair matching the shared program ID.
Obtain it through the team's existing private workflow. Do not run
`anchor keys sync` to replace the shared program ID just to run these tests.
No keypairs or API keys belong in this repository.

`mandate.ts` creates fresh player/server accounts per run and funds them from
the provider wallet. It accepts localnet or devnet. Its tests run sequentially
through character creation, jobs, hiring, failed bribes, betrayal, and the hunt.
The suite also checks an unauthorized owner/rival, duplicate hiring, duplicate
bond payouts, and the reputation cap.

There are no hour-long sleeps and no duplicate TypeScript settlement formula.
The on-chain zero-hour case is checked in TypeScript. The same Rust helper
used by `settle` is unit-tested for full hours, income/rent, the 72-hour cap,
zero gold, backwards clocks, and overflow. As required by the handover,
settlement always sets `last_update` to now, including partial-hour calls.

Full chain testing requires deploying the combined character and NPC source
to the test cluster. Aadharsh's NPC handlers are now merged into `main`.
The full `anchor test` suite has not been run locally because this Windows
environment lacks WSL and the Solana/Anchor toolchain; the Rust tests and
offline client checks pass.
