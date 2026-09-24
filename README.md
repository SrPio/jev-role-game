# Crónicas de Eldmoor

RPG pixel art 8-bit donde los NPC **toman decisiones con Jev** (TypeSafe) vía Vercel AI Gateway.
Jev no genera diálogo: recibe un estado tipado y devuelve `choice` + `probabilities` + `confidence`,
y el juego ejecuta esa decisión. 5 capítulos, combates por turnos y 4 finales.

![Pantalla de título](docs/screenshots/titulo.png)

## Capturas

**Grul decide en vivo.** El panel *Cerebro de Jev* muestra el estado que recibe Jev, la probabilidad de cada opción y su confianza.

![Grul decide dejar pasar al héroe](docs/screenshots/decision-grul.png)

**Combate por turnos.** Cada turno del enemigo lo elige Jev; con confianza baja (DUDA) el NPC titubea y pega más flojo.

![Combate contra Kael](docs/screenshots/combate-kael.png)

| Modo Jev: Jev juega al héroe | La Torre de Morvath | Final: El Héroe de Eldmoor |
| --- | --- | --- |
| ![Modo Jev](docs/screenshots/modo-jev.png) | ![Torre de Morvath](docs/screenshots/torre-morvath.png) | ![Final del héroe](docs/screenshots/final-heroe.png) |

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

## Modo Jev

En el título puedes elegir **Modo Jev**: Jev juega al héroe (con personalidad Noble, Codicioso o Prudente)
contra NPCs que también decide Jev. Tú solo miras. Las opciones del héroe se construyen en el servidor a
partir del nodo de la historia (`lib/jev/hero.ts`, `app/api/hero/route.ts`), así que el cliente nunca
define las preguntas; en combate, Jev elige la acción del héroe con el encuentro `hero_combat`.

Controles: ↑↓ / 1-4 elegir · ENTER avanzar · J panel de Jev · M sonido.
