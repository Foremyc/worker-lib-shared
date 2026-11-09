import { describe, expect, it, vi } from "vitest";
import { eseguiRilanci, erroreRilancio, passoSconosciuto } from "./rilanci";

function fakeSupabase(presi: unknown[] | Error) {
  const update = vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) }));
  const rpc = presi instanceof Error ? vi.fn().mockRejectedValue(presi) : vi.fn().mockResolvedValue({ data: presi, error: null });
  return { client: { rpc, from: vi.fn(() => ({ update })) } as any, rpc, update };
}

describe("eseguiRilanci", () => {
  it("esegue ogni richiesta presa e ne scrive l'esito", async () => {
    const { client, rpc, update } = fakeSupabase([
      { id: 1, step: "fire_risk", serial: "TERRAE-102" },
      { id: 2, step: "boh", serial: null },
      { id: 3, step: "fire_risk", serial: null },
    ]);
    const esegui = vi.fn(async (r: { step: string; serial: string | null }) => {
      if (r.step === "boh") throw passoSconosciuto();
      if (!r.serial) throw new Error("testo libero con dettagli");
    });
    await expect(eseguiRilanci(client, "w11_fire_risk", esegui)).resolves.toBe(3);
    expect(rpc).toHaveBeenCalledWith("prendi_rilanci", { p_worker: "w11_fire_risk" });
    expect(update.mock.calls.map((c: any[]) => [c[0].state, c[0].error_code])).toEqual([
      ["fatto", null],
      ["fallito", "passo_sconosciuto"],
      ["fallito", "internal_error"],
    ]);
  });

  it("non lancia se il database non risponde", async () => {
    const { client } = fakeSupabase(new Error("network down"));
    const esegui = vi.fn();
    await expect(eseguiRilanci(client, "w8_effis", esegui)).resolves.toBe(0);
    expect(esegui).not.toHaveBeenCalled();
  });

  it("i codici sono corti e sicuri", () => {
    expect(erroreRilancio("gia_in_corso").code).toBe("gia_in_corso");
  });
});
