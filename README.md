# Foremyc – Shared Worker Lib

Pacchetto interno condiviso da tutti i worker di calcolo (W1–W7): costanti fisse dell'Insect Pressure Index, helper per le finestre stagionali, helper per il registro eventi. Non contiene formule dei worker — solo ciò che sarebbe altrimenti ricopiato in ogni repo.

Riferimento: [Insect Pressure Index](../wiki/03-workers/insect-pressure-index.md) (costanti), [Convenzioni di sviluppo](../wiki/05-workflow/convenzioni.md) (contratto dei worker), [Schema Supabase](../wiki/04-database/schema-supabase.md) (registro eventi).

## Contenuto

| Modulo | Cosa contiene |
|---|---|
| `src/constants.ts` | Tutti i parametri fissi della specifica (stagione, ABES, PHENIPS, Sentinel, buffer, monitoraggio dispositivi, pesi e classi dell'indice) |
| `src/season.ts` | `isWithinSeason(date, window)` + le finestre `INDEX_SEASON` (1 apr–30 set), `SENTINEL_SEASON` (1 mar–30 set), `ALWAYS_ON` |
| `src/events.ts` | `logEvent` (evento puntuale), `openStateEvent` / `resolveStateEvent` (evento di stato con `dedup_key`) |

Le formule di ciascun worker **non** stanno qui: restano in `compute.ts` dentro il repo del worker, pure e testabili in isolamento, come da convenzione.

## Uso in un worker

```ts
import { createClient } from "@supabase/supabase-js";
import { ABES, INDEX_SEASON, isWithinSeason, openStateEvent } from "foremyc-shared-worker-lib";

if (!isWithinSeason(new Date(), INDEX_SEASON)) {
  return; // fuori stagione, non scrive nulla
}

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
await openStateEvent(supabase, {
  serial: terraeId,
  eventType: "tank_almost_full",
  severity: "warning",
  source: "w1_abes_capture",
  dedupKey: "tank_almost_full",
  detail: { tank_fill_ratio: ratio },
});
```

## Installazione in un altro repo

Nessun registro npm: si consuma via dipendenza Git nel `package.json` del worker.

```json
"dependencies": {
  "foremyc-shared-worker-lib": "github:Foremyc/SharedWorkerLib#main"
}
```

Nessuno step di build: `main`/`types` puntano direttamente a `src/index.ts`. Wrangler (via esbuild) bundle il TypeScript sorgente anche dentro `node_modules` senza bisogno di compilarlo prima.

## Sviluppo

```bash
npm install
npm run typecheck
npm test        # vitest — unit test sulle costanti derivate e sulle finestre stagionali
```

Le costanti derivate (es. `ABES.epidemic7dReference`, `PHENIPS.parentalReemergenceDd`) sono verificate contro un calcolo indipendente in `src/constants.test.ts`, non solo ricopiate dalla doc: è così che si è trovato che `parental_reemergence_dd` in `doc/05-insect-pressure-index.md` era sbagliato (`276.93` invece di `276.829`).
