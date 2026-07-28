import { describe, expect, it } from "vitest";
import { INDEX_SEASON, SENTINEL_SEASON, isWithinSeason } from "./season";

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
