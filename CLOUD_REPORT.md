# CLOUD M4 report

Base: `feat/integrate-cloud-m3` at `8c88808`; working branch: `codex/cloud-next-m4`.

## Unit 1 — make the 300-second comparison trustworthy

Changed `tools/behavior-metrics.mjs`: maintaining player HP/alive alone did not prevent absorption defeats from exhausting lives and pausing the simulation. Restore pause/lives each measurement frame and report actual simulated seconds. This affects the measurement harness only; gameplay rules are unchanged.

`node --test`: 46/46 passed. Seed 11 / 300 seconds before and after this fix has identical baseline results: attacks per 30s `[21,25,51,41,61,72,41,60,50,78]` (500 total), state changes p50 1.01 / p90 1.80 / max 2.53, search↔flee 10226, apex samples 306 (176 not largest). Actual corrected simulation time: 300s. Experimental tuning runs that stopped on player game over were discarded.

## Unit 2 — flee hysteresis and absorption escape

Changed `js/ai.js`, `tests/ai-rules.test.mjs`: keep threat detection/entry at approved 320, release a remembered threat at 360; retain sand-field escape to 280 (entry 220); after an absorption grab breaks, keep escaping until maintain distance + 80, unless absorber dies or can no longer absorb. No minimum timer is needed. New regression coverage checks each release condition. Existing role, personality, risk-taking, duel, survival and retaliation tests remain unchanged.

Seed 11 / 300s: attacks `[33,36,55,46,74,79,66,31,47,65]`, total **532** vs 500; p50 **0.37**, p90 **0.61**, max **1.02** vs 1.01/1.80/2.53; search↔flee **3364** vs 10226 (**67.1% fewer**); apex samples **304** vs 306, not-largest 146 vs 176. Proposed p90 and transition targets pass. Apex occupancy is 0.65% lower on this single seed, so the literal no-decrease condition is not claimed for this unit; assess final combined result and other seeds. Population remains 65–79. `node --test`: **50/50 pass**.

No new random calls were introduced. Changed decisions alter subsequent existing `ai` stream consumption (movement/dodge choices), so the world trajectories diverge; exact bucket-by-bucket nondecrease is not guaranteed. Initial alternatives with 400 release and/or hold timers were rejected for poorer results. Changing entry to 160 was rejected because it breaks existing approved survival tests.

## Unit 3 — reactive contact defense

Changed `js/ai.js`, `tests/ai-rules.test.mjs`: an equal/smaller hostile already within body radii + 40 (capped at 160) triggers attack if HP>30%, attack ready and in reach, otherwise escape. This is after survival/command/retaliation, applies to cautious AI only at safe target positions, and does not authorize distant prey hunting. Personality distribution stays **34/33/33**.

Seed 11 / 300s, vs unit 2: attacks `[40,69,68,85,59,59,61,75,40,68]` = **624** vs 532 (baseline 500); p50/p90/max **0.45/0.65/1.32** vs 0.37/0.61/1.02; search↔flee **3731** vs 3364 (baseline 10226, **63.5% reduction**); apex occupancy **268** vs 304 (baseline 306), not-largest 122. Population 67–79. `node --test`: **52/52 pass**. State stability targets still pass, attack total improves 24.8% over baseline. Apex occupancy drops 12.4%; this is explicitly an unmet no-degradation guardrail, not hidden by improved attacks. The title rule is unchanged; more contact combat changes who survives/grows. Further title/ecology balancing requires a separate decision, and no title criteria were changed.
