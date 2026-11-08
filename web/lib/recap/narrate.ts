// Turns on-chain facts into the "while you were away" story.
// Rule: the program decides what happened, the model only tells it.

import Anthropic from "@anthropic-ai/sdk";
import { fallbackRecap } from "./fallback";
import type { TimedEvent, WorldSnapshot } from "./types";

export { fallbackRecap };

const MODEL = process.env.RECAP_MODEL ?? "claude-sonnet-5-5";

const SYSTEM_PROMPT = `You are the narrator of a fantasy guild game. You write the short "while you were away" recap a player reads when they log back in.

Hard rules:
- Only describe what is in the FACTS block. Every outcome, number and name must come from it.
- Never invent results, gold amounts, deaths, items, places or characters that are not in the facts.
- If a fact is missing, leave it out. Do not guess.
- Use the exact gold numbers given.
- Write in second person ("you"), past tense, 120-180 words, plain prose, no headings or lists.
- If the hunt event is unlocked, end with the Thieves' Guild's offer to track down the companion who betrayed you, as an open choice for the player.`;

function describeEvent(e: TimedEvent): string {
  const when = e.blockTime ? new Date(e.blockTime * 1000).toISOString() : "unknown time";
  switch (e.kind) {
    case "hired":
      return `[${when}] You hired ${e.npcName} as a companion. ${e.npcName} posted a loyalty bond.`;
    case "betrayed":
      return `[${when}] A rival bribed ${e.npcName} with ${e.offer} gold. The bribe was larger than the bond plus trust, so ${e.npcName} betrayed you. The bond of ${e.bondPaid} gold was slashed and paid to you.`;
    case "settled":
      return `[${when}] Accounts settled over ${e.hours} hours: gold went from ${e.goldBefore} to ${e.goldAfter} after income and guild hall rent.`;
    case "eventUnlocked":
      return `[${when}] Hidden event ${e.eventId} unlocked: the Thieves' Guild offers to track down the companion who betrayed you, for a share of what they find.`;
  }
}

export function buildFacts(world: WorldSnapshot): string {
  const c = world.character;
  const lines = [
    `Class: ${c.className}`,
    `Gold now: ${c.gold}`,
    `Income per hour: ${c.incomePerHour}, rent per hour: ${c.rentPerHour}`,
    `Thieves' Guild reputation: ${c.thievesRep}`,
    `Betrayed by a companion: ${c.betrayedByCompanion ? "yes" : "no"}`,
    `Hunt event unlocked: ${c.huntKaelUnlocked ? "yes" : "no"}`,
    "",
    "Companions:",
    ...world.relationships.map(
      (r) =>
        `- ${r.npcName}: trust ${r.trust}, bond held ${r.bondEscrow} gold, ${r.betrayed ? "betrayed you" : "still loyal"}`
    ),
    "",
    "Events in order:",
    ...world.events.map(describeEvent),
  ];
  return lines.join("\n");
}

export async function narrate(world: WorldSnapshot): Promise<{ text: string; narrated: boolean }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || world.events.length === 0) {
    return { text: fallbackRecap(world), narrated: false };
  }

  try {
    const client = new Anthropic({ apiKey });
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 400,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: `FACTS:\n${buildFacts(world)}\n\nWrite the recap.`,
        },
      ],
    });

    const text = msg.content
      .filter((block) => block.type === "text")
      .map((block) => (block as { text: string }).text)
      .join("")
      .trim();

    if (!text) return { text: fallbackRecap(world), narrated: false };
    return { text, narrated: true };
  } catch (err) {
    console.error("recap narration failed, using fallback:", err);
    return { text: fallbackRecap(world), narrated: false };
  }
}
