import assert from "node:assert/strict";
import test from "node:test";

import { analyzePrompt, TEST_CASES } from "../lib/security-engine.ts";

test("all deterministic security scenarios match their expected verdicts", () => {
  const failures = TEST_CASES.flatMap((scenario) => {
    const actual = analyzePrompt(scenario.prompt, scenario.tool).verdict;
    return actual === scenario.expected
      ? []
      : [{ id: scenario.id, expected: scenario.expected, actual }];
  });

  assert.deepEqual(failures, []);
  assert.equal(TEST_CASES.length, 18);
});
