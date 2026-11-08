Ryan's character logic and tests
===============================

Scope: `programs/mandate/src/instructions/character.rs` and `tests/`.
The shared accounts, seeds, IDL, PDA helpers, and NPC handlers are unchanged.

Provisional class tuning
------------------------

The supplied handover does not contain the original class economy table.
All classes start with **500 gold**. The temporary hourly rates are:

| Class | Income | Rent |
| --- | ---: | ---: |
| Warrior | 10 | 10 |
| Rogue | 11 | 10 |
| Merchant | 12 | 10 |
| Paladin | 10 | 12 |

Only Merchant's 12/10 comes from the existing recap demo. Confirm the other
rates and starting gold with the team before treating them as final. Update
`STARTING_GOLD` and `class_rates` in `character.rs`, plus the expected values
in `tests/mandate.ts`, when the original table is available.

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

The NPC-dependent integration tests are expected to fail against the current
`npc.rs` TODO stubs. Aadharsh must implement `create_npc`, `hire`, and
`bribe_and_betray`, then deploy that version, for the complete flow to pass.
