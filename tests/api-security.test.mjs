import assert from "node:assert/strict";
import test from "node:test";

import { POST as analyze } from "../app/api/analyze/route.ts";
import { GET as readState, POST as writeState } from "../app/api/state/route.ts";

function analyzeRequest(body, ip = `198.51.100.${Math.floor(Math.random() * 200) + 1}`) {
  return new Request("https://agentshield.test/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json", "CF-Connecting-IP": ip },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

test("analysis API rejects malformed and invalid input", async () => {
  delete process.env.GROQ_API_KEY;

  assert.equal((await analyze(analyzeRequest("{"))).status, 400);
  assert.equal((await analyze(analyzeRequest({ prompt: "", tool: "none", role: "viewer" }))).status, 400);
  assert.equal((await analyze(analyzeRequest({ prompt: "a".repeat(2001), tool: "none", role: "viewer" }))).status, 400);
  assert.equal((await analyze(analyzeRequest({ prompt: "Safe", tool: "unknown", role: "viewer" }))).status, 400);
  assert.equal((await analyze(analyzeRequest({ prompt: "Safe", tool: "none", role: "owner" }))).status, 400);
});

test("analysis API returns the deterministic fail-safe when Groq is not configured", async () => {
  delete process.env.GROQ_API_KEY;
  const response = await analyze(analyzeRequest({ prompt: "Summarize the public README.", tool: "file-read", role: "viewer" }));
  const payload = await response.json();

  assert.equal(response.status, 200);
  assert.equal(payload.analysis.verdict, "Allow");
  assert.equal(payload.analysis.aiStatus, "not-configured");
});

test("analysis API honors the Cloudflare rate-limit binding", async () => {
  globalThis.__AGENTSHIELD_ENV__ = {
    ANALYZE_RATE_LIMITER: { limit: async () => ({ success: false }) },
  };
  try {
    const response = await analyze(analyzeRequest({ prompt: "Safe", tool: "none", role: "viewer" }));
    assert.equal(response.status, 429);
    assert.equal(response.headers.get("retry-after"), "60");
  } finally {
    delete globalThis.__AGENTSHIELD_ENV__;
  }
});

test("state API is disabled without an admin token", async () => {
  const previous = process.env.AGENTSHIELD_ADMIN_TOKEN;
  delete process.env.AGENTSHIELD_ADMIN_TOKEN;
  try {
    const response = await readState(new Request("https://agentshield.test/api/state"));
    assert.equal(response.status, 503);
  } finally {
    if (previous === undefined) delete process.env.AGENTSHIELD_ADMIN_TOKEN;
    else process.env.AGENTSHIELD_ADMIN_TOKEN = previous;
  }
});

test("state API rejects unauthenticated reads and writes before database access", async () => {
  const previous = process.env.AGENTSHIELD_ADMIN_TOKEN;
  process.env.AGENTSHIELD_ADMIN_TOKEN = "test-admin-token-with-at-least-32-characters";
  try {
    const readResponse = await readState(new Request("https://agentshield.test/api/state"));
    const writeResponse = await writeState(new Request("https://agentshield.test/api/state", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer wrong-token" },
      body: JSON.stringify({ action: "unsupported" }),
    }));

    assert.equal(readResponse.status, 401);
    assert.equal(readResponse.headers.get("www-authenticate"), "Bearer");
    assert.equal(writeResponse.status, 401);
  } finally {
    if (previous === undefined) delete process.env.AGENTSHIELD_ADMIN_TOKEN;
    else process.env.AGENTSHIELD_ADMIN_TOKEN = previous;
  }
});

test("authorized state requests validate input before database access", async () => {
  const previous = process.env.AGENTSHIELD_ADMIN_TOKEN;
  const token = "test-admin-token-with-at-least-32-characters";
  process.env.AGENTSHIELD_ADMIN_TOKEN = token;
  try {
    const malformed = await writeState(new Request("https://agentshield.test/api/state", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: "{",
    }));
    const unsupported = await writeState(new Request("https://agentshield.test/api/state", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ action: "unsupported" }),
    }));

    assert.equal(malformed.status, 400);
    assert.equal(unsupported.status, 400);
  } finally {
    if (previous === undefined) delete process.env.AGENTSHIELD_ADMIN_TOKEN;
    else process.env.AGENTSHIELD_ADMIN_TOKEN = previous;
  }
});
