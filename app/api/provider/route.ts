import { defaultProvider } from "@/lib/jev/server";

export const dynamic = "force-dynamic";

/** The engine the title menu starts on, from `DECISION_PROVIDER`. */
export function GET() {
  return Response.json({ default: defaultProvider() });
}
