import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Rilanci chiesti dalla pagina di salute della dashboard (tabella `worker_manual_launches`).
 *
 * La dashboard non chiama i worker: scrive una richiesta. Ogni worker, con questo cron
 * ogni minuto, prende le sue richieste e le esegue dentro `scheduled()`, che ha 15 minuti
 * come i job notturni. Una chiamata HTTP invece verrebbe cancellata da Cloudflare appena
 * chi chiama si scollega.
 */
export const RILANCI_CRON = "* * * * *";

export interface Rilancio {
  id: number;
  step: string;
  /** TERRAE da rifare; null = tutto il worker. */
  serial: string | null;
}

/** Errore con un codice corto per `worker_manual_launches.error_code` (mai testo libero). */
export function erroreRilancio(code: string): Error & { code: string } {
  return Object.assign(new Error(code), { code });
}

/**
 * Da restituire in `esegui` quando il worker ha solo consegnato il lavoro al suo container o
 * coordinatore (W2 CDS, W3, W5 storico, W10 SPEI): la richiesta finisce `fatto` con questo codice,
 * perché il lavoro vero continua a parte e può durare ore.
 */
export const PASSATO_AL_CONTAINER = "passato_al_container";

/** Il container o il coordinatore sta già facendo questo lavoro: un secondo avvio è stato rifiutato. */
export const giaInCorso = () => erroreRilancio("gia_in_corso");

/** Il worker non sa rilanciare quel passo (o non su una TERRAE sola). */
export const passoSconosciuto = () => erroreRilancio("passo_sconosciuto");

function codice(err: unknown): string {
  const c = (err as { code?: unknown } | null)?.code;
  return typeof c === "string" && /^[a-z_]{1,50}$/.test(c) ? c : "internal_error";
}

/**
 * Prende le richieste in coda per `worker` (le segna in corso nel database, una volta sola
 * anche se due cron si accavallano) e le esegue una alla volta con `esegui`. Ognuna finisce
 * `fatto` o `fallito` col codice dell'errore. Non lancia mai: un rilancio rotto non deve
 * far fallire il cron. Se `esegui` restituisce `PASSATO_AL_CONTAINER` la richiesta finisce `fatto`
 * con quel codice. Restituisce quante richieste ha preso.
 */
export async function eseguiRilanci(
  supabase: SupabaseClient,
  worker: string,
  esegui: (r: Rilancio) => Promise<unknown>
): Promise<number> {
  let presi: Rilancio[];
  try {
    const { data, error } = await supabase.rpc("prendi_rilanci", { p_worker: worker });
    if (error) throw error;
    presi = (data ?? []) as Rilancio[];
  } catch (error) {
    console.error("eseguiRilanci: lettura delle richieste fallita", worker, error);
    return 0;
  }
  for (const r of presi) {
    let esito: { state: "fatto" | "fallito"; error_code: string | null } = { state: "fatto", error_code: null };
    try {
      if ((await esegui(r)) === PASSATO_AL_CONTAINER) esito = { state: "fatto", error_code: PASSATO_AL_CONTAINER };
    } catch (err) {
      console.error("eseguiRilanci: rilancio fallito", worker, r.step, r.serial, err);
      esito = { state: "fallito", error_code: codice(err) };
    }
    try {
      const { error } = await supabase
        .from("worker_manual_launches")
        .update({ ...esito, finished_at: new Date().toISOString() })
        .eq("id", r.id);
      if (error) throw error;
    } catch (error) {
      // resta «in corso»: dopo 20 minuti il database la segna interrotta
      console.error("eseguiRilanci: esito non scritto", worker, r.id, error);
    }
  }
  return presi.length;
}
