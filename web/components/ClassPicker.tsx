"use client";

import { useState } from "react";
import { CLASSES } from "@/lib/game";

type Props = {
  busy: string | null;
  onCreate: (classId: number) => void;
  lastFailure?: string;
};

export default function ClassPicker({ busy, onCreate, lastFailure }: Props) {
  const [picked, setPicked] = useState<number>(2);
  const choice = CLASSES[picked];
  const creating = busy?.startsWith("Create") ?? false;

  return (
    <section className="sheet picker" aria-labelledby="picker-title">
      <h1 id="picker-title" className="sheet__title">
        Choose your class
      </h1>
      <p className="sheet__intro">
        Your class sets your starting purse, your hourly income, and the rent on your guild hall.
        You can&apos;t change it later.
      </p>

      <div className="picker__grid" role="radiogroup" aria-label="Class">
        {CLASSES.map((c) => {
          const selected = c.id === picked;
          return (
            <button
              key={c.id}
              role="radio"
              aria-checked={selected}
              className={`class-card${selected ? " class-card--picked" : ""}`}
              onClick={() => setPicked(c.id)}
            >
              <span className="class-card__name">{c.name}</span>
              <span className="class-card__note">{c.note}</span>
              <dl className="class-card__stats">
                <div>
                  <dt>Purse</dt>
                  <dd>{c.startGold}</dd>
                </div>
                <div>
                  <dt>Income</dt>
                  <dd>+{c.income}/h</dd>
                </div>
                <div>
                  <dt>Rent</dt>
                  <dd>−{c.rent}/h</dd>
                </div>
              </dl>
            </button>
          );
        })}
      </div>

      <div className="picker__footer">
        <button className="btn btn--large" disabled={creating} onClick={() => onCreate(choice.id)}>
          {creating ? `Creating ${choice.name}…` : `Create ${choice.name}`}
        </button>
        <p className="fine">
          Nets {choice.income - choice.rent} gold for every full hour you&apos;re away.
        </p>
      </div>
      {lastFailure ? (
        <p className="inline-error" role="alert">
          {lastFailure}
        </p>
      ) : null}
    </section>
  );
}
