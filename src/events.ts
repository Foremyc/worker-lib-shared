import type { SupabaseClient } from "@supabase/supabase-js";

export type EventSeverity = "info" | "warning" | "critical";

export interface EventInput {
  serial: string;
  eventType: string;
  severity: EventSeverity;
  /** Worker che scrive la riga, es. "w1_abes_capture". */
  source: string;
  detail?: Record<string, unknown>;
}

/**
 * Evento puntuale (un fatto avvenuto, non una condizione che dura): sempre
 * una riga nuova, nessuna deduplica. Es. tank_emptied, capture_gap_backfilled.
 */
export async function logEvent(supabase: SupabaseClient, input: EventInput): Promise<void> {
  const { error } = await supabase.from("events").insert({
    serial: input.serial,
    event_type: input.eventType,
    severity: input.severity,
    source: input.source,
    detail: input.detail ?? {},
  });
  if (error) {
    console.error("logEvent failed", input.eventType, error);
  }
}

/**
 * Evento di stato (una condizione che dura, es. device_offline,
 * tank_almost_full): apre una riga solo se non ce n'è già una aperta con lo
 * stesso (serial, dedupKey). L'indice univoco parziale su events lo
 * garantisce comunque a livello DB; questo helper evita solo l'insert inutile.
 */
export async function openStateEvent(
  supabase: SupabaseClient,
  input: EventInput & { dedupKey: string }
): Promise<void> {
  const { data: existing, error: selectError } = await supabase
    .from("events")
    .select("id")
    .eq("serial", input.serial)
    .eq("dedup_key", input.dedupKey)
    .is("resolved_at", null)
    .maybeSingle();

  if (selectError) {
    console.error("openStateEvent: select failed", input.eventType, selectError);
    return;
  }
  if (existing) return;

  const { error: insertError } = await supabase.from("events").insert({
    serial: input.serial,
    event_type: input.eventType,
    severity: input.severity,
    source: input.source,
    detail: input.detail ?? {},
    dedup_key: input.dedupKey,
  });
  if (insertError) {
    console.error("openStateEvent: insert failed", input.eventType, insertError);
  }
}

/** Chiude l'evento di stato aperto per (serial, dedupKey), se esiste. */
export async function resolveStateEvent(
  supabase: SupabaseClient,
  serial: string,
  dedupKey: string
): Promise<void> {
  const { error } = await supabase
    .from("events")
    .update({ resolved_at: new Date().toISOString() })
    .eq("serial", serial)
    .eq("dedup_key", dedupKey)
    .is("resolved_at", null);
  if (error) {
    console.error("resolveStateEvent failed", dedupKey, error);
  }
}
