import { WalletButton } from "./Topbar";

export default function Welcome() {
  return (
    <section className="sheet scroll" aria-labelledby="welcome-title">
      <h1 id="welcome-title" className="scroll__title">
        The guild keeps its own books
      </h1>
      <p className="scroll__lede">
        Hire a companion, post their loyalty bond, and walk away. While you&apos;re gone, rivals
        make offers and the guild hall rent comes due. When you return, the ledger says who stayed
        loyal.
      </p>

      <ol className="scroll__steps">
        <li>
          <strong>Choose a class.</strong> Each has its own income and guild hall rent, paid by the
          hour.
        </li>
        <li>
          <strong>Hire Kael.</strong> His bond sits in escrow on Solana. If a rival outbids his
          loyalty, he turns, and the bond is paid to you.
        </li>
        <li>
          <strong>Come back later.</strong> Settle your accounts and read what happened while you
          were away, written from the transactions themselves.
        </li>
      </ol>

      <div className="scroll__cta">
        <WalletButton large />
        <p className="fine">Runs on Solana devnet. Fees are paid in free test SOL.</p>
      </div>
    </section>
  );
}
