// Character instructions - owner: Ryan
// Account structs are the shared interface; keep them unchanged.

use anchor_lang::prelude::*;

use crate::errors::MandateError;
use crate::events::{EventUnlocked, Settled};
use crate::state::*;

// Provisional tuning until the team supplies the original class table.
// Merchant's 12 income / 10 rent matches the existing recap demo.
const STARTING_GOLD: u64 = 500;

fn class_rates(class: u8) -> Result<(u64, u64)> {
    match class {
        CLASS_WARRIOR => Ok((10, 10)),
        CLASS_ROGUE => Ok((11, 10)),
        CLASS_MERCHANT => Ok((12, 10)),
        CLASS_PALADIN => Ok((10, 12)),
        _ => err!(MandateError::InvalidClass),
    }
}

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
    let (income_per_hour, rent_per_hour) = class_rates(class)?;
    ctx.accounts.character.set_inner(Character {
        owner: ctx.accounts.owner.key(),
        class,
        gold: STARTING_GOLD,
        income_per_hour,
        rent_per_hour,
        last_update: Clock::get()?.unix_timestamp,
        thieves_rep: 0,
        flags: 0,
        bump: ctx.bumps.character,
    });
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
    let now = Clock::get()?.unix_timestamp;
    let character = &mut ctx.accounts.character;
    let gold_before = character.gold;
    let (gold_after, hours) = settled_balance(
        gold_before,
        character.income_per_hour,
        character.rent_per_hour,
        character.last_update,
        now,
    )?;
    character.gold = gold_after;
    character.last_update = now;
    emit!(Settled {
        gold_before,
        gold_after,
        hours
    });
    Ok(())
}

// Keep clock math pure so hour boundaries and the cap need no real-time waits.
fn settled_balance(
    gold: u64,
    income_per_hour: u64,
    rent_per_hour: u64,
    last_update: i64,
    now: i64,
) -> Result<(u64, u64)> {
    let elapsed = now
        .saturating_sub(last_update)
        .clamp(0, MAX_SETTLE_HOURS * 3600);
    let hours = (elapsed / 3600) as u64;
    let income = income_per_hour
        .checked_mul(hours)
        .ok_or(MandateError::Overflow)?;
    let rent = rent_per_hour
        .checked_mul(hours)
        .ok_or(MandateError::Overflow)?;
    let available = gold.checked_add(income).ok_or(MandateError::Overflow)?;
    Ok((available.saturating_sub(rent), hours))
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
    let character = &mut ctx.accounts.character;
    character.thieves_rep = character
        .thieves_rep
        .checked_add(GUILD_JOB_REP)
        .ok_or(MandateError::Overflow)?
        .min(MAX_REP);
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
    let character = &mut ctx.accounts.character;
    require!(
        character.flags & FLAG_BETRAYED_BY_COMPANION != 0
            && character.thieves_rep >= HUNT_EVENT_MIN_REP,
        MandateError::EventConditionsNotMet
    );
    character.flags |= FLAG_EVENT_HUNT_KAEL_UNLOCKED;
    emit!(EventUnlocked {
        event_id: HUNT_EVENT_ID
    });
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn class_rates_reject_invalid_classes() {
        assert_eq!(class_rates(CLASS_MERCHANT).unwrap(), (12, 10));
        assert!(class_rates(4).is_err());
        assert!(class_rates(u8::MAX).is_err());
    }

    #[test]
    fn settlement_uses_whole_hours() {
        assert_eq!(settled_balance(500, 12, 10, 100, 100).unwrap(), (500, 0));
        assert_eq!(settled_balance(500, 12, 10, 100, 3699).unwrap(), (500, 0));
        assert_eq!(settled_balance(500, 12, 10, 100, 3700).unwrap(), (502, 1));
        assert_eq!(settled_balance(500, 12, 10, 100, 28900).unwrap(), (516, 8));
    }

    #[test]
    fn settlement_caps_at_72_hours() {
        for hours in [72, 73, 1000] {
            assert_eq!(
                settled_balance(500, 12, 10, 0, hours * 3600).unwrap(),
                (644, 72)
            );
        }
    }

    #[test]
    fn rent_cannot_make_gold_negative() {
        assert_eq!(settled_balance(1, 0, 10, 0, 3600).unwrap(), (0, 1));
        assert_eq!(settled_balance(0, 2, 10, 0, 3600).unwrap(), (0, 1));
        assert_eq!(settled_balance(10, 0, 10, 0, 3600).unwrap(), (0, 1));
    }

    #[test]
    fn backwards_clock_does_not_charge_or_pay() {
        assert_eq!(settled_balance(500, 12, 10, 100, 99).unwrap(), (500, 0));
        assert_eq!(
            settled_balance(500, 12, 10, i64::MAX, i64::MIN).unwrap(),
            (500, 0)
        );
        assert_eq!(
            settled_balance(500, 12, 10, i64::MIN, i64::MAX).unwrap(),
            (644, 72)
        );
    }

    #[test]
    fn settlement_rejects_overflow() {
        for (gold, income, rent, now) in [
            (u64::MAX, 1, 0, 3600),
            (0, u64::MAX, 0, 7200),
            (0, 0, u64::MAX, 7200),
        ] {
            let error = settled_balance(gold, income, rent, 0, now).unwrap_err();
            match error {
                anchor_lang::error::Error::AnchorError(error) => {
                    assert_eq!(error.error_name, "Overflow");
                }
                _ => panic!("expected Overflow"),
            }
        }
    }
}
