import { describe, expect, it, vi } from "vitest";
import { withWorkerRun } from "./runs";

function fakeSupabase() {
  const query: Record<string, any> = {};
  query.insert = vi.fn(() => query);
  query.select = vi.fn(() => query);
  query.single = vi.fn().mockResolvedValue({ data: { id: 7 }, error: null });
  query.update = vi.fn(() => query);
  query.eq = vi.fn().mockResolvedValue({ error: null });
  return { client: { from: vi.fn(() => query) } as any, query };
}

describe("withWorkerRun error details", () => {
  it("stores extracted structured details while keeping other runs compatible", async () => {
    const { client, query } = fakeSupabase();
    const failure = Object.assign(new Error("w8_provider_error"), { code: "http_5xx", attempt: 2 });
    await expect(withWorkerRun(client, "w8_effis", "cron", async () => { throw failure; }, {
      errorDetails: (error) => ({ code: (error as typeof failure).code, attempt: (error as typeof failure).attempt }),
    })).rejects.toBe(failure);
    expect(query.update).toHaveBeenCalledWith({
      finished_at: expect.any(String), status: "error", detail: { code: "http_5xx", attempt: 2 },
    });
  });

  it("keeps the previous error detail by default", async () => {
    const { client, query } = fakeSupabase();
    await expect(withWorkerRun(client, "w1", "cron", async () => { throw new Error("old-error"); }))
      .rejects.toThrow("old-error");
    expect(query.update).toHaveBeenCalledWith(expect.objectContaining({
      status: "error", detail: { error: "old-error" },
    }));
  });
});
