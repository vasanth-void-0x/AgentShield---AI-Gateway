# Performance Validation

Agent V includes a dependency-free, bounded load-test harness for the
rendered homepage. The test targets a local production Cloudflare Worker
preview so CI never generates artificial traffic against the public demo.

## Reproduce the Test

Build and start the Worker preview:

```bash
npm ci
npm run build
npm run preview -- --port 8787
```

In a second terminal, run:

```bash
npm run test:load
```

The defaults issue 100 requests with a concurrency of 10 after five warm-up
requests. The run fails if any request fails or p95 latency exceeds 1,000 ms.
All values are configurable through the environment variables documented in
`scripts/load-test.mjs`.

## Evidence

The **Agent V Performance Smoke Test** GitHub Actions workflow repeats the
production-build test after relevant changes and can also be triggered
manually. Each run uploads its JSON output as a workflow artifact so the result
is tied to a specific commit and execution environment.

Latest verified run: [GitHub Actions #1](https://github.com/vasanth-void-0x/AgentShield---AI-Gateway/actions/runs/32022279232)

| Metric | Result |
| --- | ---: |
| Requests | 100 |
| Concurrency | 10 |
| Successful responses | 100 (HTTP 200) |
| Failed responses | 0 |
| Median latency | 229.79 ms |
| p95 latency | 788.39 ms |
| Throughput | 30.04 requests/second |

The machine-readable result is preserved in [`latest.json`](latest.json).

This bounded test is a reproducible performance smoke check, not a substitute
for production capacity planning or sustained load testing.
