// Turns wallet, RPC and Anchor errors into one plain sentence for the UI.

export function friendlyError(err: unknown): string {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const e = err as any;
  const raw: string =
    e?.error?.errorMessage ?? e?.message ?? (typeof err === "string" ? err : "Something went wrong.");

  if (/user rejected|rejected the request|declined/i.test(raw)) {
    return "You declined the transaction in your wallet.";
  }
  if (/no record of a prior credit|insufficient (funds|lamports)/i.test(raw)) {
    return "Your wallet needs devnet SOL for the fee. Get some at faucet.solana.com, then try again.";
  }
  if (/already in use/i.test(raw)) {
    return "That account already exists on-chain. Refresh the page.";
  }
  if (/blockhash not found|block height exceeded|timed out/i.test(raw)) {
    return "The network took too long to confirm. Try again.";
  }
  if (/wallet not connected|WalletNotConnected/i.test(raw)) {
    return "Connect your wallet first.";
  }
  return raw.length > 180 ? `${raw.slice(0, 177)}...` : raw;
}
