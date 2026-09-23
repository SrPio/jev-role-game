import { z } from "zod";
import { ENCOUNTER_IDS, encounterSpec } from "@/lib/jev/encounters";
import { askJev } from "@/lib/jev/server";

const MAX_STATE_BYTES = 4_000;

const Body = z.object({
  encounterId: z.enum(ENCOUNTER_IDS),
  state: z.record(
    z.string().max(40),
    z.union([
      z.string().max(400),
      z.number(),
      z.boolean(),
      z.null(),
      z.array(z.string().max(80)).max(10),
    ]),
  ),
});

export async function POST(request: Request) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Solicitud inválida", issues: parsed.error.issues }, { status: 400 });
  }
  if (JSON.stringify(parsed.data.state).length > MAX_STATE_BYTES) {
    return Response.json({ error: "Estado demasiado grande" }, { status: 413 });
  }

  const decision = await askJev(encounterSpec(parsed.data.encounterId), parsed.data.state);
  return Response.json(decision);
}
