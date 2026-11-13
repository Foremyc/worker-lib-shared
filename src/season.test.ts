import { describe, expect, it } from "vitest";
import {
  INDEX_SEASON,
  SENTINEL_SEASON,
  isDateInSeason,
  isWithinSeason,
  parseSeasonWindow,
  seasonBounds,
  sentinelSeason,
} from "./season";

function utcDate(month: number, day: number, year = 2026): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

describe("isWithinSeason", () => {
  it("INDEX_SEASON: dentro dal 1 aprile al 30 settembre", () => {
    expect(isWithinSeason(utcDate(4, 1), INDEX_SEASON)).toBe(true);
    expect(isWithinSeason(utcDate(7, 15), INDEX_SEASON)).toBe(true);
    expect(isWithinSeason(utcDate(9, 30), INDEX_SEASON)).toBe(true);
  });

  it("INDEX_SEASON: fuori il 31 marzo e il 1 ottobre", () => {
    expect(isWithinSeason(utcDate(3, 31), INDEX_SEASON)).toBe(false);
    expect(isWithinSeason(utcDate(10, 1), INDEX_SEASON)).toBe(false);
  });

  it("SENTINEL_SEASON: parte un mese prima di INDEX_SEASON", () => {
    expect(isWithinSeason(utcDate(3, 1), SENTINEL_SEASON)).toBe(true);
    expect(isWithinSeason(utcDate(3, 1), INDEX_SEASON)).toBe(false);
    expect(isWithinSeason(utcDate(2, 28), SENTINEL_SEASON)).toBe(false);
  });
});

describe("parseSeasonWindow", () => {
  const fallback = INDEX_SEASON;

  it("assente, null o vuota → fallback", () => {
    expect(parseSeasonWindow(undefined, fallback)).toBe(fallback);
    expect(parseSeasonWindow(null, fallback)).toBe(fallback);
    expect(parseSeasonWindow("", fallback)).toBe(fallback);
    expect(parseSeasonWindow("   ", fallback)).toBe(fallback);
  });

  it("formato valido, con spazi tollerati", () => {
    const expected = { startMonth: 4, startDay: 1, endMonth: 12, endDay: 31 };
    expect(parseSeasonWindow("04-01:12-31", fallback)).toEqual(expected);
    expect(parseSeasonWindow("  04-01:12-31  ", fallback)).toEqual(expected);
  });

  it("valori invalidi → RangeError", () => {
    for (const bad of ["13-01:12-31", "04-31:09-30", "10-01:03-31", "abc", "04-01", "4-1:9-30", "02-29:02-29x"]) {
      expect(() => parseSeasonWindow(bad, fallback)).toThrow(RangeError);
    }
  });
});

describe("sentinelSeason", () => {
  it("senza variabile dà esattamente SENTINEL_SEASON", () => {
    expect(sentinelSeason({})).toEqual(SENTINEL_SEASON);
  });

  it("con INDEX_SEASON che finisce più tardi: 03-01 … 12-31", () => {
    expect(sentinelSeason({ INDEX_SEASON: "04-01:12-31" })).toEqual({
      startMonth: 3, startDay: 1, endMonth: 12, endDay: 31,
    });
  });
});

describe("seasonBounds", () => {
  it("date YYYY-MM-DD con zeri", () => {
    expect(seasonBounds(2026, INDEX_SEASON)).toEqual({ start: "2026-04-01", end: "2026-09-30" });
  });
});

describe("isDateInSeason", () => {
  it("estremi inclusi", () => {
    expect(isDateInSeason("2026-04-01", INDEX_SEASON)).toBe(true);
    expect(isDateInSeason("2026-03-31", INDEX_SEASON)).toBe(false);
    expect(isDateInSeason("2026-09-30", INDEX_SEASON)).toBe(true);
    expect(isDateInSeason("2026-10-01", INDEX_SEASON)).toBe(false);
  });
});
