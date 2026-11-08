"use client";

import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { clusterApiUrl } from "@solana/web3.js";

const ENDPOINT = process.env.NEXT_PUBLIC_RPC_URL ?? clusterApiUrl("devnet");

// Phantom and other modern wallets register themselves (Wallet Standard),
// so the adapter list can stay empty.
const WALLETS: never[] = [];

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ConnectionProvider endpoint={ENDPOINT} config={{ commitment: "confirmed" }}>
      <WalletProvider wallets={WALLETS} autoConnect>
        {children}
      </WalletProvider>
    </ConnectionProvider>
  );
}
