import { PublicKey } from '@solana/web3.js';
import { PROGRAM_ID, GENESIS_PET_COUNT } from '../data/chain';

/** The deployed idle_pet_game Anchor program (Devnet). */
export const PROGRAM_PUBKEY = new PublicKey(PROGRAM_ID);

/** GameConfig PDA — seeds = [b"game_config"]. */
export function getGameConfigPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([Buffer.from('game_config')], PROGRAM_PUBKEY);
}

/** Vault token-account PDA — seeds = [b"vault"]. */
export function getVaultPda(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([Buffer.from('vault')], PROGRAM_PUBKEY);
}

/** Pet PDA for a given 1-indexed pet id — seeds = [b"pet", [id]]. */
export function getPetPda(id: number): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([Buffer.from('pet'), Buffer.from([id])], PROGRAM_PUBKEY);
}

/** All 10 genesis Pet PDAs, in id order (index 0 = Pet #1). */
export function getAllPetPdas(): PublicKey[] {
  return Array.from({ length: GENESIS_PET_COUNT }, (_, index) => getPetPda(index + 1)[0]);
}
