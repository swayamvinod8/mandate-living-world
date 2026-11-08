import { clockTime } from "@/lib/format";
import { explorerTxUrl } from "@/lib/pdas";
import type { Activity } from "@/lib/useMandate";

export default function AdventureLog({ activity }: { activity: Activity[] }) {
  return (
    <section className="log" aria-labelledby="log-title">
      <h2 id="log-title" className="log__title">
        Adventure log
      </h2>
      {activity.length === 0 ? (
        <p className="log__empty">
          Each action you take is a Solana transaction. They&apos;ll appear here with a link to
          Explorer.
        </p>
      ) : (
        <ol className="log__list">
          {activity.map((a) => (
            <li key={a.id} className={`log__item log__item--${a.status}`}>
              <div className="log__row">
                <span className="log__label">{a.label}</span>
                <span className="log__time">{clockTime(a.at)}</span>
              </div>
              <div className="log__row log__row--meta">
                {a.status === "pending" ? <span>Waiting for your wallet and the network…</span> : null}
                {a.status === "confirmed" && a.signature ? (
                  <>
                    <span>Confirmed</span>
                    <a href={explorerTxUrl(a.signature)} target="_blank" rel="noreferrer">
                      View on Explorer
                    </a>
                  </>
                ) : null}
                {a.status === "failed" ? <span>{a.message}</span> : null}
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
