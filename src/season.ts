/**
 * "Siamo in stagione?" — la finestra cambia da worker a worker (W5 parte un
 * mese prima per costruire la baseline), ma il confronto mese/giorno va fatto
 * sempre allo stesso modo e sempre in UTC (vedi doc/06-conventions.md).
 */

export interface SeasonWindow {
  /** 1-based: 1 = gennaio. */
  startMonth: number;
  startDay: number;
  endMonth: number;
  endDay: number;
}

/** W1, W4, W6: la catena dell'indice vero e proprio. */
export const INDEX_SEASON: SeasonWindow = { startMonth: 4, startDay: 1, endMonth: 9, endDay: 30 };

/** W5: un mese prima, per chiudere la baseline prima dell'inizio stagione. */
export const SENTINEL_SEASON: SeasonWindow = { startMonth: 3, startDay: 1, endMonth: 9, endDay: 30 };

/** W0, W2, W7: nessuna finestra, girano tutto l'anno. */
export const ALWAYS_ON: SeasonWindow = { startMonth: 1, startDay: 1, endMonth: 12, endDay: 31 };

/** `date` va passata come istante UTC (es. new Date() in un Worker va bene). */
export function isWithinSeason(date: Date, window: SeasonWindow): boolean {
  const value = (date.getUTCMonth() + 1) * 100 + date.getUTCDate();
  const start = window.startMonth * 100 + window.startDay;
  const end = window.endMonth * 100 + window.endDay;

  if (start <= end) {
    return value >= start && value <= end;
  }
  // Finestra che attraversa il capodanno: non usata oggi da nessun worker,
  // ma gestita per correttezza se un domani servisse.
  return value >= start || value <= end;
}
