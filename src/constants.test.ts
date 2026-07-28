import { describe, expect, it } from "vitest";
import { ABES, BUFFER, DEVICE_MONITOR, PHENIPS, indexClassFor } from "./constants";

describe("valori di riferimento dalla specifica (doc/05-insect-pressure-index.md)", () => {
  it("epidemic_7d_reference = 306.01", () => {
    expect(ABES.epidemic7dReference).toBeCloseTo(306.01, 2);
  });

  it("parental_reemergence_dd = 276.829 (557 × 0.497, verificato indipendentemente: la doc riportava 276.93 per errore)", () => {
    expect(PHENIPS.parentalReemergenceDd).toBeCloseTo(276.829, 2);
  });

  it("buffer_radius_m = 126.16", () => {
    expect(BUFFER.radiusM).toBeCloseTo(126.16, 2);
  });

  it("offline_after_h = 4 (1h di cadenza attesa x 4 pacchetti mancanti)", () => {
    expect(DEVICE_MONITOR.offlineAfterH).toBe(4);
  });

  it("offline_threshold_h = 5 (offline_after_h + 1h di tolleranza sullo slittamento del deep sleep)", () => {
    expect(DEVICE_MONITOR.offlineThresholdH).toBe(5);
  });
});

describe("indexClassFor", () => {
  it.each([
    [0, "low"],
    [20, "low"],
    [21, "moderate"],
    [40, "moderate"],
    [41, "elevated"],
    [60, "elevated"],
    [61, "high"],
    [80, "high"],
    [81, "critical"],
    [100, "critical"],
  ] as const)("%i -> %s", (value, expected) => {
    expect(indexClassFor(value)).toBe(expected);
  });
});
