import type { SupabaseClient } from "@supabase/supabase-js";

export type WorkerRunTrigger = "cron" | "manual";
export type WorkerRunStatus = "ok" | "skipped" | "error";

/** Forma comune del "salto per stagione" restituita da runOnce() in tutti i worker. */
interface SkippedResult {
  skipped: true;
  reason: string;
}

function isSkippedResult(result: unknown): result is SkippedResult {
  return !!result && typeof result === "object" && (result as { skipped?: unknown }).skipped === true;
}

/**
 * Avvolge l'esecuzione di un worker (runOnce) e registra il run in
 * `worker_runs`: una riga ad ogni esecuzione, da cron o da `POST /run`
 * manuale. Non è un evento di `events` — quello è il registro visibile in
 * dashboard clienti, questo è telemetria interna per
 * software-backoffice-console. Vedi doc/07-backoffice-console.md.
 *
 * Un errore nella scrittura dell'heartbeat non deve mai far fallire il
 * worker: si logga e si prosegue, stessa filosofia di logEvent.
 */
export async function withWorkerRun<T>(
  supabase: SupabaseClient,
  worker: string,
  trigger: WorkerRunTrigger,
  fn: () => Promise<T>
): Promise<T> {
  const { data: inserted, error: insertError } = await supabase
    .from("worker_runs")
    .insert({ worker, trigger, started_at: new Date().toISOString() })
    .select("id")
    .single();

  if (insertError) {
    console.error("withWorkerRun: insert failed", worker, insertError);
  }
  const runId = inserted?.id as number | undefined;

  try {
    const result = await fn();
    await finishRun(supabase, runId, isSkippedResult(result) ? "skipped" : "ok", result);
    return result;
  } catch (err) {
    await finishRun(supabase, runId, "error", { error: err instanceof Error ? err.message : String(err) });
    throw err;
  }
}

async function finishRun(
  supabase: SupabaseClient,
  runId: number | undefined,
  status: WorkerRunStatus,
  detail: unknown
): Promise<void> {
  if (runId === undefined) return; // l'insert iniziale è già fallito, niente da aggiornare
  const { error } = await supabase
    .from("worker_runs")
    .update({ finished_at: new Date().toISOString(), status, detail: detail ?? {} })
    .eq("id", runId);
  if (error) {
    console.error("withWorkerRun: update failed", runId, error);
  }
}
