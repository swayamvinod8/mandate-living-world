use anchor_lang::prelude::*;

pub mod errors;
pub mod events;
pub mod instructions;
pub mod state;

use instructions::*;

// Replaced by `anchor keys sync` before the first deploy
declare_id!("H3tueXv6DLBhn61SzEuy3MueqGwhQfkM5yK2gyHsZDjd");

#[program]
pub mod mandate {
    use super::*;

    pub fn create_character(ctx: Context<CreateCharacter>, class: u8) -> Result<()> {
        instructions::character::create_character(ctx, class)
    }

    pub fn settle(ctx: Context<Settle>) -> Result<()> {
        instructions::character::settle(ctx)
    }

    pub fn guild_job(ctx: Context<GuildJob>) -> Result<()> {
        instructions::character::guild_job(ctx)
    }

    pub fn check_event(ctx: Context<CheckEvent>) -> Result<()> {
        instructions::character::check_event(ctx)
    }

    pub fn create_npc(
        ctx: Context<CreateNpc>,
        id: u8,
        name: String,
        greed: u8,
        loyalty: u8,
        bond: u64,
    ) -> Result<()> {
        instructions::npc::create_npc(ctx, id, name, greed, loyalty, bond)
    }

    pub fn hire(ctx: Context<Hire>) -> Result<()> {
        instructions::npc::hire(ctx)
    }

    pub fn bribe_and_betray(ctx: Context<BribeAndBetray>, offer: u64) -> Result<()> {
        instructions::npc::bribe_and_betray(ctx, offer)
    }
}
