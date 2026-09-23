# Crónicas de Eldmoor

RPG pixel art 8-bit donde los NPC **toman decisiones con Jev** (TypeSafe) vía Vercel AI Gateway.
Jev no genera diálogo: recibe un estado tipado y devuelve `choice` + `probabilities` + `confidence`,
y el juego ejecuta esa decisión. 5 capítulos, combates por turnos y 4 finales.

## Arranque

```bash
pnpm install
```

Crea `.env.local` con tu key del AI Gateway (o usa `pnpm dlx vercel ai-gateway setup` / `vercel env pull`):

```
AI_GATEWAY_API_KEY=vck_...
```

```bash
pnpm dev
```

Abre http://localhost:3000. Añade `?debug=1` para saltar a cualquier nodo y sobrescribir el estado.

## Cómo se usa Jev

- `lib/jev/encounters.ts` — todas las preguntas (choice / boolean / score) por encuentro.
- `app/api/decide/route.ts` — único punto que llama a Jev; el cliente solo envía `{ encounterId, state }`.
- `lib/jev/server.ts` — `experimental_evaluate({ model: "typesafe-ai/jev", state, questions })`.
  La confianza viene en `providerMetadata.typesafe.confidence`.
- `lib/story/story.ts` — la historia como datos; cada nodo `jev` construye el estado y resuelve la decisión.
- Confianza < 0.55 → el NPC **duda**: te da un golpe inicial, pega más flojo y no llega a huir.
- Si el Gateway falla, un fallback local mantiene el juego en marcha (marcado "OFFLINE" en el panel).

Controles: ↑↓ / 1-4 elegir · ENTER avanzar · J panel de Jev · M sonido.
