"use client";

import { useEffect, useState } from "react";
import { ago, duration, gold, shortKey } from "@/lib/format";
import { GUILD_JOB_REP, HUNT_MIN_REP, MAX_REP, settlePreview } from "@/lib/game";
import type { CharacterView, MandateState } from "@/lib/useMandate";

type Props = {
  character: CharacterView;
  busy: string | null;
  actions: MandateState["actions"];
};

// Ticks every 30s so the settle preview stays current
function useNow() {
  const [now, setNow] = useState(() => Date.now() / 1000);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now() / 1000), 30_000);
    return () => clearInterval(t);
  }, []);
  return now;
}

export default function CharacterSheet({ character: c, busy, actions }: Props) {
  const now = useNow();
  const preview = settlePreview(c.gold, c.incomePerHour, c.rentPerHour, c.lastUpdate, now);
  const net = c.incomePerHour - c.rentPerHour;
  const repPct = Math.min(100, (c.thievesRep / MAX_REP) * 100);
  const canSeekRumors = c.betrayed && c.thievesRep >= HUNT_MIN_REP && !c.huntUnlocked;

  return (
    <section className="sheet charsheet" aria-labelledby="char-title">
      <header className="charsheet__head">
        <h1 id="char-title" className="sheet__title">
          {c.className}
        </h1>
        <p className="charsheet__owner">Adventurer {shortKey(c.address)}</p>
      </header>

      <div className="abilities">
        <Ability label="Gold" value={gold(c.gold)} sub={`${net >= 0 ? "+" : "−"}${Math.abs(net)} an hour`} />
        <Ability label="Income" value={`+${c.incomePerHour}`} sub="per hour" />
        <Ability label="Rent" value={`−${c.rentPerHour}`} sub="guild hall" />
        <Ability label="Standing" value={String(c.thievesRep)} sub={`of ${MAX_REP}`} />
      </div>

      <div className="standing">
        <div className="standing__label">
          <span>Thieves&apos; Guild standing</span>
          <span>{c.thievesRep >= HUNT_MIN_REP ? "Guild contacts open" : `Contacts open at ${HUNT_MIN_REP}`}</span>
        </div>
        <div
          className="track"
          role="meter"
          aria-valuemin={0}
          aria-valuemax={MAX_REP}
          aria-valuenow={c.thievesRep}
          aria-label="Thieves' Guild standing"
        >
          <span className="track__fill" style={{ width: `${repPct}%` }} />
          <span className="track__notch" style={{ left: `${(HUNT_MIN_REP / MAX_REP) * 100}%` }} />
        </div>
      </div>

      {c.betrayed || c.huntUnlocked ? (
        <div className="traits">
          <h2 className="sheet__section">Marks</h2>
          {c.betrayed ? (
            <p className="mark mark--blood">
              <strong>Betrayed.</strong> A companion sold you out. The guild remembers.
            </p>
          ) : null}
          {c.huntUnlocked ? (
            <p className="mark mark--gold">
              <strong>The hunt for Kael.</strong> The Thieves&apos; Guild will track him down for a
              share of what he carries.
            </p>
          ) : null}
        </div>
      ) : null}

      <h2 className="sheet__section">Actions</h2>
      <div className="actions">
        <ActionLine
          name="Guild Job."
          text={`Run an errand for the Thieves' Guild. +${GUILD_JOB_REP} standing, up to ${MAX_REP}.`}
          button="Take a guild job"
          busy={busy}
          disabled={c.thievesRep >= MAX_REP}
          onClick={() => actions?.guildJob()}
        />
        <ActionLine
          name="Settle Accounts."
          text="Collect income and pay rent for every full hour since you last settled, up to 72. Partial hours are lost."
          status={
            preview.hours > 0
              ? `${preview.hours} full ${preview.hours === 1 ? "hour" : "hours"} waiting: ${preview.delta >= 0 ? "+" : "−"}${gold(Math.abs(preview.delta))} gold.`
              : `No full hour yet. Last settled ${ago(c.lastUpdate, now)}; next hour in ${duration(preview.nextHourIn ?? 0)}.`
          }
          button="Settle accounts"
          busy={busy}
          onClick={() => actions?.settle()}
        />
        <ActionLine
          name="Seek Rumors."
          text={`If a companion has betrayed you and your standing is ${HUNT_MIN_REP} or more, the Guild comes to you.`}
          status={
            c.huntUnlocked
              ? "The Guild has already made its offer."
              : [
                  c.betrayed ? "Betrayed: yes" : "Betrayed: not yet",
                  c.thievesRep >= HUNT_MIN_REP ? `standing ${c.thievesRep}` : `standing ${c.thievesRep} of ${HUNT_MIN_REP}`,
                ].join(", ") + "."
          }
          button="Seek rumors"
          busy={busy}
          disabled={!canSeekRumors}
          onClick={() => actions?.checkEvent()}
        />
      </div>
    </section>
  );
}

function Ability({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="ability">
      <span className="ability__label">{label}</span>
      <span className="ability__value">{value}</span>
      <span className="ability__sub">{sub}</span>
    </div>
  );
}

type ActionLineProps = {
  name: string;
  text: string;
  status?: string;
  button: string;
  busy: string | null;
  disabled?: boolean;
  onClick: () => void;
};

function ActionLine({ name, text, status, button, busy, disabled, onClick }: ActionLineProps) {
  const mine = busy === button;
  return (
    <div className="action-line">
      <div className="action-line__text">
        <p>
          <em className="action-line__name">{name}</em> {text}
        </p>
        {status ? <p className="action-line__status">{status}</p> : null}
      </div>
      <button
        className="btn"
        onClick={onClick}
        disabled={Boolean(busy) || disabled}
        aria-busy={mine}
      >
        {mine ? <span className="spinner" aria-hidden="true" /> : null}
        {button}
      </button>
    </div>
  );
}
