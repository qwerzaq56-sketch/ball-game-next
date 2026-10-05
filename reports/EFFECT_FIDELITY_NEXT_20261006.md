# 효과 재현 후속 우선 후보 — 읽기 전용 검토

현재 공통·수혜·능력 효과 코드와 초기 `ally-buffs-001`, 신규 `abilities-002` 원화를 비교했다. 이 보고서는 코드에 근거한 **검수·개선 후보**이며 이 담당자의 실제 브라우저 시각 합격/실패 판정이 아니다. IAB 연결이 없는 환경이므로 실제 조작·캡처는 부모가 수행해야 한다. 완료된 003 재생성이나 renderer·자산·git 수정은 하지 않았다.

## 1. 보호막에서 온전한 원과 부분 장식의 중첩

초기 원화는 작은 부분 rim과 잎·서리 조각으로 실제 수혜자를 조용히 표시한다. 현재 `game.js`는 shieldHp가 양수면 반경 r+7/zoom의 cyan **완전한 원**, 선폭 3/zoom을 유지한다. 여기에 실제 냉기 보호막은 `abilityPresentation.js`의 cyan-shield 부분 장식을 r+10/zoom, alpha .22로 합성한다. 일반 보호막은 `effectRasterArt.js`의 leaf-shield 장식도 합성된다. 피격 순간에는 r+3/zoom, 선폭4/zoom의 별도 hitVisual rim이 추가된다. 냉기·일반 보호막의 텍스처 중복은 `shieldTextureKind`로 이미 분리돼 있지만, 벡터 full ring과 실제 수혜 장식 및 피격 rim은 동시에 남는다.

**개선 후보:** 원형 판정·보호막 의미를 보존하면서 평상시 full ring이 원화의 partial rim보다 우세한지 먼저 비교한다. 텍스처 OFF에서도 필요한 보호막 상태 가독성을 유지해야 하므로 무조건 기존 원을 지우는 안은 채택하지 않는다. 실제 검수에서 full ring이 지배적일 때만 낮은 대비 또는 부분 상태 표현을 별도로 기획한다. 새 판정·보호막 종류·수혜 대상은 추가하지 않는다.

**실제 fixture 조건:** `tools/ability-effects-review.html`에서 스킬 cyan E, 크기100, 지역 snow, 배율1, 시점 fire → active, 방향0° →180°를 비교한다. 능력 래스터 ON/OFF 버튼으로 full ring이 남는지 확인하고, DOM result의 startSucceeded와 before/after shieldHp·shieldRemaining으로 실제 수혜/범위 밖을 구분한다. 같은 조건 크기400/배율.5 및 밝은 desert에서 대비를 재확인한다. 일반 보호막은 `tools/character-effects-review.html`의 크기100/지역forest/전투대기에서 **실제 보호막 수혜 / 비수혜** 버튼을 사용한다. 보호막 피격 생성 버튼으로 접촉 순간 중첩을 비교한다. 이 버튼 검수는 통제 scene이며 자연 플레이나 실제 교전 빈도 검증이 아니다.

## 2. 초록 초대·강화의 장식과 상태 아이콘 중복

원화의 초록 지원은 수혜자 주변 작은 잎과 짧은 transfer stroke로 읽힌다. 현재 green-call은 실제 초대/소환 발동 때 caster에 .17, 실제 inviteBuffs가 있는 대상에 .12로 표시한다. 실제 수혜자로 연결한 점은 맞다. 다만 `drawActionArt`는 inviteBuffs·morale·shield 등 여러 강화 상태를 공통 방패형 아이콘으로도 표시한다. 추가 vigor/rally가 있으면 공통 strength 장식도 붙는다. 작은 개체에서 transfer stroke가 새 공격 방향처럼 보이거나 방패 아이콘이 냉기 보호막과 의미가 섞이는지 확인할 가치가 있다.

**개선 후보:** 실제 수혜를 보존하고 초대 발동 cue와 지속 강화 cue의 목적을 구분하는 것이 우선이다. 초기 원화 대비 공통 방패 아이콘이 과한 설명처럼 보이는 경우만 표시 우선순위를 조정하는 후속안을 만든다. 초대 성공 확률을 fixture에서 강제로 바꾸거나 실패를 성공으로 표시하지 않는다.

**실제 fixture 조건:** ability review에서 green E, 크기100, forest, 배율1, fire → active. result before/after에서 inviteBuffs/실제 초대 결과를 확인한 뒤 래스터 ON/OFF 비교한다. 성공한 수혜자가 없으면 해당 scene은 지속 초대 장식 검수 근거가 될 수 없다. green R은 소환·morale의 실제 생성/적용만 확인하며 green E 수혜와 동일하다고 추정하지 않는다. character review에서 color green, size100, combat idle, status buff → overlap, direction0→180으로 공통 strength·방패 아이콘·동상·성장의 중첩을 확인한다. overlap은 수동 상태 fixture이므로 실제 동시 발생률을 의미하지 않는다.

## 회전·알파 확인의 판단 기준

수혜·방사형 장식은 회전하지 않고, cyan sweep·blue wave 및 실제 방향성 공격/회피만 방향을 따른다. 0°/180°에서 배경/몸체 광원은 고정되어야 하고 실제 전면 기하만 돌아야 한다. alpha0의 RGB 미리보기는 빛이나 안개가 실제 보인다는 증거가 아니므로 Canvas 합성 및 ON/OFF 화면으로 판단한다. 이미 원화 기반 재생성된 blue-vortex003은 이 보고서의 재생성 후보에서 제외했다. 실제 fixture DOM의 자산 loaded/failed/pending과 startSucceeded를 기록하고 원화 fidelity 결과와 기능 결과를 구분한다.
