use anchor_lang::prelude::*;

#[error_code]
pub enum MandateError {
    #[msg("Class must be 0-3 (Warrior, Rogue, Merchant, Paladin)")]
    InvalidClass,
    #[msg("NPC name is too long")]
    NameTooLong,
    #[msg("Only the NPC authority can do this")]
    Unauthorized,
    #[msg("This NPC is already hired")]
    NpcAlreadyHired,
    #[msg("This NPC is not hired by this character")]
    NpcNotHiredByCharacter,
    #[msg("This companion already betrayed you")]
    AlreadyBetrayed,
    #[msg("Bribe must be larger than bond plus trust")]
    BribeTooSmall,
    #[msg("Event conditions not met")]
    EventConditionsNotMet,
    #[msg("Math overflow")]
    Overflow,
}
