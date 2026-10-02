# CLOUD M4 report

> 최신 M9: 대열 안정화·P 일시정지·H 플레이 안내·동행 HUD 및 설정 저장. [검증 보고서](reports/M9-development.md).

> 최신 M8: 아군 대열 동행·apex 최대 3명·모래바람 강화 구현. 현재 기획과 검증은 GAME_DESIGN.md M8 및 reports/M8-development.md를 참고.

> 최신 M7: 사용자 지시에 따라 apex 직위를 크기 기준으로 변경. 아군 연결은 ALLY_CHAIN_DESIGN.md 기획만 작성했다. 아래 점수 기준/변경 미승인 기록은 과거 상태이며, 현재 규칙은 GAME_DESIGN.md M7을 따른다.

> 최신 M6: 플레이어 이름/색상 선택 및 별도 크기 순위 구현. 현재 규칙 유지 결정과 검증 결과는 [reports/M6-player-setup.md](reports/M6-player-setup.md) 참고.

> M5 후속 개발: 이름·실시간 순위·생태계 패널·삼중 파도 구현 및 검증 결과는 [reports/M5-development.md](reports/M5-development.md)를 참고. 아래 제안/푸시 상태는 당시 기록이며 현재 구현·브랜치 전달 상태와 구분한다.

> 2026-10-03 사용자 기획 갱신: 아래 M4 기록의 “apex 점유량 감소 = guardrail 실패” 판단은 더 이상 적용하지 않는다. 목표는 희소·빈번한 교체·장기 독점이 시기별로 다양하게 나타나는 생태계다. 기존 수치는 역사적 측정으로 보존한다. 새 평가 기준은 GAME_DESIGN.md의 NEXT 절과 reports/apex-diversity.md를 참고한다.

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

## Unit 4 — combined tuning and search-distance proposals

Changed `js/ai.js`, `tests/ai-rules.test.mjs`, `tools/behavior-metrics.mjs`: final remembered-threat release is **400** (entry remains 320); contact radius remains body radii + 40 capped at 160. Compared with unit 3, seed 11 attacks **625** vs 624, p50/p90/max **0.37/0.59/1.31** vs 0.45/0.65/1.32, search↔flee **3173** vs 3731, apex occupancy **300** vs 268. `node --test`: **52/52 pass**. Final attacks per 30s `[24,66,61,76,42,69,47,80,88,72]`; final population 65–79. Compared with original, switches are down **69.0%**, total attacks up **25%**, and p90 is below 1.0. Individual attack buckets may fall; no claim of bucket-by-bucket improvement.

Additional 300s seeds (fixed harness for both sides):

| Seed | Attacks baseline → final | p90 baseline → final | search↔flee baseline → final | Apex occupancy baseline → final |
|---|---|---|---|---|
| 7 | 488 → 664 | 1.96 → 0.60 | 11469 → 3019 | 350 → 354 |
| 11 | 500 → 625 | 1.80 → 0.59 | 10226 → 3173 | 306 → 300 |
| 23 | 441 → 647 | 1.89 → 0.59 | 10280 → 3064 | 600 → 252 |

**Remaining guardrail failure:** state and attack targets improve consistently, but apex occupancy does not: seed 23 falls substantially. Changes are supplied on the work branch for review, not declared ready for public deployment. Do not merge without deciding whether reduced apex occupancy is acceptable or requires more tuning. No unsupported changes to title eligibility were made. All production random changes remain indirect consumption changes from different decisions; visuals consume no RNG.

### Proposal: search range (not applied)

The metric tool accepts `[seed] [seconds] [detection=320] [wanderScale=1]`. Wander scale multiplies newly selected wander segments in the measurement harness only; it approximates longer exploration, not a new production destination planner.

| seed 11, 300s | attacks | p90 | search↔flee | apex occupancy |
|---|---|---|---|---|
| final default 320/1 | 625 | 0.59 | 3173 | 300 |
| sensing 480/1 | 744 | 0.84 | 3485 | 292 |
| wander duration 320/2 | 635 | 0.60 | 3276 | 116 |

Neither alternative improves transition stability vs the final default. **Proposal:** retain 320 for now. If broader exploration is desired, compare directed safe-food destinations against these two simple alternatives across more seeds before approval. Increasing sensing alone improves attacks but introduces more threat/food oscillation; doubling wander duration strongly reduces apex occupancy. Production config is unchanged.

## Unit 5 — ability activation visibility

Changed `js/abilities.js`, `tests/abilities.test.mjs`: each completed ability displays a 0.75s filled/outlined cast area, origin pulse, and short ability name. The origin remains where the caster fired, including remote yellow fields; labels remain screen-scaled with a dark outline. Existing windup, wave projectile and persistent sand area remain. No title explanation banner/icon was added. Flashes are presentation records, expire independently, and consume no RNG.

`node --test`: **53/53 pass**, including unchanged existing damage/cooldown assertions and flash expiry/origin coverage. Seed 11/300s metrics are **identical before/after the visual change**: attacks 625, p90 0.59, search↔flee 3173, apex 300. `node tools/review-scenarios.mjs`: both approved risk-hysteresis and challenger cases match expected states. `git diff --check`: clean.

Actual headless Chromium browser: keyboard movement, F1 panel, F2/F3 inputs, mute toggle, confirmed full reset, and rendering all five completed ability flashes passed with no page errors. A screenshot of cyan activation was inspected: the filled cone, origin ring, and outlined Korean name are readable at 1280×720 after closing the inspector. Browser casting tests force apex/cooldown in a fixture; a full manual session attaining apex organically was **not** performed. Debug simulation/RNG purity is covered by the existing test suite, not inferred from pressing the keys. Long play balance and other zoom/font/platform combinations remain unverified.

## Proposals requiring user decisions — no implementation

1. **Blue three-direction waves:** propose one aimed center wave and two directions at independently sampled offsets in [-120°, -40°] and [40°, 120°], using `random('ai')` twice at cast start and storing all directions for three identical windup rectangles. Keep 0.6s windup and 10s cooldown **per cast**, 0.5× normal attack damage per target maximum **across all three waves**, shared hit registry and unchanged 120 knockback/immunity. This gives readable separated lanes without triple overlapping burst damage. Approval is required for direction interpretation, damage and cooldown; no three-wave logic has been installed. Two extra `ai` random draws would intentionally change stream consumption if approved.
2. **Personality ratios:** retain 34/33/33. The contact-defense results show cautious prey can answer immediate contact without changing birth distribution. A later proposal reducing cautious share should first include an explicit 34/33/33 → candidate experiment, survivorship and attack/transition/apex measurements; no unmeasured ratio is recommended.
3. **Title criterion:** retain score top 5 with size≥100. Proposal options: size top 5 with size≥100, or score top 5 plus explicit displayed explanation of size eligibility. Size ordering would reward survival/growth over fighting score and can increase same-color absorption dominance; request a decision before implementing. No title explanation UI was added.
4. **Names/ranking HUD:** proposal: stable seeded names assigned once at birth, visible for current top 20 score units; compact top 10 score HUD with apex mark on eligible rows, player row pinned only if requested. Resolve score vs size name cutoff, screen placement and collision/occlusion before implementation. Names must use a separate presentation stream and F2/F3 must not create them on toggle.
5. **Larger world:** proposal: 6000×6000 (1.44× area), scale nominal AI/orb population caps and spawn density by area; first benchmark frame time and attack/contact rate. This increases simulation cost and may reduce encounters if populations are not scaled. Do not change only map size silently.
6. **Wraparound world:** proposal requires toroidal minimum-image distances everywhere (grid queries, collision, absorption, threats, abilities, waves, camera and overlays), seam rendering, and tests for casts/absorptions across seams. Wrapping entity coordinates alone is insufficient. Resolve camera tracking and projectile crossing policy first.

## Final handoff

Work is confined to `codex/cloud-next-m4`; no main/integration push or merge, and the original public `ball-game` repository was not read or modified during this work. Final release distance is 400, generic sensing remains 320, absorption search remains 400, roles/title/ratios/world size and damage/cooldowns remain unchanged. AI stability/attack goals are demonstrated; **apex occupancy guardrail remains unresolved** across seeds, so public deployment is not recommended yet. All deferred proposals above are explicitly unimplemented. No new dependencies are required for the static application or `node --test`; browser automation dependencies were installed outside the repository for validation only.

### Delivery status

Local checkout: `/workspace/ball-game-next`, branch `codex/cloud-next-m4`. Pushing only this branch was attempted. Default HTTPS Git requested authentication; retry with the existing injected GH_TOKEN binding returned **HTTP 401**. The remote work branch is absent; push is **not complete**. No token value was printed or persisted. A verified full-history Git bundle is supplied at `/workspace/cloud-next-m4.bundle` so the work is recoverable without write credentials. Import on a local machine with `git fetch /path/to/cloud-next-m4.bundle codex/cloud-next-m4:codex/cloud-next-m4`, inspect/switch that branch, then push only `codex/cloud-next-m4` using authorized local GitHub authentication. Main and integration branches remain untouched. Restoring valid cloud GitHub write access is the alternative to local import.
