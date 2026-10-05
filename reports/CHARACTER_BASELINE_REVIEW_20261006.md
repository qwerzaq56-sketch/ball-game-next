# 캐릭터 초기원화 기준 대조 · 2026-10-06

Read-only 분석. 원본ball-002-refined.png/gameplay-regions-a-001.png를직접view하고각정확prompt읽음. 생성body-sheet-001와현재characterRasterArt/vectorArt/Game.render code 및보존캡처 character-effects-001-forest-zoom1.png도확인했다. 원화덮어쓰기·API/수치/게임/색보정/커밋변경없음. 추가imagegen불필요판단,이번엔생성하지않았다.

assets/art-packs/character-baseline-review/references에승인5색×3단계exactcrop15개+gameplaycyan1개를보존. crop-manifest.json의좌표는XYXY(right/bottom exclusive),원본크기·원본/crop SHA·원본centerRGBA기록. 검수재사용단위이며초기원화를대체하지않는다. 정확prompt원본도기존planning경로를기준으로계속참조한다.

## 중요한 차이

| 기준 | 원화·정확prompt | 현재리소스/코드 | 평가 |
|---|---|---|---|
| 5색 | cyan#55b9d9 blue#428ac9 green#4cc652 red#ec4937 yellow#f4d447;각uniformflat | neutralgray를실제e.colorHex로median색화,광도-.12~+.08.실제게임색을원화hex로교체하지않음 | 종족identity유지하지만원화의색채동일재현은아님. 실제최종palette원화대조별도 |
| matte | 거의균일flatplane,유리/하얀점없음 | generatedgray내부미세질감·두께rim이있으나runtime광도폭제한 | glossy반짝점없어방향은맞음. 원화보다구운rim의색면면적넓음 |
| 아래shadow | lower-edge mutedcolored crescent가아래외부로살짝나옴 | sheet는외부shadow제거·하단darkrim을안에둠. code는1.5screenpxdarkseparator만외부 | 가볍게떠있는원화접지감이약함. 판정radius유지하면서낮은shadow독립code가더정확한경로 |
| 성장단계 | 첫작은공→1.7x→2.2x;장식없는같은몸체;apex에얇은색boundary | stage3sprite는동일축척으로정규화,실제size/2변화로크기표현.부모stage는실제게임state | 원화1.7/2.2를게임성장계수로강제하면안됨.현재sprite3유사함은원화설계상정상 |
| 광원 | 위쪽극히가벼운lighteredge·아래shadow | sheet상단밝은rim+아래내부shade,bodyfacing회전없음 | 고정광원/방향분리맞음.원화보다rim폭과미세texture약간강함 |
| 문양 | 초기공원화와gameplay공은몸체문양없음 | 기존5종식별문양 code레이어유지,12screenpx이하숨김,최대12/zoom크기 | 사용자원화완전재현과차이지만기존종족가독성기능의보존. 신규복잡문양imagegen불필요.읽히는양만최종검수 |
| 이펙트중첩 | 원화는최상위boundary한줄또는단일buff아래shade | 보존forestzoom1fixture는차징/보호막/동상/성장등동시상태,큰흰ring여러겹 | 해당fixture만보고body흰rim/색퇴색의원인이라고오인하면안됨.배경·몸체·상태를OFF/ON각각비교필수 |

원본prompt의완전overhead문구는캐릭터평면몸체용이고,지형/오브젝트전체시점은후속사용자정정의비스듬한탑뷰가우선. 캐릭터몸체는정원반경을유지하므로원화와시점충돌이적다.

## 최소 후속 제안

새캐릭터자산생성은현재필수아님. 먼저같은줌/size/지역에서효과OFF인barebody와초기5색원화crop를비교,그다음문양ON,상태1개씩ON으로구분한다. barebody에rim이두꺼워보일때만색캐시shade비율/상단edge차이를작게보정;shadow접지감은별도낮은codecrescent로평가. 이미지몸체를재생성하면기존실루엣/pivot/3단계cache검증을다시해야하므로원화차이가명백한증거를먼저보존한다.

5색gamepalette가원화hex와다른문제는리소스하나더만들어해결되지않는다. 기존gamecolor/palette를고정한현재방침을유지하고최종원화색일치를어디까지적용할지부모가정리한다. 판정radius/성장계수/게임RNG와분리된시각검수범위다.

## 판정과 한계

정적원화/sourceasset+code+기존복합fixture대조완료. 새실제브라우저5색barebody동일조건검수는이번read-only분석에포함하지않음. 픽셀동일/최종5색일치/모든상태가독성완료로말하지않는다. body검증에적합하지않은overlapfixture를성과증거로확대하지않음. 초기원화/정확prompt기준을재사용하고불필요재생성을피했다.
