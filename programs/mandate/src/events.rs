// Events the recap reads from transaction logs.
// Field names must stay as-is - web/lib/recap/chain.ts depends on them.

use anchor_lang::prelude::*;

#[event]
pub struct Settled {
    pub gold_before: u64,
    pub gold_after: u64,
    pub hours: u64,
}

#[event]
pub struct Hired {
    pub npc: Pubkey,
}

#[event]
pub struct Betrayed {
    pub npc: Pubkey,
    pub offer: u64,
    pub bond_paid: u64,
}

#[event]
pub struct EventUnlocked {
    pub event_id: u8,
}
