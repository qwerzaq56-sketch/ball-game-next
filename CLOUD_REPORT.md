# CLOUD M4 report

Base: `feat/integrate-cloud-m3` at `8c88808`; working branch: `codex/cloud-next-m4`.

## Unit 1 — make the 300-second comparison trustworthy

Changed `tools/behavior-metrics.mjs`: maintaining player HP/alive alone did not prevent absorption defeats from exhausting lives and pausing the simulation. Restore pause/lives each measurement frame and report actual simulated seconds. This affects the measurement harness only; gameplay rules are unchanged.

`node --test`: 46/46 passed. Seed 11 / 300 seconds before and after this fix has identical baseline results: attacks per 30s `[21,25,51,41,61,72,41,60,50,78]` (500 total), state changes p50 1.01 / p90 1.80 / max 2.53, search↔flee 10226, apex samples 306 (176 not largest). Actual corrected simulation time: 300s. Experimental tuning runs that stopped on player game over were discarded.

## Unit 2 — flee hysteresis and absorption escape

Changed `js/ai.js`, `tests/ai-rules.test.mjs`: keep threat detection/entry at approved 320, release a remembered threat at 360; retain sand-field escape to 280 (entry 220); after an absorption grab breaks, keep escaping until maintain distance + 80, unless absorber dies or can no longer absorb. No minimum timer is needed. New regression coverage checks each release condition. Existing role, personality, risk-taking, duel, survival and retaliation tests remain unchanged.

Seed 11 / 300s: attacks `[33,36,55,46,74,79,66,31,47,65]`, total **532** vs 500; p50 **0.37**, p90 **0.61**, max **1.02** vs 1.01/1.80/2.53; search↔flee **3364** vs 10226 (**67.1% fewer**); apex samples **304** vs 306, not-largest 146 vs 176. Proposed p90 and transition targets pass. Apex occupancy is 0.65% lower on this single seed, so the literal no-decrease condition is not claimed for this unit; assess final combined result and other seeds. Population remains 65–79. `node --test`: **50/50 pass**.

No new random calls were introduced. Changed decisions alter subsequent existing `ai` stream consumption (movement/dodge choices), so the world trajectories diverge; exact bucket-by-bucket nondecrease is not guaranteed. Initial alternatives with 400 release and/or hold timers were rejected for poorer results. Changing entry to 160 was rejected because it breaks existing approved survival tests.
