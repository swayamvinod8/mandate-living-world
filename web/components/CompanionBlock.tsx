"use client";

import { gold } from "@/lib/format";
import { TRUST_WEIGHT, loyaltyPrice } from "@/lib/game";
import { explorerAddressUrl } from "@/lib/pdas";
import type { CharacterView, NpcView, RelationshipView } from "@/lib/useMandate";

type Props = {
  kael: NpcView | null;
  relationship: RelationshipView | null;
  character: CharacterView;
  busy: string | null;
  onHire: () => void;
};

type Standing = "missing" | "available" | "taken" | "loyal" | "betrayed";

function standingOf(kael: NpcView | null, rel: RelationshipView | null): Standing {
  if (!kael) return "missing";
  if (rel?.betrayed) return "betrayed";
  if (rel) return "loyal";
  if (kael.hiredBy) return "taken";
  return "available";
}

const STATUS_TEXT: Record<Standing, string> = {
  missing: "Not yet in town",
  available: "For hire",
  taken: "Riding with another adventurer",
  loyal: "At your side",
  betrayed: "Turned against you",
};

export default function CompanionBlock({ kael, relationship, busy, onHire }: Props) {
  const standing = standingOf(kael, relationship);

  if (!kael) {
    return (
      <section className="statblock statblock--empty" aria-labelledby="kael-title">
        <h2 id="kael-title" className="statblock__name">
          Kael
        </h2>
        <p className="statblock__type">Medium humanoid (human rogue), companion for hire</p>
        <div className="taper" />
        <p>
          Kael hasn&apos;t arrived on devnet yet. The world server seeds companions with the NPC
          seed script. Once that runs, he&apos;ll appear here within a few seconds.
        </p>
      </section>
    );
  }

  const trust = relationship ? relationship.trust : kael.loyalty;
  const bond = standing === "betrayed" ? kael.bond : relationship ? relationship.bondEscrow : kael.bond;
  const price = loyaltyPrice(bond, trust);
  const hiring = busy === "Hire Kael";

  return (
    <section
      className={`statblock statblock--${standing}`}
      aria-labelledby="kael-title"
      aria-live="polite"
    >
      <div className="statblock__top">
        <div>
          <h2 id="kael-title" className="statblock__name">
            {kael.name}
          </h2>
          <p className="statblock__type">Medium humanoid (human rogue), companion for hire</p>
        </div>
        <span className={`status-seal status-seal--${standing}`}>{STATUS_TEXT[standing]}</span>
      </div>

      <div className="taper" />

      <dl className="props">
        <div>
          <dt>Loyalty bond</dt>
          <dd>
            {gold(bond)} gold{" "}
            {standing === "betrayed" ? "(slashed and paid to you)" : standing === "loyal" ? "(held in escrow)" : ""}
          </dd>
        </div>
        <div>
          <dt>Trust</dt>
          <dd>
            {trust} (worth {trust * TRUST_WEIGHT} gold)
          </dd>
        </div>
        <div>
          <dt>Greed</dt>
          <dd>{kael.greed}</dd>
        </div>
      </dl>

      <LoyaltyMeter bond={bond} trustGold={trust * TRUST_WEIGHT} broken={standing === "betrayed"} />

      <div className="taper" />

      <h3 className="statblock__section">Traits</h3>
      <p className="trait">
        <em>Loyalty Bond.</em> Kael&apos;s bond sits in escrow on Solana. If he betrays you, the
        program slashes it and pays you, no arbiter needed.
      </p>
      <p className="trait">
        <em>Has a Price.</em> A rival who offers more than his bond plus trust can turn him. Right
        now that price is <strong>{gold(price)} gold</strong>.
      </p>

      <h3 className="statblock__section">
        {standing === "available" ? "Actions" : "Status"}
      </h3>

      {standing === "available" ? (
        <div className="statblock__action">
          <p className="trait">
            <em>Hire.</em> Kael joins you and posts his {gold(kael.bond)} gold bond.
          </p>
          <button className="btn" onClick={onHire} disabled={Boolean(busy)} aria-busy={hiring}>
            {hiring ? <span className="spinner" aria-hidden="true" /> : null}
            Hire Kael
          </button>
        </div>
      ) : null}

      {standing === "loyal" ? (
        <p className="trait">
          Kael rides with you. Vex and the other rivals know his price. Leave him be long enough and
          someone may pay it.
        </p>
      ) : null}

      {standing === "taken" ? (
        <p className="trait">Another adventurer holds Kael&apos;s contract. Check back later.</p>
      ) : null}

      {standing === "betrayed" ? (
        <p className="trait trait--blood">
          A rival paid more than Kael&apos;s loyalty was worth, and he took it. The program slashed
          his {gold(kael.bond)} gold bond and paid it to you.
        </p>
      ) : null}

      <a className="statblock__link" href={explorerAddressUrl(kael.address)} target="_blank" rel="noreferrer">
        Kael&apos;s account on Solana Explorer
      </a>
    </section>
  );
}

function LoyaltyMeter({ bond, trustGold, broken }: { bond: number; trustGold: number; broken: boolean }) {
  const total = Math.max(bond + trustGold, 1);
  const bondPct = (bond / total) * 100;

  return (
    <figure className={`loyalty${broken ? " loyalty--broken" : ""}`}>
      <div
        className="loyalty__bar"
        role="img"
        aria-label={
          broken
            ? "Kael's loyalty is broken"
            : `Price of loyalty: ${bond} gold bond plus ${trustGold} gold of trust`
        }
      >
        <span className="loyalty__bond" style={{ width: `${bondPct}%` }} />
        <span className="loyalty__trust" style={{ width: `${100 - bondPct}%` }} />
      </div>
      <figcaption className="loyalty__legend">
        <span>
          <i className="swatch swatch--bond" /> Bond {gold(bond)}
        </span>
        <span>
          <i className="swatch swatch--trust" /> Trust {gold(trustGold)}
        </span>
        <span className="loyalty__total">
          {broken ? "Loyalty broken" : `Price of loyalty ${gold(bond + trustGold)}`}
        </span>
      </figcaption>
    </figure>
  );
}
