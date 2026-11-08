"use client";

import { useEffect, useRef, useState } from "react";
import { WalletReadyState } from "@solana/wallet-adapter-base";
import { useWallet } from "@solana/wallet-adapter-react";
import { shortKey } from "@/lib/format";
import D20 from "./D20";

export default function Topbar() {
  return (
    <header className="topbar">
      <div className="wordmark">
        <D20 />
        <span>Mandate</span>
      </div>
      <div className="topbar__right">
        <span className="realm-tag" title="All transactions use Solana devnet, so nothing costs real money">
          Devnet
        </span>
        <WalletButton />
      </div>
    </header>
  );
}

export function WalletButton({ large = false }: { large?: boolean }) {
  const { wallets, select, connecting, connected, publicKey, disconnect } = useWallet();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const installed = wallets.filter(
    (w) => w.readyState === WalletReadyState.Installed || w.readyState === WalletReadyState.Loadable
  );

  // Close the menu on outside click
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const size = large ? " btn--large" : "";

  if (connected && publicKey) {
    return (
      <div className="wallet" ref={menuRef}>
        <button
          className={`btn btn--quiet btn--on-table${size}`}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {shortKey(publicKey)}
        </button>
        {open ? (
          <div className="wallet__menu" role="menu">
            <button
              role="menuitem"
              onClick={() => {
                navigator.clipboard?.writeText(publicKey.toBase58());
                setOpen(false);
              }}
            >
              Copy address
            </button>
            <button
              role="menuitem"
              onClick={() => {
                setOpen(false);
                disconnect();
              }}
            >
              Disconnect
            </button>
          </div>
        ) : null}
      </div>
    );
  }

  if (installed.length === 0) {
    return (
      <a className={`btn${size}`} href="https://phantom.app/download" target="_blank" rel="noreferrer">
        Install Phantom to play
      </a>
    );
  }

  // One wallet: connect straight away. Several: let the player pick.
  if (installed.length === 1) {
    return (
      <button
        className={`btn${size}`}
        disabled={connecting}
        onClick={() => select(installed[0].adapter.name)}
      >
        {connecting ? "Connecting…" : "Connect wallet"}
      </button>
    );
  }

  return (
    <div className="wallet" ref={menuRef}>
      <button
        className={`btn${size}`}
        disabled={connecting}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {connecting ? "Connecting…" : "Connect wallet"}
      </button>
      {open ? (
        <div className="wallet__menu" role="menu">
          {installed.map((w) => (
            <button
              key={w.adapter.name}
              role="menuitem"
              onClick={() => {
                setOpen(false);
                select(w.adapter.name);
              }}
            >
              {w.adapter.name}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
