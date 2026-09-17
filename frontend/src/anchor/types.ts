import type { BN } from '@coral-xyz/anchor';
import type { PublicKey } from '@solana/web3.js';

// Raw shapes as decoded by Anchor from the on-chain accounts (see
// src/idl/pet_game.json). BN fields are big numbers because they're u64/i64
// on-chain — the *View types below convert them to plain JS numbers, which
// is safe here because none of these values (lamport prices, unix
// timestamps, small reward rates) ever approach Number.MAX_SAFE_INTEGER.

export interface GameConfigRaw {
  admin: PublicKey;
  rewardMint: PublicKey;
  vaultBump: number;
  feeBasisPoints: number;
  priceIncrementBps: number;
  baseRewardRate: BN;
  boostRewardRate: BN;
  feedCost: BN;
  renameCost: BN;
}

export interface PetRaw {
  id: number;
  owner: PublicKey;
  isInitialized: boolean;
  name: string;
  currentPrice: BN;
  lastClaimTimestamp: BN;
  boostUntilTimestamp: BN;
}

/** UI-friendly GameConfig with BN fields converted to numbers. */
export interface GameConfigView {
  admin: string;
  rewardMint: string;
  vaultBump: number;
  feeBasisPoints: number;
  priceIncrementBps: number;
  baseRewardRate: number;
  boostRewardRate: number;
  feedCost: number;
  renameCost: number;
}

/** UI-friendly Pet with BN fields converted to numbers + its PDA address. */
export interface PetView {
  pda: string;
  id: number;
  owner: string;
  isInitialized: boolean;
  name: string;
  currentPriceLamports: number;
  lastClaimTimestamp: number;
  boostUntilTimestamp: number;
}

export function toGameConfigView(raw: GameConfigRaw): GameConfigView {
  return {
    admin: raw.admin.toBase58(),
    rewardMint: raw.rewardMint.toBase58(),
    vaultBump: raw.vaultBump,
    feeBasisPoints: raw.feeBasisPoints,
    priceIncrementBps: raw.priceIncrementBps,
    baseRewardRate: raw.baseRewardRate.toNumber(),
    boostRewardRate: raw.boostRewardRate.toNumber(),
    feedCost: raw.feedCost.toNumber(),
    renameCost: raw.renameCost.toNumber(),
  };
}

export function toPetView(raw: PetRaw, pda: string): PetView {
  return {
    pda,
    id: raw.id,
    owner: raw.owner.toBase58(),
    isInitialized: raw.isInitialized,
    name: raw.name,
    currentPriceLamports: raw.currentPrice.toNumber(),
    lastClaimTimestamp: raw.lastClaimTimestamp.toNumber(),
    boostUntilTimestamp: raw.boostUntilTimestamp.toNumber(),
  };
}
