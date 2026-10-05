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

## 03 · 전달 가능 잎 형상 개선

원화의 작은 뾰족한 잎 쌍을 코드로 분리 표현. 타원→직선면 첫시도는 각져 보여 곡선으로 수정. guardian-002 본체/게임기능 유지. 준비 때 밝은 잎, 수혜후 작고 어두운 잎. 기존동작불변 테스트1통과·브라우저검증. reports/guardian-leaves-003.png. 원화의4잎 발광과 완전히 일치한 것은 아니며 과한 bloom 없이 최소 형태를 우선.

## 04 · 전체 오브젝트 배치 실행 및 장면 원화 재구성

사용자 직접 요청: 압축·반복 가능한 간단한 툴, 기획 오브젝트 전체 배치. art-batch.py prepare/record/status/pack과 비교페이지 제작. 현재 DEFAULT_OBJECT_IDS13종 전부 별도 imagegen 호출 완료, 원화 crop/정확한 prompt/원본PNG/알파/해시/시간 보존. 옛 기능 후보는 현재13외형의 별칭으로 묶음. 생성13/13, 오류0. 재prepare가 생성metadata/원본을 보존하고 record가 기존결과 덮어쓰기를 거부하는 실제검증 통과. 알파최대254인7항목도 투명최소0/최대250이상으로 인정, 픽셀수정없음.

게임플레이 단계: 기존gameplay-regions-a/b와 기존오브젝트원화 및 신규대표자산을 함께 참조하여 gameplay-a-002 / b-002 생성. 참조최대5장 제한 때문에13자산모두를한번에입력하지않음. A실제참조:gameplay-regions-a-001,objects-t3a-001,배치forest-tree/grass-wind-stack/lake-garland. B실제참조:gameplay-regions-a-001,gameplay-regions-b-001,objects-t3-r2-001,배치snow-shelter/desert-oasis. 정확한프롬프트와원본모두보존.

잠정관찰: 새장면은 원래 A의 넓은개방공간·색상공·변두리식생구성을유지하며신규고목/바람돌/조개와결합. 하지만A의마른나무묘사, B의다소강한세부밀도는후속일치검토대상. 새장면은실제플레이스크린샷이아니며후속렌더목표후보. 13종후보는게임에일괄반영하지않음; 전체장면자연스러움기준으로추후선택·룩조정.

비교페이지13종DOM로딩확인. 브라우저스크린샷은CDP캡처시간초과로실패, 이를시각검증완료로주장하지않음. 리소스전체의스타일완전일치도미확정. 새장면2장은직접이미지검수.
