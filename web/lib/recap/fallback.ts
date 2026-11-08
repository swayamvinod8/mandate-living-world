// Plain recap built only from on-chain facts. Used when the narrator isn't
// available (no API key, a failed call, or the static GitHub Pages build).
// No SDK imports here, so the browser can use it too.

import type { WorldSnapshot } from "./types";

export function fallbackRecap(world: WorldSnapshot): string {
  if (world.events.length === 0) {
    return `Nothing happened while you were away. You have ${world.character.gold} gold.`;
  }
  const parts = world.events.map((e) => {
    switch (e.kind) {
      case "hired":
        return `You hired ${e.npcName}, and the bond went into escrow.`;
      case "betrayed":
        return `A rival offered ${e.npcName} ${e.offer} gold, more than the bond and trust were worth. ${e.npcName} took it. The ${e.bondPaid} gold bond was slashed and paid to you.`;
      case "settled":
        return `You settled ${e.hours} ${e.hours === "1" ? "hour" : "hours"} of income and guild hall rent: your purse went from ${e.goldBefore} to ${e.goldAfter} gold.`;
      case "eventUnlocked":
        return `Word reached the Thieves' Guild. They offer to hunt down your betrayer for a share of what he carries.`;
    }
  });
  return parts.join(" ");
}
