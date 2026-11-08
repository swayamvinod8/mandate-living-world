"use client";

import { configProblem } from "@/lib/program";
import { explorerAddressUrl, PROGRAM_ID } from "@/lib/pdas";
import { useMandate } from "@/lib/useMandate";
import AdventureLog from "./AdventureLog";
import CharacterSheet from "./CharacterSheet";
import Chronicle from "./Chronicle";
import ClassPicker from "./ClassPicker";
import CompanionBlock from "./CompanionBlock";
import Topbar from "./Topbar";
import Welcome from "./Welcome";

const CONFIG_PROBLEM = configProblem();

export default function Game() {
  const m = useMandate();

  let body: React.ReactNode;
  if (!m.connected) {
    body = <Welcome />;
  } else if (!m.loaded) {
    body = <p className="table-note">Opening the guild ledger…</p>;
  } else if (m.loadError && !m.character) {
    body = (
      <div className="notice notice--error" role="alert">
        <p>Couldn&apos;t read the ledger: {m.loadError}</p>
        <button className="btn btn--quiet" onClick={() => m.refresh()}>
          Try again
        </button>
      </div>
    );
  } else if (!m.character) {
    body = (
      <ClassPicker
        busy={m.busy}
        onCreate={(id) => m.actions?.createCharacter(id)}
        lastFailure={m.activity.find((a) => a.status === "failed")?.message}
      />
    );
  } else {
    body = (
      <div className="board">
        <div className="board__side">
          <CharacterSheet character={m.character} busy={m.busy} actions={m.actions} />
          <AdventureLog activity={m.activity} />
        </div>
        <div className="board__main">
          <CompanionBlock
            kael={m.kael}
            relationship={m.relationship}
            character={m.character}
            busy={m.busy}
            onHire={() => m.actions?.hire()}
          />
          <Chronicle
            owner={m.owner}
            // Rewrite the story when something big changes on-chain
            storyKey={`${m.character.betrayed}-${m.character.huntUnlocked}-${Boolean(m.relationship)}`}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <Topbar />
      {CONFIG_PROBLEM ? (
        <div className="notice notice--warn" role="status">
          <p>{CONFIG_PROBLEM}</p>
        </div>
      ) : null}
      <main>{body}</main>
      <footer className="footer">
        <p>
          Every outcome is decided by the Mandate program on Solana devnet. The chronicle only
          tells what the ledger already recorded.
        </p>
        <a href={explorerAddressUrl(PROGRAM_ID)} target="_blank" rel="noreferrer">
          View the program on Solana Explorer
        </a>
      </footer>
    </div>
  );
}
