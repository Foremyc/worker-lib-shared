import type { SupabaseClient } from "@supabase/supabase-js";

export const STEP_STATES = ["ok", "warning", "error", "waiting", "not_applicable"] as const;
export type StepState = typeof STEP_STATES[number];

/** Catalogo chiuso, identico al CHECK di worker_terrae_status.error_code. */
export const ERROR_CODES = [
  "input_missing",
  "input_stale",
  "provider_unavailable",
  "provider_rejected",
  "provider_no_data",
  "quality_rejected",
  "config_missing",
  "out_of_domain",
  "blocked",
  "internal_error",
] as const;
export type ErrorCode = typeof ERROR_CODES[number];

export interface StepReport {
  serial: string;
  step: string;
  state: StepState;
  errorCode?: ErrorCode | null;
  /** AAAA-MM-GG UTC */
  dataDate?: string | null;
  revision?: string | null;
  /** Solo valori strutturati sicuri: mai err.message, stack o URL con chiavi. */
  detail?: Record<string, unknown>;
}

export interface StepSummary {
  terrae: number;
  ok: number;
  warning: number;
  error: number;
  waiting: number;
  not_applicable: number;
}

/** `terrae` = seriali distinti; i conteggi per stato sono per riga. */
export function summarizeSteps(rows: StepReport[]): StepSummary {
  const summary: StepSummary = { terrae: 0, ok: 0, warning: 0, error: 0, waiting: 0, not_applicable: 0 };
  summary.terrae = new Set(rows.map((r) => r.serial)).size;
  for (const r of rows) summary[r.state]++;
  return summary;
}

/**
 * Scrive in un solo upsert l'ultimo esito di ogni passo in
 * `worker_terrae_status` e ritorna il riepilogo. `last_attempt_at` è sempre
 * inviato; `last_ok_at` no: lo mantiene il trigger del DB. Un errore di
 * scrittura non deve mai far fallire il worker: si logga e si prosegue.
 */
export async function reportSteps(
  supabase: SupabaseClient,
  worker: string,
  runId: number | undefined,
  rows: StepReport[]
): Promise<StepSummary> {
  const summary = summarizeSteps(rows);
  if (rows.length === 0) return summary;
  const now = new Date().toISOString();
  try {
    const { error } = await supabase.from("worker_terrae_status").upsert(
      rows.map((r) => ({
        worker,
        serial: r.serial,
        step: r.step,
        state: r.state,
        error_code: r.errorCode ?? null,
        data_date: r.dataDate ?? null,
        revision: r.revision ?? null,
        last_attempt_at: now,
        run_id: runId ?? null,
        detail: r.detail ?? {},
      })),
      { onConflict: "worker,serial,step" }
    );
    if (error) console.error("reportSteps: upsert failed", worker, error);
  } catch (error) {
    console.error("reportSteps: upsert rejected", worker, error);
  }
  return summary;
}
