# 기본 5종 E/R 능력 통합 검증

수정 소유: tools/ability-effects-review.html과 이 보고서만. 기존 fixture·캐릭터/효과/능력 모듈·공유 renderer·게임 config 수정 없음. 커밋·push는 부모 담당.

## 실제 규칙과 통제 범위

기본 DEFAULT_SKILLS의5색×E/R=10선택을 페이지 내부 balance clone에 명시한다. 실제 Abilities.start/fire/update와 Game.render 사용. 미시전/전조/발동직후/지속1초 선택, +0.1초 실제능력업데이트 버튼, size100/200/400·6지역·줌0.5/1·방향0/180·능력texture ON/OFF 제공.

E의 기존 size해금, R의 기존 apex해금을 확인할 수 있도록 fixture에해당상태를 부여한다. size100 R도 apex=true이며 자연플레이에서직위를얻은 결과가아니다. 크기400 E는실제apex E진화경로를비교한다. 새 해금규칙이나게임수치를추가하지 않는다. UI의성장단계와현재기획기준을혼동하지않는다.

전조는 실제start후windup미만update, 발동직후는 실제start로생긴cast snapshot을 실제fire에전달, 지속은발동후0.1초×10update를수행한다. 모든행동은통제세계에한정되며 자연플레이/승률/자동전투/FPS검증이아니다. 확률형초대의성공을강제로만들지않는다.

## 대상·범위 DOM

시전자, 근처동족/범위밖동족, 근처적/범위밖적을배치하고전후HP·좌표·동결·보호막·초대버프·동족집단·사기·명령·먼지·소환을기록한다. 실제 geometry의 radius/length/width/castRange/buffRadius/commandRadius와기간을JSON표시한다. 장판은실제cast지점, 파도는실제움직이는폭/길이, 보호막은수혜개체, 흡인은직접피해가아닌이동, 집결은비공격명령으로구분한다. texture외곽은판정범위가아니다.

window.abilityReview: game getter, set({skill:'cyan:E',size,biome,zoom,direction,phase}), render(), result(), metrics. 일반브라우저는DOM컨트롤로재현. CUA evaluate는read-only이므로검증조작은select/button 사용. 새장면 async로드중선택이오면마지막요청을다시구성한다.

캐릭터/공통효과/성장/능력자산을사전await. abilityRasterStatus loaded/failed/pending을DOM표시하고생성진행중실패를전체작업실패·완료로단정하지않는다. 다른에이전트가자산을추가했다면새로고침후확인한다. load실패와능력texture OFF비교는서로다른검증이다.

## 수행한 확인

Chrome actualpage에서10종모두size100/숲/줌0.5/방향0/발동직후 startSucceeded=true 확인. 콘솔오류/경고0. 이시점8종능력texture loaded,failed[],pending[] 확인했으나시각합격이아니다.

| 스킬 | 통제 실제결과 |
|---|---|
| 서리보호막 E | 반경240, 시전자shield75/근처동족37.5, 범위밖동족과적0 |
| 냉기휘두르기 R | 근처적HP250→203.39, 동결1; 밖적HP250/동결0 |
| 직선파도 E | length440/width160/waveDuration0.5, 실제wave1생성; +0.1초도존재, 아직앞단이근처적에도달하지않아HP유지 |
| 심해흡인 R | vortex1생성, 발동직후HP유지(직접피해스킬아님) |
| 동행초대 E | 시전자invite1, 근처동족은이번확률시도불수락으로0; 성공강제하지않음 |
| 숲의부름 R | 실제동족소환2, 시전자/근처동족morale1·집단1, 밖동족morale0 |
| 불씨장판 E | 실제embers1생성, 발동직후tick전HP유지 |
| 혈족집결 R | size100실제반경60, 시전자/근처동족rally1, 근처동족command=muster, 밖동족0 |
| 먼지장막 E | 시전자dustUntil35, 다른개체0 |
| 모래바람 R | 반경259.2/castRange350/fieldDuration5, 실제field1생성 |

JSmodule 추출node --check통과. 현재확인은시전및실제결과DOM이고새texture/공통효과의시각완성·자연교전전조·모든방향/크기/지역조합합격을뜻하지않는다.

## 검수 기준·남은 확인·병목

- 사용자원칙: 원화정확크롭을직접imagegen입력, 좌표·원본크기/SHA256·크롭경로·정확프롬프트·실패시안보존. 전체원화/텍스트만으로대체하지않음.
- 원화비스듬한탑뷰·고정몸체광원유지. 방향texture만허용된회전. 0/180전조·발동·지속캡처를같은줌/크기로비교.
- 비공격초대/소환/집결/보호막에피해장판같은붉은경고가생기지않는지, 실제필수범위/판정코드가texture에가려지지않는지확인.
-6지역×2줌×3크기×2방향×4시점중대표및실패장면부터비교. size400범위는화면밖으로나갈수있으므로DOMgeometry와줌0.5·실제월드배치를함께검수.
-실제전조발동및초대수락/거부, 소환체이동·비수혜·각장판tick·흡인/밀침은자연플레이또는별도실제규칙테스트로후속확인.
-초기렌더와캐시재사용metrics분리, 실제FPS/자연플레이비용으로해석하지않음. 이fixture첫숲렌더441ms관찰이며서로다른시전조합과속도비를만들지않음.
-브라우저캡처는이전ChromeCDP5초timeout병목이있어이번은불필요반복없이DOM/실제결과확인, 부모IAB시각검수로인계.
-생성·부모능력renderer연결과병렬작업이므로미로딩자산을완료라고보고하지않고모듈파일은수정하지않았다. 통합후같은fixture재확인이필요하다.

## 최신 기준 변경 · 사용자 직접 지시

부모 전달: ally-buffs-001 스타일에 맞춰 전투/능력 원화 → 정확 크롭 → v2 리소스 제작 순서로 재생성한다. 001 능력 자산은 비선택 실험으로 보존한다. 위 loaded[] 및 시전 결과 확인은 fixture의 실제 규칙 동작 확인이며 001 자산 채택·시각 합격·새 기준 충족을 뜻하지 않는다. module API가 유지되면 동일 컨트롤로 v2 리소스를 재검증한다. 이 fixture는 리소스 버전을 강제로 선택하지 않으며 부모 registry의 실제 선택을 따른다.
