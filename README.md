# ⚽ KickPay AI

> **Offline-first, self-custodial football payment network powered by P2P mesh networking, on-device AI, and Liquid Testnet settlement.**

KickPay AI is a sovereign payment terminal for the global football ecosystem. Built for the **Tether Developers Cup**, it brings together:

- 🔒 **Self-custodial wallets** via the Tether WDK
- 📡 **Offline P2P payments** over Hyperswarm mesh (no internet required)
- 🤖 **On-device AI** via QVAC SDK (zero cloud inference)
- ⛓️ **Liquid Testnet settlement** with `liquidjs-lib` and real `tex1` addresses

---

## 🏗️ Architecture

```
KickPay AI
├── src/
│   ├── app/                   # Next.js App Router
│   ├── features/              # UI screens
│   │   ├── dashboard/         # Fan dashboard + receive address
│   │   ├── wallet/            # Wallet creation & recovery
│   │   ├── merchant/          # Merchant POS terminal
│   │   ├── payments/          # Payment history
│   │   ├── settlement/        # Liquid Testnet settlement
│   │   ├── tickets/           # Ticket management
│   │   ├── ai/                # QVAC AI assistant
│   │   └── settings/          # Security & key management
│   └── lib/
│       ├── wallet-adapter/    # BIP39/BIP32 + liquidjs-lib key derivation
│       ├── kickpay-core/      # Business logic (payments, settlement, etc.)
│       ├── sync-adapter/      # Hyperswarm P2P mesh adapter
│       └── shared-types/      # Shared TypeScript interfaces
└── server/                    # WebSocket relay service
```

---

## 🚀 Quick Start

### Prerequisites

- [Bun](https://bun.sh) >= 1.0
- Node.js >= 18

### Install & Run

```bash
# 1. Clone the repository
git clone https://github.com/vi5hnuraj/KickPay-AI.git
cd KickPay-AI

# 2. Install dependencies
bun install

# 3. Start the development server
bun run dev
```

Open http://localhost:3000 in your browser.

---

## 💡 Core Features

### 🔑 Self-Custodial Wallet (WDK + BIP39/BIP32)
- Generates a 12-word BIP-39 mnemonic seed phrase
- Derives secp256k1 keypairs using BIP-32 path m/84'/1776'/0'/0/0
- Creates Liquid Testnet receive addresses (tex1...) via liquidjs-lib
- Deterministic recovery from seed phrase
- All keys stored only in localStorage — never transmitted

### 📡 Offline P2P Payments (Pears / Hyperswarm)
- Fans and merchants connect via Hyperswarm mesh without a central server
- QR code scanning to initiate payment sessions
- Payment requests signed with the sender's secp256k1 private key
- Offline queue replicated across peers when connectivity is restored

### 🤖 On-Device AI (QVAC SDK)
- Natural language payment intent parsing
- Runs entirely on-device — no cloud API calls
- Fraud detection and anomaly scoring

### ⛓️ Liquid Testnet Settlement
- Real tex1 addresses derived from secp256k1 public keys
- UTXO balance fetching from Blockstream Esplora API
- Settlement engine ready for liquidjs-lib Confidential Transactions
- Fund wallets from the Liquid Testnet Faucet: https://liquidtestnet.com/faucet

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16, React 19, TailwindCSS, Framer Motion |
| Wallet | Tether WDK, BIP39, BIP32, tiny-secp256k1, ecpair |
| Blockchain | liquidjs-lib, Blockstream Esplora (Liquid Testnet) |
| P2P Networking | Hyperswarm, Autobase, Hypercore |
| AI | QVAC SDK (on-device inference) |
| Runtime | Bun |

---

## 🔐 Security

- No private keys are ever transmitted over the network
- All cryptographic operations happen client-side in the browser
- Seed phrases are stored in localStorage and should be treated as sensitive
- The .env file is excluded from version control — use .env.example as a template

---

## 🏆 Track Compliance

| Track | Requirement | Status |
|---|---|---|
| WDK | Self-custodial wallet with Tether WDK | ✅ |
| Pears | P2P networking via Hyperswarm | ✅ |
| QVAC | On-device AI inference | ✅ |

---

## 📁 Scripts

```bash
bun run dev        # Start development server (hot reload)
bun run build      # Production build
bun run typecheck  # TypeScript type check
bun run lint       # ESLint
```

---

## 🌐 Environment Variables

Copy .env.example to .env and fill in your values:

```
DATABASE_URL=postgresql://...      # Optional: Postgres for server-side data
JWT_SECRET=your-secret-here        # Optional: JWT signing secret for relay
```

Never commit .env to version control.

---

## 📄 License

Apache 2.0 — Open source, permissive commercial use.

---

Built for the Tether Developers Cup 2026 ⚽
