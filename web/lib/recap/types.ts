// Plain JSON shapes used by the recap route.
// Numbers from the chain (u64) come back as strings so nothing overflows.

export type CharacterState = {
  address: string;
  owner: string;
  className: string;
  gold: string;
  incomePerHour: string;
  rentPerHour: string;
  lastUpdate: number;
  thievesRep: number;
  betrayedByCompanion: boolean;
  huntKaelUnlocked: boolean;
};

export type RelationshipState = {
  address: string;
  npc: string;
  npcName: string;
  trust: number;
  bondEscrow: string;
  betrayed: boolean;
};

export type GameEvent =
  | { kind: "settled"; goldBefore: string; goldAfter: string; hours: string }
  | { kind: "hired"; npc: string; npcName: string }
  | { kind: "betrayed"; npc: string; npcName: string; offer: string; bondPaid: string }
  | { kind: "eventUnlocked"; eventId: number };

export type TimedEvent = GameEvent & {
  signature: string;
  blockTime: number | null;
};

export type WorldSnapshot = {
  character: CharacterState;
  relationships: RelationshipState[];
  events: TimedEvent[];
};

export type RecapResponse = {
  recap: string;
  facts: WorldSnapshot;
  source: "chain" | "mock";
  narrated: boolean; // false means the plain fallback text was used
};
