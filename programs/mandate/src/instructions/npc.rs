// NPC instructions - owner: Aadharsh
// Account structs are final (they're the interface). Fill in the handler bodies.

use anchor_lang::prelude::*;

use crate::errors::MandateError;
use crate::events::*;
use crate::state::*;

// ---------- create_npc ----------
// Run by the server key (scripts/seed-npcs.ts)

#[derive(Accounts)]
#[instruction(id: u8)]
pub struct CreateNpc<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Npc::INIT_SPACE,
        seeds = [b"npc", authority.key().as_ref(), &[id]],
        bump
    )]
    pub npc: Account<'info, Npc>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn create_npc(
    ctx: Context<CreateNpc>,
    id: u8,
    name: String,
    greed: u8,
    loyalty: u8,
    bond: u64,
) -> Result<()> {
    require!(name.len() <= MAX_NPC_NAME_LEN, MandateError::NameTooLong);

    let npc = &mut ctx.accounts.npc;
    npc.authority = ctx.accounts.authority.key();
    npc.id = id;
    npc.name = name;
    npc.greed = greed;
    npc.loyalty = loyalty;
    npc.bond = bond;
    npc.hired_by = None;
    npc.bump = ctx.bumps.npc;
    Ok(())
}

// ---------- hire ----------
// Player hires an NPC. Creates the Relationship with the bond in escrow.

#[derive(Accounts)]
pub struct Hire<'info> {
    #[account(
        seeds = [b"character", owner.key().as_ref()],
        bump = character.bump,
        has_one = owner
    )]
    pub character: Account<'info, Character>,

    #[account(
        mut,
        seeds = [b"npc", npc.authority.as_ref(), &[npc.id]],
        bump = npc.bump
    )]
    pub npc: Account<'info, Npc>,

    #[account(
        init,
        payer = owner,
        space = 8 + Relationship::INIT_SPACE,
        seeds = [b"rel", npc.key().as_ref(), character.key().as_ref()],
        bump
    )]
    pub relationship: Account<'info, Relationship>,

    #[account(mut)]
    pub owner: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn hire(ctx: Context<Hire>) -> Result<()> {
    require!(ctx.accounts.npc.hired_by.is_none(), MandateError::NpcAlreadyHired);

    let npc_key = ctx.accounts.npc.key();
    let character_key = ctx.accounts.character.key();

    // Trust starts at the NPC's loyalty, and its bond sits in escrow
    let rel = &mut ctx.accounts.relationship;
    rel.npc = npc_key;
    rel.character = character_key;
    rel.trust = ctx.accounts.npc.loyalty;
    rel.bond_escrow = ctx.accounts.npc.bond;
    rel.betrayed = false;
    rel.bump = ctx.bumps.relationship;

    ctx.accounts.npc.hired_by = Some(character_key);

    emit!(Hired { npc: npc_key });
    Ok(())
}

// ---------- bribe_and_betray ----------
// Signed by the server key that controls the NPCs (the rival's offer).

#[derive(Accounts)]
pub struct BribeAndBetray<'info> {
    #[account(
        mut,
        seeds = [b"character", character.owner.as_ref()],
        bump = character.bump
    )]
    pub character: Account<'info, Character>,

    #[account(
        mut,
        seeds = [b"npc", npc.authority.as_ref(), &[npc.id]],
        bump = npc.bump
    )]
    pub npc: Account<'info, Npc>,

    #[account(
        mut,
        seeds = [b"rel", npc.key().as_ref(), character.key().as_ref()],
        bump = relationship.bump,
        has_one = npc,
        has_one = character
    )]
    pub relationship: Account<'info, Relationship>,

    #[account(constraint = rival.key() == npc.authority @ MandateError::Unauthorized)]
    pub rival: Signer<'info>,
}

pub fn bribe_and_betray(ctx: Context<BribeAndBetray>, offer: u64) -> Result<()> {
    require!(!ctx.accounts.relationship.betrayed, MandateError::AlreadyBetrayed);
    require!(
        ctx.accounts.npc.hired_by == Some(ctx.accounts.character.key()),
        MandateError::NpcNotHiredByCharacter
    );

    let rel = &mut ctx.accounts.relationship;

    // The NPC only turns if the offer beats what it would lose by leaving:
    // its bond plus the trust it has built up
    let threshold = (rel.trust as u64)
        .checked_mul(TRUST_WEIGHT)
        .and_then(|t| t.checked_add(rel.bond_escrow))
        .ok_or(MandateError::Overflow)?;
    require!(offer > threshold, MandateError::BribeTooSmall);

    // Slash the bond and pay it to the player
    let bond_paid = rel.bond_escrow;
    let character = &mut ctx.accounts.character;
    character.gold = character
        .gold
        .checked_add(bond_paid)
        .ok_or(MandateError::Overflow)?;
    character.flags |= FLAG_BETRAYED_BY_COMPANION;

    rel.bond_escrow = 0;
    rel.betrayed = true;

    let npc = &mut ctx.accounts.npc;
    npc.hired_by = None;

    emit!(Betrayed {
        npc: npc.key(),
        offer,
        bond_paid,
    });
    Ok(())
}
