// Content for the FAQ accordion.
export interface FaqEntry {
  id: string;
  question: string;
  answer: string;
}

export const FAQ_ENTRIES: FaqEntry[] = [
  {
    id: 'snatched',
    question: 'What happens if someone snatches my pet?',
    answer:
      "Nothing is lost. The moment a trainer takes over your pet, any $TREAT you had not claimed yet is sent to your wallet automatically, and you receive your original purchase price plus a 10% profit, all in one transaction.",
  },
  {
    id: 'claim',
    question: 'How do I claim my baked $TREAT tokens?',
    answer:
      'Open your pet card and press "Claim". The program calculates exactly how many $TREAT your pet produced since your last claim and transfers them straight from the on-chain Treat Vault to your wallet.',
  },
  {
    id: 'feed',
    question: 'What is the benefit of feeding my pet treats?',
    answer:
      'Feeding costs 500 $TREAT and activates a 24-hour "Snack Boost" that raises your idle production rate by 20% (120 $TREAT per 10 minutes instead of 100). Feed again before it runs out to keep the boost rolling.',
  },
  {
    id: 'browser',
    question: 'Do I have to keep my browser open to produce $TREAT?',
    answer:
      'No. Production is calculated on-chain using the Solana network clock, continuously and pro-rata by the second. You can close your browser entirely and your pet keeps baking $TREAT until you come back to claim it.',
  },
  {
    id: 'mainnet',
    question: 'When will TreatPaws launch on Solana Mainnet?',
    answer:
      'TreatPaws is currently welcoming trainers on Solana Devnet for community testing! You can grab free test SOL from the official faucet to adopt pets and bake treats. Mainnet Launch: TreatPaws will officially migrate to Solana Mainnet within 24 hours of our $TREAT token launch on Pump.fun!',
  },
];
