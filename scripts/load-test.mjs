import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { performance } from "node:perf_hooks";

const positiveInteger = (name, fallback) => {
  const value = Number.parseInt(process.env[name] ?? String(fallback), 10);
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${name} must be a positive integer`);
  }
  return value;
};

const nonNegativeNumber = (name, fallback) => {
  const value = Number.parseFloat(process.env[name] ?? String(fallback));
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${name} must be a non-negative number`);
  }
  return value;
};

const percentile = (sortedValues, percentileValue) => {
  if (sortedValues.length === 0) return 0;
  const index = Math.max(
    0,
    Math.ceil((percentileValue / 100) * sortedValues.length) - 1,
  );
  return sortedValues[index];
};

const target = new URL(
  process.env.LOAD_TEST_URL ?? "http://127.0.0.1:8787/",
);
const requestCount = positiveInteger("LOAD_TEST_REQUESTS", 100);
const concurrency = Math.min(
  positiveInteger("LOAD_TEST_CONCURRENCY", 10),
  requestCount,
);
const warmupCount = positiveInteger("LOAD_TEST_WARMUP", 5);
const timeoutMs = positiveInteger("LOAD_TEST_TIMEOUT_MS", 5000);
const maxP95Ms = nonNegativeNumber("LOAD_TEST_MAX_P95_MS", 1000);
const maxErrorRate = nonNegativeNumber("LOAD_TEST_MAX_ERROR_RATE", 0);
const outputPath = process.env.LOAD_TEST_OUTPUT;

const request = async () => {
  const startedAt = performance.now();
  try {
    const response = await fetch(target, {
      redirect: "manual",
      headers: {
        accept: "text/html,application/xhtml+xml",
        "user-agent": "AgentShield-Bounded-Load-Test/1.0",
      },
      signal: AbortSignal.timeout(timeoutMs),
    });
    const body = await response.arrayBuffer();
    return {
      durationMs: performance.now() - startedAt,
      ok: response.status >= 200 && response.status < 400,
      status: response.status,
      bytes: body.byteLength,
      error: null,
    };
  } catch (error) {
    return {
      durationMs: performance.now() - startedAt,
      ok: false,
      status: 0,
      bytes: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

for (let index = 0; index < warmupCount; index += 1) {
  const result = await request();
  if (!result.ok) {
    throw new Error(
      `Warm-up request failed with ${result.status || result.error}`,
    );
  }
}

const results = [];
let nextRequest = 0;
const startedAt = performance.now();

await Promise.all(
  Array.from({ length: concurrency }, async () => {
    while (nextRequest < requestCount) {
      nextRequest += 1;
      results.push(await request());
    }
  }),
);

const elapsedMs = performance.now() - startedAt;
const latencies = results
  .map((result) => result.durationMs)
  .sort((left, right) => left - right);
const failures = results.filter((result) => !result.ok);
const statusCodes = Object.fromEntries(
  [...new Set(results.map((result) => result.status))]
    .sort((left, right) => left - right)
    .map((status) => [
      String(status),
      results.filter((result) => result.status === status).length,
    ]),
);
const errorRate = failures.length / results.length;

const summary = {
  generatedAt: new Date().toISOString(),
  methodology: "bounded homepage GET load test against a local production Worker preview",
  target: target.toString(),
  requests: requestCount,
  concurrency,
  warmupRequests: warmupCount,
  successfulRequests: results.length - failures.length,
  failedRequests: failures.length,
  errorRate: Number(errorRate.toFixed(4)),
  throughputRequestsPerSecond: Number(
    (requestCount / (elapsedMs / 1000)).toFixed(2),
  ),
  latencyMs: {
    min: Number(latencies[0].toFixed(2)),
    median: Number(percentile(latencies, 50).toFixed(2)),
    p95: Number(percentile(latencies, 95).toFixed(2)),
    p99: Number(percentile(latencies, 99).toFixed(2)),
    max: Number(latencies.at(-1).toFixed(2)),
  },
  totalBytes: results.reduce((total, result) => total + result.bytes, 0),
  statusCodes,
  thresholds: {
    maxP95Ms,
    maxErrorRate,
  },
};

console.log(JSON.stringify(summary, null, 2));

if (outputPath) {
  const absoluteOutputPath = resolve(outputPath);
  await mkdir(dirname(absoluteOutputPath), { recursive: true });
  await writeFile(
    absoluteOutputPath,
    `${JSON.stringify(summary, null, 2)}\n`,
    "utf8",
  );
}

if (summary.latencyMs.p95 > maxP95Ms) {
  console.error(
    `p95 latency ${summary.latencyMs.p95}ms exceeded ${maxP95Ms}ms`,
  );
  process.exitCode = 1;
}

if (errorRate > maxErrorRate) {
  console.error(
    `Error rate ${(errorRate * 100).toFixed(2)}% exceeded ${(maxErrorRate * 100).toFixed(2)}%`,
  );
  process.exitCode = 1;
}
