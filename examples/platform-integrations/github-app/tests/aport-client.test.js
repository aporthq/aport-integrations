const { APortClient } = require("../src/aport-client");

describe("APortClient", () => {
  it("normalizes successful policy verification responses", async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      text: async () => JSON.stringify({ verified: true, message: "ok" }),
    });
    const client = new APortClient({
      apiKey: "test-key",
      baseUrl: "https://aport.example",
      fetchImpl,
    });

    const result = await client.verifyPolicy("code.repository.merge.v1", "agt_1", {
      repo: "aporthq/demo",
    });

    expect(result.verified).toBe(true);
    expect(result.message).toBe("ok");
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://aport.example/api/verify/policy/code.repository.merge.v1",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-key",
        }),
      })
    );
  });

  it("throws clear API errors", async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: false,
      status: 403,
      statusText: "Forbidden",
      text: async () => JSON.stringify({ message: "denied" }),
    });
    const client = new APortClient({
      apiKey: "test-key",
      fetchImpl,
    });

    await expect(
      client.verifyPolicy("code.repository.merge.v1", "agt_1", {})
    ).rejects.toThrow("APort API error (403): denied");
  });
});
