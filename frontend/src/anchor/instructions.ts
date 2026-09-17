import { BN, type Program } from '@coral-xyz/anchor';
import { ComputeBudgetProgram, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js';
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
} from '@solana/spl-token';
import { TREAT_MINT } from '../data/chain';
import { getAllPetPdas, getGameConfigPda, getPetPda, getVaultPda } from './pda';

const REWARD_MINT = new PublicKey(TREAT_MINT);

/** Compute unit budget for `initialize_game` — it creates 12 accounts in one tx. */
const INITIALIZE_COMPUTE_UNITS = 400_000;

/**
 * Admin-only: creates GameConfig, the Vault token PDA, and all 10 Pet PDAs.
 * `initialPricesLamports[i]` is the starting price (lamports) for Pet #(i+1).
 * Prepends a ComputeBudget instruction because this tx touches far more
 * accounts than the default 200k-unit limit allows.
 */
export async function initializeGame(
  program: Program,
  admin: PublicKey,
  initialPricesLamports: number[],
): Promise<string> {
  const [gameConfig] = getGameConfigPda();
  const [vault] = getVaultPda();
  const petPdas = getAllPetPdas();
  const prices = initialPricesLamports.map((price) => new BN(price));
  const raiseComputeBudget = ComputeBudgetProgram.setComputeUnitLimit({
    units: INITIALIZE_COMPUTE_UNITS,
  });

  return program.methods
    .initializeGame(prices)
    .accounts({
      admin,
      gameConfig,
      rewardMint: REWARD_MINT,
      vault,
      pet1: petPdas[0],
      pet2: petPdas[1],
      pet3: petPdas[2],
      pet4: petPdas[3],
      pet5: petPdas[4],
      pet6: petPdas[5],
      pet7: petPdas[6],
      pet8: petPdas[7],
      pet9: petPdas[8],
      pet10: petPdas[9],
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      rent: SYSVAR_RENT_PUBKEY,
    })
    .preInstructions([raiseComputeBudget])
    .rpc();
}

/** Anyone: deposits `amountRaw` (already scaled by mint decimals) $TREAT into the Vault. */
export async function depositVault(
  program: Program,
  depositor: PublicKey,
  amountRaw: BN | number,
): Promise<string> {
  const [gameConfig] = getGameConfigPda();
  const [vault] = getVaultPda();
  const depositorAta = getAssociatedTokenAddressSync(REWARD_MINT, depositor);

  // The program's DepositVault accounts do not `init_if_needed` the
  // depositor's ATA, so create it client-side first (idempotent = no-op if
  // it already exists).
  const ensureAta = createAssociatedTokenAccountIdempotentInstruction(
    depositor,
    depositorAta,
    depositor,
    REWARD_MINT,
  );

  return program.methods
    .depositVault(new BN(amountRaw))
    .accounts({
      depositor,
      gameConfig,
      rewardMint: REWARD_MINT,
      depositorAta,
      vault,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .preInstructions([ensureAta])
    .rpc();
}

export interface GameConfigPatch {
  feeBasisPoints: number | null;
  priceIncrementBps: number | null;
  baseRewardRate: number | null;
  boostRewardRate: number | null;
  feedCost: number | null;
  renameCost: number | null;
}

/** Admin-only: updates any subset of the economy knobs (null = leave unchanged). */
export async function updateGameConfig(
  program: Program,
  admin: PublicKey,
  patch: GameConfigPatch,
): Promise<string> {
  const [gameConfig] = getGameConfigPda();

  return program.methods
    .updateGameConfig(
      patch.feeBasisPoints,
      patch.priceIncrementBps,
      patch.baseRewardRate === null ? null : new BN(patch.baseRewardRate),
      patch.boostRewardRate === null ? null : new BN(patch.boostRewardRate),
      patch.feedCost === null ? null : new BN(patch.feedCost),
      patch.renameCost === null ? null : new BN(patch.renameCost),
    )
    .accounts({ admin, gameConfig })
    .rpc();
}

/** Buys/snatches a pet by paying exactly its current price in lamports. */
export async function buyPet(
  program: Program,
  buyer: PublicKey,
  petId: number,
  admin: PublicKey,
  previousOwner: PublicKey,
): Promise<string> {
  const [gameConfig] = getGameConfigPda();
  const [vault] = getVaultPda();
  const [pet] = getPetPda(petId);
  // `previous_owner_ata` is `init_if_needed` on-chain (paid by the buyer),
  // so the client only needs to derive the address, not create it.
  const previousOwnerAta = getAssociatedTokenAddressSync(REWARD_MINT, previousOwner);

  return program.methods
    .buyPet(petId)
    .accounts({
      buyer,
      admin,
      previousOwner,
      gameConfig,
      rewardMint: REWARD_MINT,
      pet,
      previousOwnerAta,
      vault,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
}

/** Current owner claims accrued $TREAT for one pet. */
export async function claimCoins(program: Program, owner: PublicKey, petId: number): Promise<string> {
  const [gameConfig] = getGameConfigPda();
  const [vault] = getVaultPda();
  const [pet] = getPetPda(petId);
  // `owner_ata` is also `init_if_needed` on-chain for this instruction.
  const ownerAta = getAssociatedTokenAddressSync(REWARD_MINT, owner);

  return program.methods
    .claimCoins(petId)
    .accounts({
      owner,
      gameConfig,
      rewardMint: REWARD_MINT,
      pet,
      ownerAta,
      vault,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();
}

/** Owner feeds a pet (sinks feed_cost $TREAT) to extend its Snack Boost 24h. */
export async function feedPet(program: Program, owner: PublicKey, petId: number): Promise<string> {
  const [gameConfig] = getGameConfigPda();
  const [vault] = getVaultPda();
  const [pet] = getPetPda(petId);
  const ownerAta = getAssociatedTokenAddressSync(REWARD_MINT, owner);
  // Unlike buy/claim, FeedPet's owner_ata is a plain (non-init) account on
  // chain, so make sure it exists first.
  const ensureAta = createAssociatedTokenAccountIdempotentInstruction(owner, ownerAta, owner, REWARD_MINT);

  return program.methods
    .feedPet(petId)
    .accounts({
      owner,
      gameConfig,
      rewardMint: REWARD_MINT,
      pet,
      ownerAta,
      vault,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .preInstructions([ensureAta])
    .rpc();
}

/** Owner renames a pet (sinks rename_cost $TREAT). */
export async function renamePet(
  program: Program,
  owner: PublicKey,
  petId: number,
  newName: string,
): Promise<string> {
  const [gameConfig] = getGameConfigPda();
  const [vault] = getVaultPda();
  const [pet] = getPetPda(petId);
  const ownerAta = getAssociatedTokenAddressSync(REWARD_MINT, owner);
  const ensureAta = createAssociatedTokenAccountIdempotentInstruction(owner, ownerAta, owner, REWARD_MINT);

  return program.methods
    .renamePet(petId, newName)
    .accounts({
      owner,
      gameConfig,
      rewardMint: REWARD_MINT,
      pet,
      ownerAta,
      vault,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .preInstructions([ensureAta])
    .rpc();
}
