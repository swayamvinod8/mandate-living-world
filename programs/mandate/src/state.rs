// Account layouts. This file is the shared contract - announce any change
// in the group chat before merging, since the web app and recap read these.

use anchor_lang::prelude::*;

pub const MAX_NPC_NAME_LEN: usize = 16;

// Character.flags bits (mirrored in web/lib/pdas.ts)
pub const FLAG_BETRAYED_BY_COMPANION: u8 = 1 << 0;
pub const FLAG_EVENT_HUNT_KAEL_UNLOCKED: u8 = 1 << 1;

// Game tuning
pub const MAX_SETTLE_HOURS: i64 = 72;
pub const GUILD_JOB_REP: i16 = 5;
pub const MAX_REP: i16 = 100;
pub const TRUST_WEIGHT: u64 = 10;
pub const HUNT_EVENT_MIN_REP: i16 = 10;
pub const HUNT_EVENT_ID: u8 = 1;

pub const CLASS_WARRIOR: u8 = 0;
pub const CLASS_ROGUE: u8 = 1;
pub const CLASS_MERCHANT: u8 = 2;
pub const CLASS_PALADIN: u8 = 3;

// seeds ["character", owner]
#[account]
#[derive(InitSpace)]
pub struct Character {
    pub owner: Pubkey,
    pub class: u8,
    pub gold: u64,
    pub income_per_hour: u64,
    pub rent_per_hour: u64,
    pub last_update: i64,
    pub thieves_rep: i16,
    pub flags: u8,
    pub bump: u8,
}

// seeds ["npc", authority, id]
#[account]
#[derive(InitSpace)]
pub struct Npc {
    pub authority: Pubkey,
    pub id: u8,
    #[max_len(16)] // keep in sync with MAX_NPC_NAME_LEN
    pub name: String,
    pub greed: u8,
    pub loyalty: u8,
    pub bond: u64,
    pub hired_by: Option<Pubkey>,
    pub bump: u8,
}

// seeds ["rel", npc, character]
// Keep `npc` then `character` as the first two fields - the recap
// looks relationships up by the character key at byte offset 40.
#[account]
#[derive(InitSpace)]
pub struct Relationship {
    pub npc: Pubkey,
    pub character: Pubkey,
    pub trust: u8,
    pub bond_escrow: u64,
    pub betrayed: bool,
    pub bump: u8,
}
