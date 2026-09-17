# TreatPaws — Frontend

The official web app for **TreatPaws**, a cozy Web3 idle pet game on **Solana Devnet**.
Trainers adopt 1 of 10 genesis pixel pets, idle-harvest the **$TREAT** SPL token every
10 minutes, feed pets for a temporary boost, or snatch someone else's pet for a takeover
profit.

Built with **React + TypeScript + Vite**, styled entirely with the
[`animal-island-ui`](https://github.com/guokaigdg/animal-island-ui) component library
(warm cream/caramel/mint palette, pill buttons, 3D pressed-button shadows), and wired to
the deployed Anchor program via `@coral-xyz/anchor` + `@solana/web3.js`.

---

## Run it locally

```bash
cd frontend
npm install
npm run dev
```

Then open the URL Vite prints (usually `http://localhost:5173`).

```bash
npm run build     # type-check + production build into dist/
npm run preview   # preview the production build locally
```

You will need [Phantom](https://phantom.app/) (or another Solana wallet) installed in
your browser, switched to **Devnet**, with some Devnet SOL (use a faucet) to actually
send transactions.

### Configure the admin wallet

Copy `.env.example` to `.env` and set `VITE_ADMIN_PUBKEY` to the wallet address that
should be allowed to open the hidden `/admin` console:

```bash
cp .env.example .env
# then edit .env:
VITE_ADMIN_PUBKEY=<your wallet's base58 address>
```

Restart `npm run dev` after changing `.env` — Vite only reads env files at startup.
Leaving it blank makes `/admin` show a "not configured" notice instead of a hard
Unauthorized screen, which is safe for local development.

> **Note on `npm install`:** one transitive dependency of `@solana/wallet-adapter-wallets`
> (`@stellar/stellar-sdk`) runs a `yarn setup` postinstall script. If your machine doesn't
> have `yarn` installed, `npm install` will fail on that script even though every package
> downloaded fine. Either install `yarn` globally, or run `npm install --ignore-scripts`
> (this project doesn't need that script — it was only verified with `--ignore-scripts`).
>
> A `react`/`@types/react` version pin is also set in `package.json` → `overrides`. Some
> wallet-adapter sub-dependencies pull in React 19 types for unrelated React Native
> support, which otherwise breaks compilation of `<ConnectionProvider>` under React 18.
> Keep this override in place unless you upgrade the whole project to React 19.

---

## Routes

Client-side routing is `react-router-dom` (`<BrowserRouter>` in `src/main.tsx`, route
table in `src/App.tsx`). The header/footer stay mounted across every route; only the
`<main>` content switches.

| Route | File | Guard | Purpose |
| --- | --- | --- | --- |
| `/` | `src/pages/LandingPage.tsx` | none (public) | Marketing home page — hero, stats, how-it-works, pet showcase, yield calculator, FAQ. |
| `/playpen` | `src/pages/PlaypenPage.tsx` | `RequireWallet` | The live game hall — three tabs: **All Pets**, **My Sanctuary** (owned pets + batched harvest), **Hall of Fame**. |
| `/admin` | `src/pages/AdminPage.tsx` | `RequireAdmin` | Hidden management console (initialize / deposit / withdraw / tune economy). Never linked from the nav. |

Clicking **"Enter TreatPaws"** (header) or **"Adopt Genesis Pet"** (hero) runs
`useEnterGame()` (`src/hooks/useEnterGame.ts`): if a wallet is already connected it
navigates straight to `/playpen`; otherwise it opens the wallet-select modal and
auto-navigates the instant a connection succeeds.

---

## On-chain wiring

| Concern | File(s) |
| --- | --- |
| Program ID, $TREAT mint, economy constants | `src/data/chain.ts` |
| Copied IDL (must match the deployed program) | `src/idl/pet_game.json` |
| PDA derivation (`game_config`, `vault`, `pet #N`) | `src/anchor/pda.ts` |
| Anchor `Program` client bound to the connected wallet | `src/anchor/useProgram.ts` |
| Raw ↔ UI view-model conversion for `GameConfig` / `Pet` | `src/anchor/types.ts` |
| Instruction builders (`initializeGame`, `depositVault`, `withdrawVault`, `updateGameConfig`, `buyPet`, `claimCoins`, `claimAllCoins`, `feedPet`, `renamePet`) | `src/anchor/instructions.ts` |
| Friendly on-chain error messages | `src/anchor/errors.ts` |
| Data hooks (poll `GameConfig` / all 10 `Pet` PDAs, detect "not initialized") | `src/hooks/useGameConfig.ts`, `src/hooks/usePets.ts` |
| Live per-second reward ticker — single pet / summed across many | `src/hooks/useLiveRewards.ts`, `src/hooks/useAggregateRewards.ts` (both share the pure formula in `src/utils/rewards.ts`, mirroring `calculate_pending_rewards` from `lib.rs`) |
| $TREAT mint decimals (for whole-token ↔ raw u64 conversion) | `src/hooks/useMintDecimals.ts` |
| Vault PDA $TREAT remaining (for admin Max withdraw) | `src/hooks/useVaultBalance.ts` |
| Toast + per-action loading state around every `.rpc()` call | `src/hooks/useTransactionRunner.ts` |
| Zero-HTTP-polling live buyout detection via `connection.onLogs` | `src/hooks/useProgramEvents.ts` |
| Offline "welcome back" buyout detection (localStorage snapshot diff) | `src/hooks/useOfflineTakeoverDetection.ts` |
| Shared buyout financial math + localStorage snapshot helpers | `src/utils/takeover.ts` |
| Lazy-loaded recent-activity feed for the Island Log drawer | `src/anchor/activity.ts` |

We use `@coral-xyz/anchor@^0.29` because `src/idl/pet_game.json` is in the classic
(pre-0.30) IDL shape — if you regenerate the IDL with a newer Anchor CLI that emits the
new `address`-rooted IDL format, either downgrade the regenerated IDL back to this shape
or upgrade the anchor package together with `useProgram.ts`'s `new Program(...)` call.

### `/playpen` — Live Pet Playpen

- `usePets` batch-fetches all 10 Pet PDAs in one RPC call (`fetchMultiple`). If any come
  back `null`, the page shows **"Game has not been initialized on-chain. Please visit
  /admin to initialize."** instead of a broken grid.
- Each `PetCard` (`src/components/playpen/PetCard.tsx`) shows id, name, current price
  (SOL), shortened owner address (+ a **Mine** tag), a live-ticking `$TREAT accrued`
  counter (`useLiveRewards`, updates every second, purely client-side math — no extra
  RPC calls), and a Regular/Boosted status tag with remaining boost time.
- Owners see **Claim / Feed / Rename**; everyone else sees **Snatch for X SOL**. Feed and
  Rename open confirmation modals (`FeedConfirmModal.tsx`, `RenameModal.tsx`); Buy/Claim
  fire directly since the price is already visible on the button.
- The **My Sanctuary** tab (`MySanctuary.tsx`) filters to only the connected wallet's
  pets. A trainer stats bar shows Pets Owned / Unclaimed $TREAT (live-ticking sum via
  `useAggregateRewards`) / Portfolio Valuation, followed by a golden **"Harvest All
  Treats"** button — it batches one `claim_coins` instruction per owned pet into a
  single transaction (`ix.claimAllCoins`, see `src/anchor/instructions.ts`) so the
  trainer signs and pays network fees once, not once per pet. Disabled at zero
  unclaimed $TREAT. Owning nothing yet shows a cozy dashed-card empty state with a
  "Browse All Pets" button that just switches tabs.
- The **Hall of Fame** tab (`HallOfFame.tsx`) ranks all 10 pets by current SOL price with
  gold/silver/bronze trophy icons for the top 3.
- **Live + offline "bought out" celebration** (`TakeoverCelebrationModal.tsx`): instead of
  a plain toast, being bought out pops a full `animal-island-ui` `<Modal>` with the pet's
  bouncing animated `<PetSprite>`, a financial breakdown card (buyer, SOL credited, a
  glowing net-profit badge), and a `canvas-confetti` burst on "Awesome! Collect Profits".
  Both trigger paths feed the same shared math in `src/utils/takeover.ts`
  (`computeTakeoverFinancials`) — it derives the previous owner's proceeds *and* their
  original principal from a single number (the price the pet just sold for), by
  inverting the on-chain pricing-bump invariant (`new_price = principal * (1 +
  increment_bps)`) — no fragile history-tracking required:
  - **Live**: `useProgramEvents(pets, gameConfig, onTakeoverDetected)` subscribes once
    to `connection.onLogs(PROGRAM_ID, ...)` over the existing wallet-adapter WebSocket —
    no HTTP polling. On a `BuyPet` log it fetches just that one transaction (buyer +
    previous owner + exact sale price, parsed straight from the `Pet {id} bought for
    {price} lamports` log line), escalating to the celebration modal if you were the
    previous owner, or a soft "🐾 Pet #N was snatched by \<addr\>" toast for anyone
    else's pet changing hands. Your own purchases stay silent here since the transaction
    runner already toasts them.
  - **Offline** (`useOfflineTakeoverDetection`): every `pets` poll snapshots `{ petId ->
    currentPriceLamports }` for everything you own into `localStorage`
    (`tp_owned_pet_ids_<wallet>`). The first time a wallet is seen each session, that
    fresh snapshot is diffed against whatever was saved last visit — any pet id that
    disappeared from your ownership while the tab was closed pops the same celebration
    modal ("welcome back"), using the last known price as the exact sale price (nothing
    else can change a pet's price while you own it, so it's provably accurate, not a
    guess). The snapshot is then overwritten so it never re-fires for the same sale.
- **Island Log** (top-right button, `ScrollText` icon) opens an `animal-island-ui`
  `<Drawer>` (`ActivityDrawer.tsx`). It is lazy: nothing is fetched until first opened.
  On open (and on the drawer's own Refresh button) it calls
  `connection.getSignaturesForAddress(PROGRAM_ID, { limit: 15 })` once, then a single
  batched `connection.getParsedTransactions(...)` for all 15 signatures (not 15 separate
  RPC calls) to classify each as Snatch/Buyout, Claim, Feed, or Rename off its
  `Instruction: <Name>` program log, with a Solana Explorer link and relative time
  ("5m ago").

### `/admin` — hidden management console

Four cards, each a separate component under `src/components/admin/`:

1. **`InitializeGameCard`** — one-click `initialize_game` at 0.01 SOL per pet, with a
   `ComputeBudgetProgram.setComputeUnitLimit({ units: 400_000 })` instruction prepended
   (this tx touches 12+ accounts and would otherwise hit the default 200k CU ceiling).
   Disabled automatically once `GameConfig` already exists on-chain.
2. **`DepositVaultCard`** — deposits an admin-entered whole-$TREAT amount into the Vault
   PDA, creating the admin's ATA idempotently first if needed.
3. **`WithdrawVaultCard`** — emergency `withdraw_vault` of an admin-entered whole-$TREAT
   amount from the Vault PDA back to the admin ATA. A **Max** button fills the input with
   the live vault remaining balance (`useVaultBalance`); the danger button opens a
   confirmation modal before asking the wallet to sign. A success toast plus a
   `canvas-confetti` burst fire on confirmation.
4. **`UpdateConfigCard`** — patches any subset of `fee_basis_points`,
   `price_increment_bps`, `base_reward_rate`, `boost_reward_rate`, `feed_cost`,
   `rename_cost` via `update_game_config`. Blank fields are sent as `null` (unchanged);
   current on-chain values are shown next to each label.

Every transaction across both pages goes through `useTransactionRunner`, which shows a
per-button loading spinner (`<Button loading>`) and a success/error toast (the
`animal-island-ui` `Notification` API) automatically.

---

## Page structure (marketing landing page, top to bottom)

| Section | File | Notes |
| --- | --- | --- |
| Header / Navbar | `src/components/layout/SiteHeader.tsx` | Route-aware: full anchor nav + "Enter TreatPaws" CTA on `/`; collapses to a "Home" link elsewhere. Logo, Devnet badge, wallet connect + balance always visible. |
| Hero | `src/components/sections/HeroSection.tsx` | Headline, subtitle, "playpen" `<Card>` with 4 real animated genesis pets idling, two CTAs. |
| Live activity ticker | `src/components/sections/ActivityTicker.tsx` | Auto-scrolling banner of mock on-chain events (feed/takeover/claim). |
| Global Treat Vault stats | `src/components/sections/VaultStats.tsx` | 4 `<Card>`s: vault reserve, pet count, base production rate, contract network. |
| How It Works | `src/components/sections/HowItWorks.tsx` | 3-step `<Card>` explainer. |
| Genesis Pets showcase | `src/components/sections/PetsShowcase.tsx` | 5×2 grid, mock preview data — every button routes into `/playpen` (via `useEnterGame`) where the *real* on-chain pets live. |
| $TREAT Yield Calculator | `src/components/sections/YieldCalculator.tsx` | Days-of-holding slider + Snack Boost `<Switch>`, live projected earnings. |
| FAQ | `src/components/sections/FaqSection.tsx` | 4 stacked `<Collapse>` panels. |
| Footer | `src/components/layout/SiteFooter.tsx` | Social placeholders, Devnet Explorer links for the program + $TREAT mint, then the library's `<Footer>` copyright bar. |

Shared pieces live in `src/components/ui/` (`PawLogo`, `PetSprite`, `DaySlider`),
`src/components/guards/` (`RequireWallet`, `RequireAdmin`, `GuardScreen`), and
`src/wallet/` (wallet-adapter provider + balance hook). Marketing copy/numbers come from
`src/data/*.ts`; real gameplay numbers come straight from the chain via the hooks above.

---

## Design system notes

- `animal-island-ui/style` is imported exactly once, in `src/main.tsx`, before `./index.css`.
- Every component used (`Button`, `Card`, `Collapse`, `Title`, `Tag`, `Switch`, `Tabs`,
  `Modal`, `Input`, `Skeleton`, `Footer`, `Cursor`, `Notification`) is a real export of
  the package — no invented props.
- **Custom exceptions:**
  - The library has no Slider/Range component, so the "Days of Holding" control
    (`src/components/ui/DaySlider.tsx`) is a hand-styled native range input, skinned with
    the same teal-fill / cream-pill / raised-thumb look as the rest of the page.
  - Hall of Fame medal colors (`src/components/playpen/HallOfFame.tsx`) use literal
    gold/silver/bronze hex values rather than `--animal-*` tokens, since medal colors are
    a fixed real-world convention, not a themeable brand color.
- Icons are from `lucide-react` (per the project's dependency list) rather than the
  library's own icon package.
- The official Solana `<WalletMultiButton />` ships its own default purple styling; it is
  re-skinned in `src/index.css` (`.wallet-adapter-button` rules) to match the honey-yellow
  pill + 3D shadow language used everywhere else.
- Pet art is real, animated pixel art sourced from the community
  [petdex.dev](https://petdex.dev) gallery (see "Genesis pet art" section below) — rendered
  by `src/components/ui/PetSprite.tsx`, a pure-CSS `steps()` spritesheet animation.

---

## Genesis pet art (petdex.dev)

Each of the 10 genesis pets (ids 1–10, matching the on-chain `Pet.id` field) is skinned
with a real animated companion sprite pulled from the community gallery at petdex.dev,
mapped in `src/data/creatures.ts`:

| Pet # | Slug | Display name | Author |
| --- | --- | --- | --- |
| 1 | `mallow` | Mallow | Aidil |
| 2 | `boba` | Boba | railly |
| 3 | `shiba-4` | Shiba | franksong2702 |
| 4 | `kuro` | Kuro | newideas99 |
| 5 | `kero` | Kero | lixwell |
| 6 | `capy` | Capy | yjcys |
| 7 | `duck-lord` | Duck Lord | zhiwei531 |
| 8 | `otterumells` | Otterumells | winkpist95 |
| 9 | `bun` | Bun | pipilu |
| 10 | `penguin-chick` | Emperor Penguin Chick | Nobita D. |

> **Note on slugs 3/7/8/10:** the originally-requested slugs `shiba`, `ducky`, `otter`,
> and `penguin` don't exist verbatim in the petdex catalog (only variants like `shiba-2/3/4`,
> `duck-lord`/`ducky-video`/etc., `otterumells`, `penguin-default`/`penguin-chick`/etc.).
> The slugs above were picked with the project owner; run `npx petdex@latest list` and
> edit `src/data/creatures.ts` if you'd like to swap any of them for a different variant.

### How the sprites work

Each petdex spritesheet is a fixed grid (8 columns × 9 rows, or a "v2" 8×11 for pets
re-exported from newer ChatGPT pet exports) of 192×208px frames, where row 0 is the idle
loop (8 frames) — that's the only row TreatPaws actually plays. `PetSprite.tsx` renders it
with a CSS `steps(8)` background-position animation; no JS timers involved.

The full spritesheets (which also contain 8–10 *other*, unused animation-state rows and
weigh 1.5–2.4MB **each**) are never shipped to the browser. Instead,
`scripts/generate-pet-sprites.mjs` crops just the idle row out of each one and
re-compresses it as WebP, dropping total asset weight for all 10 pets from ~20MB down to
~520KB, written to `public/pets/<slug>/idle.webp` (already committed — you don't need to
regenerate them unless you change the pet lineup).

To regenerate (e.g. after adding/swapping a pet):

```bash
npx petdex@latest install <slug>        # downloads ~/.petdex/pets/<slug>/spritesheet.webp
npm install --no-save sharp             # ephemeral — NOT a project dependency
node scripts/generate-pet-sprites.mjs
npm uninstall sharp
```

### ⚠️ Licensing / attribution caveat

The `petdex` CLI itself is MIT-licensed, but that does **not** extend to the individual
pet artwork submitted by community members to the gallery — it was created for personal
desktop-mascot use (Petdex Desktop / Codex Desktop), not for redistribution inside a
third-party product. Authors are credited in the site footer
(`src/components/layout/SiteFooter.tsx`) and in the table above as a good-faith courtesy,
but **before any mainnet launch or real marketing push, get explicit permission from each
author (or commission original art) to avoid IP issues.** This is fine for a Devnet demo.

---

## What's still not wired up

1. **Live activity ticker** (`src/data/activity.ts`) is still mock data — hook it up to
   program log subscriptions or an off-chain indexer if you want real events.
2. Update `src/data/chain.ts` (`PROGRAM_ID`, `TREAT_MINT`) and the RPC cluster in
   `WalletContextProvider.tsx` when moving from Devnet to Mainnet.
