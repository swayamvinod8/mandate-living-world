// Mock world used until the program is deployed (RECAP_USE_MOCK=true).
// Matches the demo story: Kael takes the rival's bribe while the player is offline.

import type { WorldSnapshot } from "./types";

export function mockSnapshot(owner: string): WorldSnapshot {
  const now = Math.floor(Date.now() / 1000);

  return {
    character: {
      address: "MockCharacter1111111111111111111111111111111",
      owner,
      className: "Merchant",
      gold: "540",
      incomePerHour: "12",
      rentPerHour: "10",
      lastUpdate: now - 60,
      thievesRep: 15,
      betrayedByCompanion: true,
      huntKaelUnlocked: true,
    },
    relationships: [
      {
        address: "MockRel11111111111111111111111111111111111",
        npc: "MockKael1111111111111111111111111111111111",
        npcName: "Kael",
        trust: 0,
        bondEscrow: "0",
        betrayed: true,
      },
    ],
    events: [
      {
        kind: "hired",
        npc: "MockKael1111111111111111111111111111111111",
        npcName: "Kael",
        signature: "mock-hire",
        blockTime: now - 9 * 3600,
      },
      {
        kind: "betrayed",
        npc: "MockKael1111111111111111111111111111111111",
        npcName: "Kael",
        offer: "500",
        bondPaid: "100",
        signature: "mock-betray",
        blockTime: now - 4 * 3600,
      },
      {
        kind: "settled",
        goldBefore: "524",
        goldAfter: "540",
        hours: "8",
        signature: "mock-settle",
        blockTime: now - 120,
      },
      {
        kind: "eventUnlocked",
        eventId: 1,
        signature: "mock-event",
        blockTime: now - 60,
      },
    ],
  };
}
