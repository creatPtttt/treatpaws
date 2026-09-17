//! Idle Pet Game — Anchor 0.30 program for Solana Playground (beta.solpg.io).
//!
//! Paste this entire file into Playground as `lib.rs`.
//! After the first build, replace `declare_id!` with the ID Playground generates.
//! In Playground → Tools / Crates, add: `anchor-spl` version `0.30.1`.
//!
//! Reward token ($GAME) mint authority is revoked. All payouts come from a
//! program-owned Vault PDA token account (no minting).

use anchor_lang::prelude::*;
use anchor_lang::system_program;
use anchor_spl::associated_token::AssociatedToken;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/// Number of pets created at game start (IDs 1 through 10).
pub const PET_COUNT: u8 = 10;
/// Production interval in seconds (10 minutes). Rates in GameConfig are "tokens per this interval".
pub const INTERVAL_SECONDS: i64 = 600;
/// Boost extension in seconds (24 hours).
pub const BOOST_DURATION_SECONDS: i64 = 86_400;
/// Maximum pet name length in bytes.
pub const MAX_NAME_LEN: usize = 32;
/// Default protocol fee: 3.00%.
pub const DEFAULT_FEE_BPS: u16 = 300;
/// Default takeover price bump: 10.00%.
pub const DEFAULT_PRICE_INCREMENT_BPS: u16 = 1_000;
/// Default base idle rate (whole $GAME per 10 minutes).
pub const DEFAULT_BASE_REWARD_RATE: u64 = 100;
/// Default boosted idle rate (whole $GAME per 10 minutes).
pub const DEFAULT_BOOST_REWARD_RATE: u64 = 120;
/// Default feed cost (whole $GAME, scaled by mint decimals on use).
pub const DEFAULT_FEED_COST: u64 = 500;
/// Default rename cost (whole $GAME, scaled by mint decimals on use).
pub const DEFAULT_RENAME_COST: u64 = 100;
/// Basis-point denominator (100% = 10_000).
pub const BPS_DENOMINATOR: u64 = 10_000;

// ---------------------------------------------------------------------------
// Program
// ---------------------------------------------------------------------------

#[program]
pub mod idle_pet_game {
    use super::*;

    /// Admin initializes GameConfig, the Vault PDA token account, and 10 pets.
    /// `initial_prices` are in lamports, index 0 = pet ID 1, index 9 = pet ID 10.
    pub fn initialize_game(
        ctx: Context<InitializeGame>,
        initial_prices: [u64; 10],
    ) -> Result<()> {
        // Reject a zero price so takeovers always require a real SOL payment.
        for price in initial_prices.iter() {
            require!(*price > 0, GameError::InvalidPrice);
        }

        let now = Clock::get()?.unix_timestamp;
        let admin_key = ctx.accounts.admin.key();
        let vault_bump = ctx.bumps.vault;

        // Persist global config (admin, $GAME mint, vault bump, fee knobs).
        let config = &mut ctx.accounts.game_config;
        config.admin = admin_key;
        config.reward_mint = ctx.accounts.reward_mint.key();
        config.vault_bump = vault_bump;
        config.fee_basis_points = DEFAULT_FEE_BPS;
        config.price_increment_bps = DEFAULT_PRICE_INCREMENT_BPS;
        config.base_reward_rate = DEFAULT_BASE_REWARD_RATE;
        config.boost_reward_rate = DEFAULT_BOOST_REWARD_RATE;
        config.feed_cost = DEFAULT_FEED_COST;
        config.rename_cost = DEFAULT_RENAME_COST;

        // Initialize each pet PDA with default name "Pet #N" and admin as owner.
        init_pet_state(&mut ctx.accounts.pet_1, 1, admin_key, initial_prices[0], now);
        init_pet_state(&mut ctx.accounts.pet_2, 2, admin_key, initial_prices[1], now);
        init_pet_state(&mut ctx.accounts.pet_3, 3, admin_key, initial_prices[2], now);
        init_pet_state(&mut ctx.accounts.pet_4, 4, admin_key, initial_prices[3], now);
        init_pet_state(&mut ctx.accounts.pet_5, 5, admin_key, initial_prices[4], now);
        init_pet_state(&mut ctx.accounts.pet_6, 6, admin_key, initial_prices[5], now);
        init_pet_state(&mut ctx.accounts.pet_7, 7, admin_key, initial_prices[6], now);
        init_pet_state(&mut ctx.accounts.pet_8, 8, admin_key, initial_prices[7], now);
        init_pet_state(&mut ctx.accounts.pet_9, 9, admin_key, initial_prices[8], now);
        init_pet_state(&mut ctx.accounts.pet_10, 10, admin_key, initial_prices[9], now);

        msg!("Game initialized. Vault bump: {}", vault_bump);
        Ok(())
    }

    /// Anyone can fund the vault with $GAME so idle rewards can be paid out.
    pub fn deposit_vault(ctx: Context<DepositVault>, amount: u64) -> Result<()> {
        require!(amount > 0, GameError::InvalidAmount);

        // User ATA -> Vault PDA (no PDA signer; the depositor is the authority).
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.depositor_ata.to_account_info(),
                    to: ctx.accounts.vault.to_account_info(),
                    authority: ctx.accounts.depositor.to_account_info(),
                },
            ),
            amount,
        )?;

        msg!("Deposited {} raw $GAME into vault", amount);
        Ok(())
    }

    /// Admin emergency withdrawal of $GAME from the vault to the admin ATA.
    pub fn withdraw_vault(ctx: Context<WithdrawVault>, amount: u64) -> Result<()> {
        require!(amount > 0, GameError::InvalidAmount);
        require!(
            ctx.accounts.vault.amount >= amount,
            GameError::InsufficientVaultBalance
        );

        // Vault PDA -> admin ATA, signed by the GameConfig PDA (token authority).
        let bump = ctx.bumps.game_config;
        let bump_seed = [bump];
        let signer_seeds: &[&[&[u8]]] = &[&[b"game_config".as_ref(), bump_seed.as_ref()]];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.vault.to_account_info(),
                    to: ctx.accounts.admin_ata.to_account_info(),
                    authority: ctx.accounts.game_config.to_account_info(),
                },
                signer_seeds,
            ),
            amount,
        )?;

        msg!("Admin withdrew {} raw $GAME from vault", amount);
        Ok(())
    }

    /// Admin updates any subset of economy knobs. `None` leaves a field unchanged.
    pub fn update_game_config(
        ctx: Context<UpdateGameConfig>,
        fee_basis_points: Option<u16>,
        price_increment_bps: Option<u16>,
        base_reward_rate: Option<u64>,
        boost_reward_rate: Option<u64>,
        feed_cost: Option<u64>,
        rename_cost: Option<u64>,
    ) -> Result<()> {
        let config = &mut ctx.accounts.game_config;

        if let Some(fee) = fee_basis_points {
            require!(fee as u64 <= BPS_DENOMINATOR, GameError::InvalidFee);
            config.fee_basis_points = fee;
        }
        if let Some(increment) = price_increment_bps {
            config.price_increment_bps = increment;
        }
        if let Some(rate) = base_reward_rate {
            config.base_reward_rate = rate;
        }
        if let Some(rate) = boost_reward_rate {
            config.boost_reward_rate = rate;
        }
        if let Some(cost) = feed_cost {
            config.feed_cost = cost;
        }
        if let Some(cost) = rename_cost {
            config.rename_cost = cost;
        }

        msg!(
            "Config updated: fee_bps={} inc_bps={} base={} boost={} feed={} rename={}",
            config.fee_basis_points,
            config.price_increment_bps,
            config.base_reward_rate,
            config.boost_reward_rate,
            config.feed_cost,
            config.rename_cost
        );
        Ok(())
    }

    /// Buy / take over a pet by paying exactly `pet.current_price` lamports.
    /// Pending $GAME is paid to the previous owner first, then SOL is split
    /// into protocol fee + previous-owner proceeds, then the price is bumped.
    pub fn buy_pet(ctx: Context<BuyPet>, pet_id: u8) -> Result<()> {
        validate_pet_id(pet_id)?;

        let now = Clock::get()?.unix_timestamp;
        let buyer_key = ctx.accounts.buyer.key();
        let previous_owner_key = ctx.accounts.pet.owner;

        require!(
            buyer_key != previous_owner_key,
            GameError::AlreadyOwner
        );
        require!(
            ctx.accounts.previous_owner.key() == previous_owner_key,
            GameError::Unauthorized
        );

        let price = ctx.accounts.pet.current_price;
        require!(price > 0, GameError::InvalidPrice);

        // Buyer must have at least the listed price in lamports (exact spend below).
        require!(
            ctx.accounts.buyer.lamports() >= price,
            GameError::InsufficientPayment
        );

        // Pay out unclaimed idle rewards so the seller does not lose earnings.
        let pending = calculate_pending_rewards(
            ctx.accounts.pet.last_claim_timestamp,
            ctx.accounts.pet.boost_until_timestamp,
            now,
            ctx.accounts.reward_mint.decimals,
            ctx.accounts.game_config.base_reward_rate,
            ctx.accounts.game_config.boost_reward_rate,
        )?;
        if pending > 0 {
            require!(
                ctx.accounts.vault.amount >= pending,
                GameError::InsufficientVaultBalance
            );
            transfer_from_vault(
                &ctx.accounts.token_program,
                &ctx.accounts.vault,
                &ctx.accounts.previous_owner_ata,
                &ctx.accounts.game_config.to_account_info(),
                ctx.bumps.game_config,
                pending,
            )?;
        }

        // Protocol fee in lamports, remainder goes to the previous owner.
        let fee_bps = ctx.accounts.game_config.fee_basis_points as u64;
        require!(fee_bps <= BPS_DENOMINATOR, GameError::InvalidFee);

        let fee = price
            .checked_mul(fee_bps)
            .ok_or(GameError::Overflow)?
            .checked_div(BPS_DENOMINATOR)
            .ok_or(GameError::Overflow)?;
        let to_seller = price.checked_sub(fee).ok_or(GameError::Overflow)?;

        // Exact spend of `price` lamports (Solana equivalent of msg.value == price).
        // Skip a self-transfer if the buyer is also the admin (System Program rejects A→A).
        if fee > 0 && ctx.accounts.buyer.key() != ctx.accounts.admin.key() {
            system_program::transfer(
                CpiContext::new(
                    ctx.accounts.system_program.to_account_info(),
                    system_program::Transfer {
                        from: ctx.accounts.buyer.to_account_info(),
                        to: ctx.accounts.admin.to_account_info(),
                    },
                ),
                fee,
            )?;
        }
        if to_seller > 0 {
            system_program::transfer(
                CpiContext::new(
                    ctx.accounts.system_program.to_account_info(),
                    system_program::Transfer {
                        from: ctx.accounts.buyer.to_account_info(),
                        to: ctx.accounts.previous_owner.to_account_info(),
                    },
                ),
                to_seller,
            )?;
        }

        // Transfer ownership, bump the next takeover price, reset the idle clock.
        let increment_bps = ctx.accounts.game_config.price_increment_bps as u128;
        let new_price = (price as u128)
            .checked_mul(
                (BPS_DENOMINATOR as u128)
                    .checked_add(increment_bps)
                    .ok_or(GameError::Overflow)?,
            )
            .ok_or(GameError::Overflow)?
            .checked_div(BPS_DENOMINATOR as u128)
            .ok_or(GameError::Overflow)?;
        require!(new_price <= u64::MAX as u128, GameError::Overflow);

        let pet = &mut ctx.accounts.pet;
        pet.owner = buyer_key;
        pet.current_price = new_price as u64;
        pet.last_claim_timestamp = now;

        msg!(
            "Pet {} bought for {} lamports. Next price: {}",
            pet_id,
            price,
            pet.current_price
        );
        Ok(())
    }

    /// Current owner claims accrued $GAME from the vault (pro-rata by seconds).
    pub fn claim_coins(ctx: Context<ClaimCoins>, pet_id: u8) -> Result<()> {
        validate_pet_id(pet_id)?;
        require!(
            ctx.accounts.owner.key() == ctx.accounts.pet.owner,
            GameError::Unauthorized
        );

        let now = Clock::get()?.unix_timestamp;
        let amount = calculate_pending_rewards(
            ctx.accounts.pet.last_claim_timestamp,
            ctx.accounts.pet.boost_until_timestamp,
            now,
            ctx.accounts.reward_mint.decimals,
            ctx.accounts.game_config.base_reward_rate,
            ctx.accounts.game_config.boost_reward_rate,
        )?;
        require!(amount > 0, GameError::NothingToClaim);
        require!(
            ctx.accounts.vault.amount >= amount,
            GameError::InsufficientVaultBalance
        );

        transfer_from_vault(
            &ctx.accounts.token_program,
            &ctx.accounts.vault,
            &ctx.accounts.owner_ata,
            &ctx.accounts.game_config.to_account_info(),
            ctx.bumps.game_config,
            amount,
        )?;

        ctx.accounts.pet.last_claim_timestamp = now;
        msg!("Claimed {} raw $GAME for pet {}", amount, pet_id);
        Ok(())
    }

    /// Owner spends `GameConfig.feed_cost` $GAME (sink into the vault) to extend boost 24h.
    pub fn feed_pet(ctx: Context<FeedPet>, pet_id: u8) -> Result<()> {
        validate_pet_id(pet_id)?;
        require!(
            ctx.accounts.owner.key() == ctx.accounts.pet.owner,
            GameError::Unauthorized
        );

        let cost = whole_tokens_to_raw(
            ctx.accounts.game_config.feed_cost,
            ctx.accounts.reward_mint.decimals,
        )?;
        require!(
            ctx.accounts.owner_ata.amount >= cost,
            GameError::InsufficientTokenBalance
        );

        // Owner ATA -> Vault (sink). Skip CPI when admin set feed_cost to 0.
        if cost > 0 {
            token::transfer(
                CpiContext::new(
                    ctx.accounts.token_program.to_account_info(),
                    Transfer {
                        from: ctx.accounts.owner_ata.to_account_info(),
                        to: ctx.accounts.vault.to_account_info(),
                        authority: ctx.accounts.owner.to_account_info(),
                    },
                ),
                cost,
            )?;
        }

        let now = Clock::get()?.unix_timestamp;
        let pet = &mut ctx.accounts.pet;
        let base = core::cmp::max(now, pet.boost_until_timestamp);
        pet.boost_until_timestamp = base
            .checked_add(BOOST_DURATION_SECONDS)
            .ok_or(GameError::Overflow)?;

        msg!(
            "Pet {} fed. Boost until {}",
            pet_id,
            pet.boost_until_timestamp
        );
        Ok(())
    }

    /// Owner renames a pet (max 32 bytes) and pays `GameConfig.rename_cost` $GAME.
    pub fn rename_pet(ctx: Context<RenamePet>, pet_id: u8, new_name: String) -> Result<()> {
        validate_pet_id(pet_id)?;
        require!(
            ctx.accounts.owner.key() == ctx.accounts.pet.owner,
            GameError::Unauthorized
        );
        require!(new_name.len() <= MAX_NAME_LEN, GameError::NameTooLong);
        require!(!new_name.is_empty(), GameError::NameTooLong);

        let cost = whole_tokens_to_raw(
            ctx.accounts.game_config.rename_cost,
            ctx.accounts.reward_mint.decimals,
        )?;
        require!(
            ctx.accounts.owner_ata.amount >= cost,
            GameError::InsufficientTokenBalance
        );

        // Skip CPI when admin set rename_cost to 0.
        if cost > 0 {
            token::transfer(
                CpiContext::new(
                    ctx.accounts.token_program.to_account_info(),
                    Transfer {
                        from: ctx.accounts.owner_ata.to_account_info(),
                        to: ctx.accounts.vault.to_account_info(),
                        authority: ctx.accounts.owner.to_account_info(),
                    },
                ),
                cost,
            )?;
        }

        ctx.accounts.pet.name = new_name;
        msg!("Pet {} renamed", pet_id);
        Ok(())
    }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

fn validate_pet_id(pet_id: u8) -> Result<()> {
    require!(pet_id >= 1 && pet_id <= PET_COUNT, GameError::InvalidPetId);
    Ok(())
}

fn init_pet_state(pet: &mut Pet, id: u8, owner: Pubkey, price: u64, now: i64) {
    pet.id = id;
    pet.owner = owner;
    pet.is_initialized = true;
    pet.name = format!("Pet #{}", id);
    pet.current_price = price;
    pet.last_claim_timestamp = now;
    pet.boost_until_timestamp = 0;
}

/// Convert whole token units to raw amount using the mint's decimals.
fn whole_tokens_to_raw(whole: u64, decimals: u8) -> Result<u64> {
    let scale = 10u64
        .checked_pow(decimals as u32)
        .ok_or(GameError::Overflow)?;
    whole.checked_mul(scale).ok_or(GameError::Overflow.into())
}

/// Pro-rata idle rewards using GameConfig rates (whole tokens per 10 minutes).
/// Boosted seconds use `boost_rate`; the rest use `base_rate`. Scaled by mint decimals.
/// `boost_until == 0` means no boost is active.
fn calculate_pending_rewards(
    last_claim: i64,
    boost_until: i64,
    now: i64,
    decimals: u8,
    base_rate: u64,
    boost_rate: u64,
) -> Result<u64> {
    require!(now >= last_claim, GameError::InvalidTimestamp);
    let elapsed = now.checked_sub(last_claim).ok_or(GameError::Overflow)?;
    if elapsed == 0 {
        return Ok(0);
    }

    // Seconds of this claim window that overlap an active boost.
    let boosted_seconds: i64 = if boost_until > last_claim {
        let boost_end = core::cmp::min(boost_until, now);
        core::cmp::max(0, boost_end.checked_sub(last_claim).ok_or(GameError::Overflow)?)
    } else {
        0
    };
    let regular_seconds = elapsed
        .checked_sub(boosted_seconds)
        .ok_or(GameError::Overflow)?;

    let scale = 10u64
        .checked_pow(decimals as u32)
        .ok_or(GameError::Overflow)? as u128;
    let interval = INTERVAL_SECONDS as u128;

    let boosted_raw = (boost_rate as u128)
        .checked_mul(scale)
        .ok_or(GameError::Overflow)?
        .checked_mul(boosted_seconds as u128)
        .ok_or(GameError::Overflow)?
        .checked_div(interval)
        .ok_or(GameError::Overflow)?;

    let regular_raw = (base_rate as u128)
        .checked_mul(scale)
        .ok_or(GameError::Overflow)?
        .checked_mul(regular_seconds as u128)
        .ok_or(GameError::Overflow)?
        .checked_div(interval)
        .ok_or(GameError::Overflow)?;

    let total = boosted_raw
        .checked_add(regular_raw)
        .ok_or(GameError::Overflow)?;
    require!(total <= u64::MAX as u128, GameError::Overflow);
    Ok(total as u64)
}

fn transfer_from_vault<'info>(
    token_program: &Program<'info, Token>,
    vault: &Account<'info, TokenAccount>,
    destination: &Account<'info, TokenAccount>,
    config_authority: &AccountInfo<'info>,
    config_bump: u8,
    amount: u64,
) -> Result<()> {
    let bump_seed = [config_bump];
    let signer_seeds: &[&[&[u8]]] = &[&[b"game_config".as_ref(), bump_seed.as_ref()]];
    token::transfer(
        CpiContext::new_with_signer(
            token_program.to_account_info(),
            Transfer {
                from: vault.to_account_info(),
                to: destination.to_account_info(),
                authority: config_authority.clone(),
            },
            signer_seeds,
        ),
        amount,
    )
}

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------

#[derive(Accounts)]
pub struct InitializeGame<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    /// Global config PDA. Token authority of the vault.
    #[account(
        init,
        payer = admin,
        space = 8 + GameConfig::INIT_SPACE,
        seeds = [b"game_config".as_ref()],
        bump
    )]
    pub game_config: Account<'info, GameConfig>,

    /// Existing $GAME mint (Pump.fun / SPL). Mint authority is expected to be revoked.
    pub reward_mint: Account<'info, Mint>,

    /// Program-controlled vault token account (PDA). Holds all $GAME rewards.
    #[account(
        init,
        payer = admin,
        seeds = [b"vault".as_ref()],
        bump,
        token::mint = reward_mint,
        token::authority = game_config
    )]
    pub vault: Account<'info, TokenAccount>,

    #[account(
        init,
        payer = admin,
        space = 8 + Pet::INIT_SPACE,
        seeds = [b"pet".as_ref(), &[1u8].as_ref()],
        bump
    )]
    pub pet_1: Account<'info, Pet>,
    #[account(
        init,
        payer = admin,
        space = 8 + Pet::INIT_SPACE,
        seeds = [b"pet".as_ref(), &[2u8].as_ref()],
        bump
    )]
    pub pet_2: Account<'info, Pet>,
    #[account(
        init,
        payer = admin,
        space = 8 + Pet::INIT_SPACE,
        seeds = [b"pet".as_ref(), &[3u8].as_ref()],
        bump
    )]
    pub pet_3: Account<'info, Pet>,
    #[account(
        init,
        payer = admin,
        space = 8 + Pet::INIT_SPACE,
        seeds = [b"pet".as_ref(), &[4u8].as_ref()],
        bump
    )]
    pub pet_4: Account<'info, Pet>,
    #[account(
        init,
        payer = admin,
        space = 8 + Pet::INIT_SPACE,
        seeds = [b"pet".as_ref(), &[5u8].as_ref()],
        bump
    )]
    pub pet_5: Account<'info, Pet>,
    #[account(
        init,
        payer = admin,
        space = 8 + Pet::INIT_SPACE,
        seeds = [b"pet".as_ref(), &[6u8].as_ref()],
        bump
    )]
    pub pet_6: Account<'info, Pet>,
    #[account(
        init,
        payer = admin,
        space = 8 + Pet::INIT_SPACE,
        seeds = [b"pet".as_ref(), &[7u8].as_ref()],
        bump
    )]
    pub pet_7: Account<'info, Pet>,
    #[account(
        init,
        payer = admin,
        space = 8 + Pet::INIT_SPACE,
        seeds = [b"pet".as_ref(), &[8u8].as_ref()],
        bump
    )]
    pub pet_8: Account<'info, Pet>,
    #[account(
        init,
        payer = admin,
        space = 8 + Pet::INIT_SPACE,
        seeds = [b"pet".as_ref(), &[9u8].as_ref()],
        bump
    )]
    pub pet_9: Account<'info, Pet>,
    #[account(
        init,
        payer = admin,
        space = 8 + Pet::INIT_SPACE,
        seeds = [b"pet".as_ref(), &[10u8].as_ref()],
        bump
    )]
    pub pet_10: Account<'info, Pet>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct DepositVault<'info> {
    pub depositor: Signer<'info>,

    #[account(
        seeds = [b"game_config".as_ref()],
        bump,
        has_one = reward_mint
    )]
    pub game_config: Account<'info, GameConfig>,

    pub reward_mint: Account<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = reward_mint,
        associated_token::authority = depositor
    )]
    pub depositor_ata: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [b"vault".as_ref()],
        bump = game_config.vault_bump,
        token::mint = reward_mint,
        token::authority = game_config
    )]
    pub vault: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct WithdrawVault<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        seeds = [b"game_config".as_ref()],
        bump,
        has_one = admin,
        has_one = reward_mint
    )]
    pub game_config: Account<'info, GameConfig>,

    pub reward_mint: Account<'info, Mint>,

    #[account(
        mut,
        associated_token::mint = reward_mint,
        associated_token::authority = admin
    )]
    pub admin_ata: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [b"vault".as_ref()],
        bump = game_config.vault_bump,
        token::mint = reward_mint,
        token::authority = game_config
    )]
    pub vault: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct UpdateGameConfig<'info> {
    pub admin: Signer<'info>,

    #[account(
        mut,
        seeds = [b"game_config".as_ref()],
        bump,
        has_one = admin @ GameError::Unauthorized
    )]
    pub game_config: Account<'info, GameConfig>,
}

#[derive(Accounts)]
#[instruction(pet_id: u8)]
pub struct BuyPet<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,

    /// CHECK: must match `game_config.admin`; receives the protocol SOL fee.
    #[account(mut, address = game_config.admin)]
    pub admin: UncheckedAccount<'info>,

    /// CHECK: must match current `pet.owner`; receives remaining SOL + pending $GAME.
    #[account(mut, address = pet.owner)]
    pub previous_owner: UncheckedAccount<'info>,

    #[account(
        seeds = [b"game_config".as_ref()],
        bump,
        has_one = reward_mint
    )]
    pub game_config: Account<'info, GameConfig>,

    pub reward_mint: Account<'info, Mint>,

    #[account(
        mut,
        seeds = [b"pet".as_ref(), pet_id.to_le_bytes().as_ref()],
        bump,
        constraint = pet.is_initialized @ GameError::PetNotInitialized,
        constraint = pet.id == pet_id @ GameError::InvalidPetId
    )]
    pub pet: Account<'info, Pet>,

    #[account(
        init_if_needed,
        payer = buyer,
        associated_token::mint = reward_mint,
        associated_token::authority = previous_owner
    )]
    pub previous_owner_ata: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [b"vault".as_ref()],
        bump = game_config.vault_bump,
        token::mint = reward_mint,
        token::authority = game_config
    )]
    pub vault: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(pet_id: u8)]
pub struct ClaimCoins<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    #[account(
        seeds = [b"game_config".as_ref()],
        bump,
        has_one = reward_mint
    )]
    pub game_config: Account<'info, GameConfig>,

    pub reward_mint: Account<'info, Mint>,

    #[account(
        mut,
        seeds = [b"pet".as_ref(), pet_id.to_le_bytes().as_ref()],
        bump,
        constraint = pet.is_initialized @ GameError::PetNotInitialized,
        constraint = pet.id == pet_id @ GameError::InvalidPetId,
        constraint = pet.owner == owner.key() @ GameError::Unauthorized
    )]
    pub pet: Account<'info, Pet>,

    #[account(
        init_if_needed,
        payer = owner,
        associated_token::mint = reward_mint,
        associated_token::authority = owner
    )]
    pub owner_ata: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [b"vault".as_ref()],
        bump = game_config.vault_bump,
        token::mint = reward_mint,
        token::authority = game_config
    )]
    pub vault: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(pet_id: u8)]
pub struct FeedPet<'info> {
    pub owner: Signer<'info>,

    #[account(
        seeds = [b"game_config".as_ref()],
        bump,
        has_one = reward_mint
    )]
    pub game_config: Account<'info, GameConfig>,

    pub reward_mint: Account<'info, Mint>,

    #[account(
        mut,
        seeds = [b"pet".as_ref(), pet_id.to_le_bytes().as_ref()],
        bump,
        constraint = pet.is_initialized @ GameError::PetNotInitialized,
        constraint = pet.id == pet_id @ GameError::InvalidPetId,
        constraint = pet.owner == owner.key() @ GameError::Unauthorized
    )]
    pub pet: Account<'info, Pet>,

    #[account(
        mut,
        associated_token::mint = reward_mint,
        associated_token::authority = owner
    )]
    pub owner_ata: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [b"vault".as_ref()],
        bump = game_config.vault_bump,
        token::mint = reward_mint,
        token::authority = game_config
    )]
    pub vault: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
#[instruction(pet_id: u8)]
pub struct RenamePet<'info> {
    pub owner: Signer<'info>,

    #[account(
        seeds = [b"game_config".as_ref()],
        bump,
        has_one = reward_mint
    )]
    pub game_config: Account<'info, GameConfig>,

    pub reward_mint: Account<'info, Mint>,

    #[account(
        mut,
        seeds = [b"pet".as_ref(), pet_id.to_le_bytes().as_ref()],
        bump,
        constraint = pet.is_initialized @ GameError::PetNotInitialized,
        constraint = pet.id == pet_id @ GameError::InvalidPetId,
        constraint = pet.owner == owner.key() @ GameError::Unauthorized
    )]
    pub pet: Account<'info, Pet>,

    #[account(
        mut,
        associated_token::mint = reward_mint,
        associated_token::authority = owner
    )]
    pub owner_ata: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [b"vault".as_ref()],
        bump = game_config.vault_bump,
        token::mint = reward_mint,
        token::authority = game_config
    )]
    pub vault: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

#[account]
#[derive(InitSpace)]
pub struct GameConfig {
    /// Privileged wallet (initializer). Receives SOL fees and vault withdrawals.
    pub admin: Pubkey,
    /// $GAME SPL mint address.
    pub reward_mint: Pubkey,
    /// Bump for the vault token PDA (`seeds = [b"vault".as_ref()]`).
    pub vault_bump: u8,
    /// Takeover fee in basis points (300 = 3%). Tunable via `update_game_config`.
    pub fee_basis_points: u16,
    /// Price increase after each takeover (1000 = 10%). Tunable via `update_game_config`.
    pub price_increment_bps: u16,
    /// Whole $GAME tokens earned per 10 minutes (unboosted). Scaled by mint decimals.
    pub base_reward_rate: u64,
    /// Whole $GAME tokens earned per 10 minutes while boosted. Scaled by mint decimals.
    pub boost_reward_rate: u64,
    /// Whole $GAME tokens sunk into the vault to feed. Scaled by mint decimals.
    pub feed_cost: u64,
    /// Whole $GAME tokens sunk into the vault to rename. Scaled by mint decimals.
    pub rename_cost: u64,
}

#[account]
#[derive(InitSpace)]
pub struct Pet {
    pub id: u8,
    pub owner: Pubkey,
    pub is_initialized: bool,
    #[max_len(32)]
    pub name: String,
    /// Listed takeover price in lamports.
    pub current_price: u64,
    pub last_claim_timestamp: i64,
    /// Unix timestamp when 1.2x boost ends; 0 means inactive.
    pub boost_until_timestamp: i64,
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

#[error_code]
pub enum GameError {
    #[msg("Unauthorized: signer is not allowed to perform this action")]
    Unauthorized,
    #[msg("Invalid pet id: must be between 1 and 10")]
    InvalidPetId,
    #[msg("Insufficient payment: buyer must pay the exact current price in lamports")]
    InsufficientPayment,
    #[msg("Name too long or empty: name must be 1 to 32 bytes")]
    NameTooLong,
    #[msg("Buyer already owns this pet")]
    AlreadyOwner,
    #[msg("Vault does not hold enough $GAME to pay this reward")]
    InsufficientVaultBalance,
    #[msg("Owner token account does not hold enough $GAME")]
    InsufficientTokenBalance,
    #[msg("No rewards to claim yet")]
    NothingToClaim,
    #[msg("Arithmetic overflow")]
    Overflow,
    #[msg("Pet account is not initialized")]
    PetNotInitialized,
    #[msg("Amount must be greater than zero")]
    InvalidAmount,
    #[msg("Initial or current price must be greater than zero")]
    InvalidPrice,
    #[msg("Fee basis points cannot exceed 10000")]
    InvalidFee,
    #[msg("Clock timestamp is invalid relative to last claim")]
    InvalidTimestamp,
}
