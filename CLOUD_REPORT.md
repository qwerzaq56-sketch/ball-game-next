# CLOUD M4 report

Base: `feat/integrate-cloud-m3` at `8c88808`; working branch: `codex/cloud-next-m4`.

## Unit 1 — make the 300-second comparison trustworthy

Changed `tools/behavior-metrics.mjs`: maintaining player HP/alive alone did not prevent absorption defeats from exhausting lives and pausing the simulation. Restore pause/lives each measurement frame and report actual simulated seconds. This affects the measurement harness only; gameplay rules are unchanged.

`node --test`: 46/46 passed. Seed 11 / 300 seconds before and after this fix has identical baseline results: attacks per 30s `[21,25,51,41,61,72,41,60,50,78]` (500 total), state changes p50 1.01 / p90 1.80 / max 2.53, search↔flee 10226, apex samples 306 (176 not largest). Actual corrected simulation time: 300s. Experimental tuning runs that stopped on player game over were discarded.
