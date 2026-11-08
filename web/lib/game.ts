// Game rules mirrored from the program so the UI can explain them.
// Source of truth: programs/mandate/src/state.rs and instructions/character.rs

export const GUILD_JOB_REP = 5;
export const MAX_REP = 100;
export const HUNT_MIN_REP = 10;
export const TRUST_WEIGHT = 10;
export const MAX_SETTLE_HOURS = 72;

// Same table as class_economy() in character.rs
export const CLASSES = [
  {
    id: 0,
    name: "Warrior",
    startGold: 100,
    income: 12,
    rent: 4,
    note: "Steady contracts and a sturdy hall to keep.",
  },
  {
    id: 1,
    name: "Rogue",
    startGold: 80,
    income: 10,
    rent: 2,
    note: "Lean upkeep, and the Thieves' Guild knows your face.",
  },
  {
    id: 2,
    name: "Merchant",
    startGold: 150,
    income: 20,
    rent: 8,
    note: "Shop fees fill the purse. The guild hall rent is steep.",
  },
  {
    id: 3,
    name: "Paladin",
    startGold: 120,
    income: 8,
    rent: 2,
    note: "Modest income, few expenses, a long memory.",
  },
] as const;

export function loyaltyPrice(bond: number, trust: number): number {
  return bond + trust * TRUST_WEIGHT;
}

// Same math as settled_balance() in character.rs: whole hours only, capped at 72
export function settlePreview(
  gold: number,
  incomePerHour: number,
  rentPerHour: number,
  lastUpdate: number,
  nowSec: number
) {
  const capSec = MAX_SETTLE_HOURS * 3600;
  const elapsed = Math.min(Math.max(nowSec - lastUpdate, 0), capSec);
  const hours = Math.floor(elapsed / 3600);
  const goldAfter = Math.max(gold + incomePerHour * hours - rentPerHour * hours, 0);
  const capped = elapsed >= capSec;
  const nextHourIn = capped ? null : 3600 - (elapsed % 3600);
  return { hours, goldAfter, delta: goldAfter - gold, capped, nextHourIn };
}
