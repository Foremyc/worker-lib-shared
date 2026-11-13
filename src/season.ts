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

/** Giorni per mese (febbraio fino a 29: il controllo sull'anno non serve qui). */
const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/**
 * Legge una finestra da una variabile d'ambiente nel formato `MM-DD:MM-DD`
 * (estremi inclusi). Assente o vuota → `fallback`. Qualsiasi altro valore
 * lancia RangeError: niente fallback silenzioso su un valore sbagliato.
 */
export function parseSeasonWindow(value: string | null | undefined, fallback: SeasonWindow): SeasonWindow {
  const raw = value?.trim() ?? "";
  if (raw === "") return fallback;

  const match = /^(\d{2})-(\d{2}):(\d{2})-(\d{2})$/.exec(raw);
  if (!match) throw new RangeError("invalid_index_season");

  const [startMonth, startDay, endMonth, endDay] = match.slice(1).map(Number);
  const validDate = (month: number, day: number) =>
    month >= 1 && month <= 12 && day >= 1 && day <= DAYS_IN_MONTH[month - 1];
  if (!validDate(startMonth, startDay) || !validDate(endMonth, endDay)) {
    throw new RangeError("invalid_index_season");
  }
  // Niente finestre a cavallo di capodanno: inizio deve essere <= fine.
  if (startMonth * 100 + startDay > endMonth * 100 + endDay) {
    throw new RangeError("invalid_index_season");
  }
  return { startMonth, startDay, endMonth, endDay };
}

/** Finestra degli indici, sovrascrivibile con la variabile `INDEX_SEASON`. */
export function indexSeason(env: { INDEX_SEASON?: string }): SeasonWindow {
  return parseSeasonWindow(env.INDEX_SEASON, INDEX_SEASON);
}

/**
 * Finestra di W5: parte prima tra SENTINEL_SEASON e indexSeason(env), finisce
 * dopo tra le due. Senza variabile dà esattamente SENTINEL_SEASON.
 */
export function sentinelSeason(env: { INDEX_SEASON?: string }): SeasonWindow {
  const index = indexSeason(env);
  const key = (month: number, day: number) => month * 100 + day;

  const start = key(index.startMonth, index.startDay) < key(SENTINEL_SEASON.startMonth, SENTINEL_SEASON.startDay)
    ? index
    : SENTINEL_SEASON;
  const end = key(index.endMonth, index.endDay) > key(SENTINEL_SEASON.endMonth, SENTINEL_SEASON.endDay)
    ? index
    : SENTINEL_SEASON;

  return {
    startMonth: start.startMonth,
    startDay: start.startDay,
    endMonth: end.endMonth,
    endDay: end.endDay,
  };
}

const pad2 = (n: number) => String(n).padStart(2, "0");

/** Date `YYYY-MM-DD` di inizio e fine della finestra nell'anno dato. */
export function seasonBounds(year: number, window: SeasonWindow): { start: string; end: string } {
  return {
    start: `${year}-${pad2(window.startMonth)}-${pad2(window.startDay)}`,
    end: `${year}-${pad2(window.endMonth)}-${pad2(window.endDay)}`,
  };
}

/** `date` è `YYYY-MM-DD`; confronto solo mese-giorno, senza Date (niente fusi). */
export function isDateInSeason(date: string, window: SeasonWindow): boolean {
  const match = /^\d{4}-(\d{2})-(\d{2})$/.exec(date);
  if (!match) throw new RangeError("invalid_date");

  const value = Number(match[1]) * 100 + Number(match[2]);
  const start = window.startMonth * 100 + window.startDay;
  const end = window.endMonth * 100 + window.endDay;
  return value >= start && value <= end;
}
