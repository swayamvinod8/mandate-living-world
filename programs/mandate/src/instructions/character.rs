// Character instructions - owner: Ryan
// Account structs are final (they're the interface). Fill in the handler bodies.

use anchor_lang::prelude::*;

use crate::errors::MandateError;
use crate::state::*;

// ---------- create_character ----------

#[derive(Accounts)]
pub struct CreateCharacter<'info> {
    #[account(
        init,
        payer = owner,
        space = 8 + Character::INIT_SPACE,
        seeds = [b"character", owner.key().as_ref()],
        bump
    )]
    pub character: Account<'info, Character>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn create_character(ctx: Context<CreateCharacter>, class: u8) -> Result<()> {
    require!(class <= CLASS_PALADIN, MandateError::InvalidClass);

    // TODO(Ryan): set owner, class, starting gold, income/rent per hour by class,
    // last_update = Clock::get()?.unix_timestamp, thieves_rep = 0, flags = 0,
    // bump = ctx.bumps.character
    let _ = ctx;
    Ok(())
}

// ---------- settle ----------
// Anyone can call this; the math only depends on the clock.

#[derive(Accounts)]
pub struct Settle<'info> {
    #[account(
        mut,
        seeds = [b"character", character.owner.as_ref()],
        bump = character.bump
    )]
    pub character: Account<'info, Character>,
}

pub fn settle(ctx: Context<Settle>) -> Result<()> {
    // TODO(Ryan): elapsed hours = min(now - last_update, MAX_SETTLE_HOURS * 3600) / 3600
    // gold += income_per_hour * hours (checked), gold -= min(gold, rent_per_hour * hours)
    // last_update = now. Integer math only.
    // emit!(Settled { gold_before, gold_after, hours });
    let _ = ctx;
    Ok(())
}

// ---------- guild_job ----------

#[derive(Accounts)]
pub struct GuildJob<'info> {
    #[account(
        mut,
        seeds = [b"character", owner.key().as_ref()],
        bump = character.bump,
        has_one = owner
    )]
    pub character: Account<'info, Character>,

    pub owner: Signer<'info>,
}

pub fn guild_job(ctx: Context<GuildJob>) -> Result<()> {
    // TODO(Ryan): thieves_rep = min(thieves_rep + GUILD_JOB_REP, MAX_REP)
    let _ = ctx;
    Ok(())
}

// ---------- check_event ----------

#[derive(Accounts)]
pub struct CheckEvent<'info> {
    #[account(
        mut,
        seeds = [b"character", owner.key().as_ref()],
        bump = character.bump,
        has_one = owner
    )]
    pub character: Account<'info, Character>,

    pub owner: Signer<'info>,
}

pub fn check_event(ctx: Context<CheckEvent>) -> Result<()> {
    // TODO(Ryan): require BETRAYED flag and thieves_rep >= HUNT_EVENT_MIN_REP
    // (else EventConditionsNotMet), set FLAG_EVENT_HUNT_KAEL_UNLOCKED,
    // emit!(EventUnlocked { event_id: HUNT_EVENT_ID });
    let _ = ctx;
    Ok(())
}
