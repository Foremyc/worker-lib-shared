import { describe, expect, it, vi } from "vitest";
import { reportSteps, summarizeSteps, type StepReport } from "./status";

function fakeSupabase() {
  const query = { upsert: vi.fn().mockResolvedValue({ error: null }) };
  return { client: { from: vi.fn(() => query) } as any, query };
}

const row: StepReport = {
  serial: "TERRAE-1", step: "fwi", state: "error", errorCode: "provider_unavailable",
  dataDate: "2026-11-06", detail: { http_status: 503 },
};

describe("reportSteps", () => {
  it("upserts one row per step with snake_case columns and run_id", async () => {
    const { client, query } = fakeSupabase();
    await reportSteps(client, "w8_effis", 42, [row]);
    expect(client.from).toHaveBeenCalledWith("worker_terrae_status");
    expect(query.upsert).toHaveBeenCalledOnce();
    expect(query.upsert).toHaveBeenCalledWith([{
      worker: "w8_effis", serial: "TERRAE-1", step: "fwi", state: "error",
      error_code: "provider_unavailable", data_date: "2026-11-06", revision: null,
      run_id: 42, detail: { http_status: 503 }, last_attempt_at: expect.any(String),
    }], { onConflict: "worker,serial,step" });
  });

  it("sends nulls and empty detail for absent fields, and never last_ok_at", async () => {
    const { client, query } = fakeSupabase();
    await reportSteps(client, "w", undefined, [{ serial: "S", step: "x", state: "ok" }]);
    const sent = query.upsert.mock.calls[0][0][0];
    expect(sent).toMatchObject({ error_code: null, data_date: null, revision: null, run_id: null, detail: {} });
    expect(sent).not.toHaveProperty("last_ok_at");
  });

  it("does not throw when upsert rejects", async () => {
    const { client, query } = fakeSupabase();
    query.upsert.mockRejectedValue(new Error("network down"));
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(reportSteps(client, "w8_effis", 1, [row])).resolves.toEqual(
      { terrae: 1, ok: 0, warning: 0, error: 1, waiting: 0, not_applicable: 0 });
    expect(err).toHaveBeenCalled();
    err.mockRestore();
  });

  it("logs and returns the summary when upsert returns an error", async () => {
    const { client, query } = fakeSupabase();
    query.upsert.mockResolvedValue({ error: { message: "boom" } });
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    const s = await reportSteps(client, "w", 1, [row]);
    expect(s.error).toBe(1);
    expect(err).toHaveBeenCalled();
    err.mockRestore();
  });

  it("skips the call for an empty list", async () => {
    const { client } = fakeSupabase();
    await expect(reportSteps(client, "w", 1, [])).resolves.toEqual(
      { terrae: 0, ok: 0, warning: 0, error: 0, waiting: 0, not_applicable: 0 });
    expect(client.from).not.toHaveBeenCalled();
  });
});

describe("summarizeSteps", () => {
  it("counts distinct serials and per-row states", () => {
    const s = summarizeSteps([
      { serial: "A", step: "x", state: "ok" },
      { serial: "A", step: "y", state: "warning" },
      { serial: "B", step: "x", state: "not_applicable" },
    ]);
    expect(s).toEqual({ terrae: 2, ok: 1, warning: 1, error: 0, waiting: 0, not_applicable: 1 });
  });
});
