/**
 * Parametri fissi dell'Insect Pressure Index — un solo posto nel codice per
 * tutti i worker (W1-W7), invece di ricopiarli in ogni repo.
 * Fonte: doc/05-insect-pressure-index.md. Se cambia un numero lì, cambia qui.
 */

export const TIME = {
  timezone: "UTC",
} as const;

export const SEASON = {
  /** Mese 1-based, giorno del mese. */
  seasonStart: { month: 4, day: 1 },
  seasonEnd: { month: 9, day: 30 },
  seasonDays: 183,
} as const;

export const ABES = {
  epidemicThresholdSeason: 8000,
  tankCapacityDefault: 5200,
  tankAlmostFullRatio: 0.8,
  tankResetDropRatio: 0.1,
  captureGapMaxDays: 3,
  /** epidemicThresholdSeason * 7 / seasonDays = 306.0109... */
  get epidemic7dReference(): number {
    return (ABES.epidemicThresholdSeason * 7) / SEASON.seasonDays;
  },
} as const;

export const PHENIPS = {
  flightThresholdC: 16.5,
  developmentLowerThresholdC: 8.3,
  developmentUpperThresholdC: 38.9,
  developmentOptimumC: 30.4,
  infestationDdThreshold: 140,
  generationDdTotal: 557,
  parentalReemergenceRatio: 0.497,
  dayLengthReproductiveThresholdH: 14.5,
  /** generationDdTotal * parentalReemergenceRatio = 276.829 */
  get parentalReemergenceDd(): number {
    return PHENIPS.generationDdTotal * PHENIPS.parentalReemergenceRatio;
  },
} as const;

export const SENTINEL = {
  updateAttempt: "weekly",
  staleDays: 21,
  ndrsDeltaRef: 0.14,
  ndwiDeltaRef: 0.13,
  cciDeltaRef: 0.11,
  ndviDeltaRef: 0.09,
} as const;

export const HOST = {
  fullRiskCover: 0.7,
} as const;

export const BUFFER = {
  areaMinHa: 5,
  /** sqrt(50000 / π) = 126.157... */
  radiusM: Math.sqrt(50_000 / Math.PI),
} as const;

export const DEVICE_MONITOR = {
  expectedPacketIntervalH: 1,
  offlineMissedPackets: 4,
  /** Margine per lo slittamento del ciclo di deep sleep di TERRAE (non a cadenza fissa) — vedi Q&A → W7, risposto con "tolleranza di 1h". */
  offlineToleranceH: 1,
  /** expectedPacketIntervalH * offlineMissedPackets */
  get offlineAfterH(): number {
    return DEVICE_MONITOR.expectedPacketIntervalH * DEVICE_MONITOR.offlineMissedPackets;
  },
  /** offlineAfterH + offlineToleranceH — soglia effettiva usata da W7 per decidere l'offline. */
  get offlineThresholdH(): number {
    return DEVICE_MONITOR.offlineAfterH + DEVICE_MONITOR.offlineToleranceH;
  },
} as const;

export const WEATHER = {
  terraeDailySamplesExpected: 24,
  terraeMinCoverageRatio: 0.5,
} as const;

/** Pesi della combinazione finale (W6). La somma resta 1 in entrambi i casi. */
export const INDEX_WEIGHTS = {
  withSentinel: { abes: 0.55, phenips: 0.35, sentinel: 0.1 },
  withoutSentinel: { abes: 0.6, phenips: 0.4 },
} as const;

export type IndexClass = "low" | "moderate" | "elevated" | "high" | "critical";

/** Soglie inclusive sul limite superiore, in ordine crescente. */
export const INDEX_CLASS_THRESHOLDS: ReadonlyArray<{ max: number; indexClass: IndexClass }> = [
  { max: 20, indexClass: "low" },
  { max: 40, indexClass: "moderate" },
  { max: 60, indexClass: "elevated" },
  { max: 80, indexClass: "high" },
  { max: 100, indexClass: "critical" },
];

export function indexClassFor(indexPressure100: number): IndexClass {
  const match = INDEX_CLASS_THRESHOLDS.find((t) => indexPressure100 <= t.max);
  return match ? match.indexClass : "critical";
}
