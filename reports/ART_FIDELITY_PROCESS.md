# 원화 일치 제작 과정

## 01 · 사용자 직접 피드백 · 2026-10-06

guardian-001은 실루엣을 일부 맞췄지만 스타일이 어울리지 않는다는 사용자 평가. 성공/최종 승인으로 취급하지 않는다. 밝은 연두색, 강한 입체 명암, 세밀한 줄기 표현이 원화와 달라진 것이 Codex의 원인 가설이다.

### 다음 실험

1. 승인 원화 objects-t3-r2-001의 첫 행 첫 칸 고목을 직접 잘라 참조 이미지로 보존한다. 원화 전체·잘라낸 영역 좌표·원본을 함께 보존한다.
2. 잘라낸 원화의 형태와 스타일을 동시에 고정한다. 새로 생성한 고목을 참조로 사용하지 않는다.
3. 아래 프롬프트로 투명 자산을 제작한다. 실제 게임에서 원화와 나란히 비교해 채택/재시도 여부와 이유를 기록한다.

### 프롬프트 초안

Extract and reconstruct the guardian tree from the supplied cropped ORIGINAL CONCEPT reference as a transparent game asset. Preserve the exact silhouette, canopy-to-trunk ratio, muted green palette, broad flat layered color shapes, soft restrained shading, line weight and elevated top-down view. Treat this as faithful extraction, not a redesign. Match the reference's upper-left light; no rotation or mirroring. Do not add glossy gradients, bright lime highlights, detailed bark, additional branches, individual tiny leaves or realistic volume. Keep the reference's simplified leaf lobes and short visible brown trunk/roots. Remove only the surrounding terrain and separately rendered glowing buff leaves. No UI, balls, range rings or effects. If reconstruction is necessary, reproduce the reference's shapes rather than inventing new ornament.

### 판정 기준

- 원화와 나란히 놓았을 때 같은 그림 체계로 읽히는가: 색·명암·윤곽·덩어리 크기.
- 원화의 실루엣·줄기와 수관 비율·시점이 유지되는가.
- 실제 배율 0.5/1에서 캐릭터 대비와 기능 구분을 유지하는가.
- 광원 방향과 투명 가장자리가 깨지지 않는가.

성과 확인 전에는 이 제작 방식이 검증됐다고 기획/제안서에 쓰지 않는다. 성공 시 사용한 원본 영역·정확한 프롬프트·리소스·실제 렌더 비교를 연결해 제작 절차를 갱신한다.

## 02 · 원화 영역 직접 추출 실험 결과

원본1536×1024에서 (140,12,380,214)를 그대로 자른 guardian-original-crop.png 사용. guardian-002-extracted-prompt.md에 실제 프롬프트 보존. 사용자 요청에 따라 잘라낸 원화만 제공하고 배경/발광잎 제거·기존 형태 유지 요청. 생성 원본은 guardian-002-extracted.png로 보존·게임 연결.

관찰(Codex의 잠정 평가):001보다 줄기가 짧아지고 색면/윤곽이 원화에 가까움. 원화와002 나란히 비교 및 실제BiomeObjects.draw 검증, 행동불변 테스트1통과·콘솔0. 다만 원본 픽셀의 단순 배경 제거가 아니라 생성 재구성이므로 잎 덩어리 일부가 달라짐. 사용자 최종 스타일 평가 전까지 '완전 일치/확정 성공' 아님.

비교: tools/guardian-fidelity-review.html, reports/guardian-fidelity-002.png 및 guardian-extracted-game-002.png. 제작 제안서에는 **대표 자산의 잠정 개선 사례**로만 반영하며 모든 자산에 일반화하지 않음.
