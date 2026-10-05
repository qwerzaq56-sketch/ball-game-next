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

## 지속 수혜 오브젝트 배치 리소스 연결 · 03:48 KST

scene-coherent-v1의 snow-shelter/desert-oasis PNG를 실제 landmarkArt256캐시에 연결. 피난처는 동굴 입구 대신 눈 덮인 돌 반원, 오아시스는 야자수 대신 바위 테두리·갈대·수련 형태. 광원 반전/회전 없음. 준비/쿨다운에 본체 동일, 효과 대상·반경·수치·난수 불변. 자산별 독립 로딩으로 한 이미지 실패가 다른 두 이미지를 차단하지 않으며 기존 벡터 폴백 유지. 관련10테스트 통과. 실제 BiomeObjects.draw 1/0.5배율 브라우저 확인, 오류/경고0; reports/continuous-landmarks-batch-001.png 및 -half.png. 배치13종 중2종 실제 연결(고목은 별도002 유지), 나머지 후보는 생성/검토 단계. 새 게임플레이 원화와 전체 배경 구성의 일치는 아직 후속 과제.

## 게임플레이 원화003 · 사용자 직접 피드백: 시점과 자연스러운 배치

002에서 오브젝트와 배경 시점이 어긋나며 배치가 인위적이라는 피드백. 기본 image_gen으로 A/B003 제작, 기존001/002 보존. 각각 기존A001 스타일+해당002 장면 직접 참조, 정확한 프롬프트 보존. 통일된 높은 직교 시점·윗면 노출·짧은 접지 그림자·비대칭 군락·지형에 이어지는 가장자리를 명시. 고목 줄기 노출 감소, 오아시스를 지형에 패인 불규칙 웅덩이로 유도.

직접 이미지 검수: A 고목이 주변 수관과 더 이어지고, B 오아시스의 닫힌 원형 테두리가 깨져 지형 연결이 개선됨(잠정평가). B의 바위·석주·흑요석 옆면은 여전히 비교적 많이 보이고, 캐릭터 위치와 중앙 빈 공간은 패널마다 유사하며 일부 균일 반복 식생이 남음. 완전한 시점 통일/자연 배치 완료로 취급하지 않는다. 새 원화 후보이며 실제 게임 렌더가 아님. 다음 구현은 이 후보와 기존A001을 비교해 오브젝트 접지·높이와 배경 군락 조정; 게임판정 변경 없음.

## 사용자 직접 정정: 원화 시점은 비스듬한 탑뷰

원화 자체는 완전히 윗면만 보이는 구도가 아니다. 003 및 서리꽃 프롬프트에서 높은 시점/윗면 노출을 과도하게 제한한 Codex 해석을 정정한다. 기준은 기존 gameplay-regions-a-001의 옆면·줄기가 일부 보이는 비스듬한 탑뷰를 유지하고, 오브젝트와 지형의 관찰각·높이·접지감·광원을 일치시키는 것이다. 탑뷰 수치75도나 옆면 최소화 자체를 승인 기준으로 사용하지 않는다. 003은 후보로 보존하며 새 최종 시점 규칙으로 확정하지 않는다. 서리꽃 신작도 주변 지형과의 조화로 검수한다.

## 서리꽃 이미지 상태쌍 적용 · 04:06 KST

이전 배치 꽃은 긴 줄기·정면 꽃판이어서 그대로 채택하지 않음. 원본 꽃 crop과 gameplay-b-003을 참조해 낮은 군락 두 시도 생성. 준비 단독 시도는 중앙 알갱이 과다로 보존만 함. 수혜 후 요청은 예외적으로 준비/후 2열 시트로 반환돼, 이 시트의 일치하는 본체를 256캐시에 각각 소스 절반 crop으로 연결. 밝은 꽃잎→어두운 꽃받침이며 살아 있는 잎과 눈 바닥 유지. 원본/실험/프롬프트 보존. 관련10테스트 통과, 실제BiomeObjects.draw 1/0.5배율 이미지 확인·오류/경고0, reports/snow-flower-states-002*.png. 판정·보상·쿨다운·난수 불변. 현 이미지도 기울어진 시점이고 옆면이 남아 있음; 원화가 완전 윗면 구도라는 해석은 위 사용자 정정대로 철회. 배경과 합성한 전체 룩 검수는 후속이며 003 전체 스타일 완성 아님.

## 사용자 요청: 현재 리소스 13종 일괄 적용

기본13종 모두 PNG 렌더 경로 연결. 고목은 guardian-002, 서리꽃은 최신 상태쌍, 나머지는 scene-coherent-v1 asset.png. 해류는 실제 각 segment 길이/폭에 맞춰 unlit 수면 패턴만 회전하고 기존 방향 화살표 유지. 소용돌이는 실제 범위 크기에 맞춰 PNG 표시, 로딩 실패 때 기존 나선 폴백. 분출구는 활성/휴식에 이미지 밝기만 구분(휴식 전용 자산 미제작). 이득 오브젝트 쿨다운 흐림, 고목 전달잎, 서리꽃 상태쌍, 지속 수혜 본체 유지. 기존 수치/효과/판정/난수 불변.

전체369/369 테스트 통과 reports/all-object-art-tests.txt. 실제 BiomeObjects.draw 13종 준비/수혜후 브라우저 확인·오류경고0, reports/all-object-runtime-ready.png 및 -post.png. 브라우저가 기존 biomeObjects 모듈을 캐시해 환경3종이 구 렌더로 보인 현상은 검증페이지의 해당 import 버전 키로 해소. 게임 페이지 기존 탭은 강제 새로고침 필요할 수 있음. tools/object-runtime-review.html 비교용 배치로 실제 월드 배치·지역 배경 일치 완료를 뜻하지 않음. 휴식 분출구에 불꽃이 희미하게 남는 한계 보존. 원화003은 비교 후보이고 배경 전체 일치는 후속. 원래source/planning/main/공개배포 변경 없음.

## 초원 바닥 PNG · 04:27 KST

원본 gameplay-regions-a-001과 A003을 직접 참조해 grass-raster-v1/ground-001.png 제작, 프롬프트·생성본 보존. 큰 잎과 조용한 올리브 색면, 수집물/기능오브젝트/공 제외. 800world 캐시와 동일 광원 crop으로 실제 초원 연결, 반전 없음. 실패 시 기존SVG 폴백. rasterBiomes로 숲 외 PNG의800phase 지원, 음수좌표 crop 테스트 확장. 관련16테스트 통과(추가phase검사후지형6재확인). 실제Game.render6지역 0.5/1배율·아트OFF 폴백·콘솔오류경고0, reports/grass-raster-six-regions-001.png/-zoom1.png.

전체렌더에서 이전 모듈 캐시 때문에 환경3종이 다시 구벡터로 보인 문제 발견. index→main→Game→BiomeObjects 및 art-review import에 art-batch-13 버전키 연결, 재확인에서 해류/소용돌이/분출구PNG 정상 표시. 게임규칙 변경 없음. 원화의 나무 가장자리 구성과 현재 격자형지역경계·나무분포는 아직 다르고, PNG바닥 반복/이음새 가능성 남음. 초원과 숲만 PNG바닥, 호수·설원·화산·사막은 기존SVG. 다음은 원화의 지역별 색면/큰환경형상 맞춤 우선.
