# Idle Pet Game (Solana / Anchor)

A small on-chain idle game: **10 pets**, bought and traded with **SOL**, while idle rewards are paid in an existing SPL token **$GAME** (for example a Pump.fun token whose mint authority is already revoked).

The program **never mints** $GAME. Every reward, feed cost, and rename fee moves tokens in or out of a **Vault PDA token account**.

Copy [`lib.rs`](./lib.rs) into [Solana Playground](https://beta.solpg.io) to compile.

---

## Frontend

The [`frontend/`](./frontend) folder is the official **TreatPaws** landing page (React +
Vite, styled with `animal-island-ui`) — the branded name for this same game, with the
reward token displayed as **$TREAT** instead of the generic `$GAME` used in this
document and in `lib.rs`. They are the same program; only the marketing name differs.
See [`frontend/README.md`](./frontend/README.md) for setup and page-structure notes. It's
a full client, not just a landing page: `/` is the marketing home, `/playpen` is the live
on-chain game hall (buy/claim/feed/rename + Hall of Fame leaderboard), and `/admin` is a
hidden console (initialize, deposit to vault, tune the economy) gated by
`VITE_ADMIN_PUBKEY`.

---

## What each “page” of the on-chain app does

These are the **eight instructions** (the game’s buttons) — see the frontend section
above for the actual UI that calls them:

| Instruction | Who can call it | What it does |
| --- | --- | --- |
| `initialize_game` | First admin wallet | Creates config, vault, and pets 1–10 (default economy values) |
| `update_game_config` | Admin only | Changes fee, price bump, reward rates, feed/rename costs without redeploying |
| `deposit_vault` | Anyone | Sends $GAME into the vault so rewards can be paid |
| `withdraw_vault` | Admin only | Emergency pull of $GAME out of the vault |
| `buy_pet` | Any wallet | Pays the listed SOL price and becomes the new owner |
| `claim_coins` | Current pet owner | Pulls accrued $GAME from the vault |
| `feed_pet` | Current pet owner | Sinks `feed_cost` $GAME; +24h of boosted production |
| `rename_pet` | Current pet owner | Sinks `rename_cost` $GAME; sets a name (max 32 characters) |

---

## Layout / architecture

```
GameConfig PDA          seeds = ["game_config"]
  admin, reward_mint, vault_bump
  fee_basis_points, price_increment_bps
  base_reward_rate, boost_reward_rate, feed_cost, rename_cost
  also: token authority of the vault

Vault token PDA         seeds = ["vault"]
  SPL TokenAccount for $GAME, authority = GameConfig

Pet PDA (×10)           seeds = ["pet", pet_id as 1 byte]
  id, owner, name, current_price (lamports), claim clock, boost clock
```

**Style for a future front-end:** keep it simple HTML/CSS: one card per pet, SOL price on the card, a Claim button, a Feed button, a Rename field. This README is the functional spec until those pages exist.

---

## Economy (how numbers work)

All of these live on **GameConfig** and can be changed after deploy with `update_game_config` (pass `None` for any field you want to leave alone):

| Field | Default | Meaning |
| --- | --- | --- |
| `fee_basis_points` | 300 | 3% of takeover SOL goes to admin |
| `price_increment_bps` | 1000 | Next list price = price × 110% |
| `base_reward_rate` | 100 | Whole $GAME per 10 minutes |
| `boost_reward_rate` | 120 | Whole $GAME per 10 minutes while boosted |
| `feed_cost` | 500 | Whole $GAME sunk to feed |
| `rename_cost` | 100 | Whole $GAME sunk to rename |

- Pets are priced in **lamports** (1 SOL = 1,000,000,000 lamports).
- Idle rate is **pro-rata by the second** using `Clock::get()`. If a boost ends mid-window, only boosted seconds use `boost_reward_rate`.
- Token amounts use the **mint’s decimals**. Pump.fun tokens are usually **6 decimals**, so 100 whole tokens = `100_000_000` raw units (`rate * 10^decimals`).
- Takeover: buyer pays **exactly** `pet.current_price` lamports.
  1. Unclaimed $GAME is sent to the **previous owner** (using current config rates).
  2. `fee_basis_points` of the SOL price goes to **admin**.
  3. The rest of the SOL goes to the **previous owner**.
  4. Price becomes `price * (10000 + price_increment_bps) / 10000`.
  5. Idle clock resets so the new owner starts from zero.

---

## Solana Playground setup

1. Open https://beta.solpg.io and create an **Anchor** project (0.30.x).
2. Replace `src/lib.rs` with this repo’s `lib.rs`.
3. Add crate **`anchor-spl`** version **`0.30.1`** (same as `anchor-lang`).
4. Build once. Copy the generated program ID into `declare_id!(...)`.
5. Build again, then **Deploy** to **Devnet**.
6. If `initialize_game` fails with “compute budget exceeded”, add a compute-budget instruction with a limit around **400_000** units (Playground’s extra-instruction panel, or your client).

### Accounts to pass into `initialize_game`

- `admin` — your wallet (becomes game admin and initial owner of all 10 pets)
- `game_config` — PDA `["game_config"]`
- `reward_mint` — your $GAME mint
- `vault` — PDA `["vault"]` (token account, created by the instruction)
- `pet_1` … `pet_10` — PDAs `["pet", [1]]` … `["pet", [10]]`
- `token_program`, `system_program`, `rent`

`initial_prices` is an array of 10 lamport prices. Example: ten pets at 0.05 SOL:

`[50_000_000, 50_000_000, ...]` (repeat 10 times)

Then call **`deposit_vault`** with a large $GAME amount. Claims will fail with `InsufficientVaultBalance` if the vault is empty.

---

## Front-end notes (later)

- Cluster: Devnet first, then mainnet after audit.
- Derive PDAs with the same seeds as above and the deployed program ID.
- For `buy_pet`, pass the **current owner** wallet as `previous_owner` and that owner’s $GAME ATA.
- Show pending rewards off-chain with the same formula as `calculate_pending_rewards` in `lib.rs`.

---

## Optimization / next steps

- If `initialize_game` is too heavy, split pet creation into a second instruction (not required if compute budget is raised).
- Add a website (HTML/CSS) with 10 pet cards and wallet connect.
- After Pump.fun launch, set `reward_mint` to that mint on **mainnet** (do not reuse the Devnet config account).
- Consider a third-party audit before mainnet deposits of real $GAME.
- Optional: freeze `withdraw_vault` after launch if you want a non-custodial vault (would be a program change).
