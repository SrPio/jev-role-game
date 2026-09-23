import { z } from "zod";
import { HERO_PERSONALITY_IDS, heroChoiceSpec } from "@/lib/jev/hero";
import { askJev } from "@/lib/jev/server";
import { GameStateSchema } from "@/lib/story/schema";

const Body = z.object({
  nodeId: z.string().max(40),
  game: GameStateSchema,
  personality: z.enum(HERO_PERSONALITY_IDS),
  recentEvents: z.array(z.string().max(300)).max(4),
});

/** Jev mode: Jev picks the hero's option for a story choice node. */
export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Solicitud inválida", issues: parsed.error.issues }, { status: 400 });
  }
  const { nodeId, game, personality, recentEvents } = parsed.data;
  const built = heroChoiceSpec(nodeId, game, personality, recentEvents);
  if (!built) return Response.json({ error: "El nodo no es una elección" }, { status: 400 });

  return Response.json(await askJev(built.spec, built.state));
}
