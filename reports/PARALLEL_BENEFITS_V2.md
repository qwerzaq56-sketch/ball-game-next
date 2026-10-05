# 아군 수혜효과 v2 — 원본 ally-buffs 직접추출 재제작

## 생성 근거

사용자 첨부와동일한planning/art-concepts/ally-buffs-001.png 및정확원본프롬프트를읽었다. 원본프롬프트의2~3잎전달→부분호, 작은잎+희미한rim, 서리흩어짐,두짧은회복파문을구분했다. 각효과 exactcrop4개를각각별도builtinimagegen호출의직접입력으로전달. references/crop-manifest.json에원본크기/좌표/원본SHA/cropSHA/원화actor중심보존. 부족한효과원화를새로발명하지않았고네개가모두원본시트에존재함을확인했다.

assets/art-packs/benefits-raster-v2에최초4개+개선2개원본/정확프롬프트/manifest보존. 모든생성PNG actualalpha0–255. 불투명checkerboard/땅/캐릭터/수혜원본몸체/plus/text없음을직접이미지뷰로검수.원본pixel편집/resize/crop후저장없음. 캐시crop/색/크기/피벗은부모연결에서처리.

## 잠정 선택과 실패

| 효과 | 선택 | 결과·한계 |
|---|---|---|
| leaf-shield | leaf-shield-002.png | 001은잎4개(중앙쌍)로과다. 단일교정1회후정확3잎+가는부분호. 광범위glow없음. 지속수혜본체용정적인circle이아닌전달순간장식. 최종위치는원본같은source→target전달code맥락필요 |
| empowerment | empowerment-002.png | 001은호가굵은rim/bevel이라실패. 단일교정후가는hairline+작은잎1개. 원화의조용한수혜표시에가까움. 잎가운데vein투명부분남고화면상작으면소실될수있음 |
| frost-clear | frost-clear-001.png | 소수흰색2tone흩날림6개,원화보다개수줄음. 요구prompt5개에서1개초과이나눈보라/새아이콘아님. 실제서리해제순간만표시. 초원식생과달리흰조각이명확함 |
| heal | heal-001.png | 두열린얇은민트파문만. 약반원길이여서prompt110도보다김,원화같은몸아래조용한두파문은유지. 부분파문앞면이지효과범위전체circle아님 |

원화색/형태에기반한잠정결과이며실제Game.render/.5/1/5색/회복과전투겹침검증은부모. 단독PNG검수만으로최종게임합성완료또는원화pixel동일재현이라고하지않는다.

## 피벗·프레이밍 인계

manifest의actorPivotNormalized/actorRadiusNormalized는직접뷰에서모양을기준으로추정한비가시actor배치값. 생성기가center요구를정확히지키지않아전체image중앙에무조건배치하면호가공에서빗나간다. source1254×1254를그대로사용한다면 actorworldradius r일때image전체width = r / actorRadiusNormalized, draw좌상단=actorxy - pivotNormalized*width. 이값은검수용초기값으로부모실제장면에서조정한다.

- leafshield: pivot(.40,.65), actorRadius .42. 원화의이동장식이다. 실제target로접근하는전달선/시간은code유지.고정world광원없어짧은전달방향정렬가능하나여기서몸체/지형회전은금지.
- empowerment: pivot(.495,.53), actorRadius .12. actor옆부분호와위leaf등록. 부분호를상태대상에게만표시.
- frostclear: pivot(.50,.70), actorRadius .16. actor위흩날림군락. 매개체평소상시표시금지.
- heal: pivot(.49,.62), actorRadius .25. actor하단2파문. HP 실제증가이벤트/짧은유지code필수.

alpha64 visibleBBox와fileSHA도manifest에보존. 알파crop할경우원본피벗을bbox좌상단만큼빼고crop폭높이로정규화해야한다. 자동중앙정렬/정사각늘이기로피벗을잃지않는다.실제effecttarget/radius/cooldown/RNG정보는리소스에굽지않았다.

## 병목

- 001leaf개수/empowermentrim두께가원본과다름: 각1회만원본crop재입력·단일교정.002선택,001보존.
- 비가시actor중심은생성기가불안정: manual provisionalpivotmetadata로우회,부모합성검증필요. phantombody추가로중심표시하지않음.
- 생성호/leafedge에약한불규칙alpha흔적남음: 원본보존,작은화면규모에서검수후조정. 이전v1의광범위glow/solidring비해더작고부분적인형태이나최종품질승인이라고확정하지않음.

기존effects모듈/부모공유파일/커밋/기획서는수정하지않았다.
