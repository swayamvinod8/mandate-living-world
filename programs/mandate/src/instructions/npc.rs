// NPC instructions - owner: Aadharsh
// Account structs are final (they're the interface). Fill in the handler bodies.

use anchor_lang::prelude::*;

use crate::errors::MandateError;
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

    // TODO(Aadharsh): set authority, id, name, greed, loyalty, bond,
    // hired_by = None, bump = ctx.bumps.npc
    let _ = (ctx, id, greed, loyalty, bond);
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

    // TODO(Aadharsh): relationship = { npc, character, trust: npc.loyalty,
    // bond_escrow: npc.bond, betrayed: false, bump: ctx.bumps.relationship }
    // npc.hired_by = Some(character.key())
    // emit!(Hired { npc: npc.key() });
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

    // TODO(Aadharsh): threshold = bond_escrow + trust * TRUST_WEIGHT (checked)
    // require!(offer > threshold, BribeTooSmall)
    // character.gold += bond_escrow (checked); bond_paid = bond_escrow; bond_escrow = 0
    // relationship.betrayed = true; character.flags |= FLAG_BETRAYED_BY_COMPANION
    // npc.hired_by = None
    // emit!(Betrayed { npc: npc.key(), offer, bond_paid });
    let _ = offer;
    Ok(())
}
