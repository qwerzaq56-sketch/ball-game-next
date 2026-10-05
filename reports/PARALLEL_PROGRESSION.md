# 성장·흡수 장식 묶음 — 2026-10-06

## 직접 참조와 생성

기본image_gen사용. 승인ball-002-refined의외부가는오오라영역과gameplay-regions-a-001의절제된효과arc영역을exactcrop하여두파일을imagegen입력에직접전달. references/crop-manifest.json에원본·좌표·크기·원본/crop SHA256보존. 두번생성했고각정확프롬프트/progression-sheet-001/002 원본·알파·SHA·실제spritebounds를manifest.json에보존. generated후파일은픽셀편집하지않았다.

001은붓칠파편/뜯어진흰질감이과하여비선택. 원본crop재입력+깨끗한선만단일수정해002생성.002원형ring은상대적으로매끈해성장장식용잠정선택. 흡수선은002도파편질감이남아재현성과과밀우려. 얇은band+alpha.08~.14만선택적실험, 실제장면에서거슬리면기존code만유지하고채택보류. 원화완전일치/효과승인완료로취급하지않는다.

## API 인계

`js/progressionRasterArt.js` 새독립모듈만제작. 부모가공유렌더에연결한다.

- `await loadProgressionRaster()` CORS anonymous, 실패시false. 캐시source2개와색24개상한.
- `drawGrowthRasterTexture(ctx,e,zoom)` 기존scalePulseTimer>0일때만장식. 기존vectorArt growthpulse와같은radius= size/2+(1-t)*22/zoom. source자체가는원형이고alpha t*.32. 기존growthpulse를그대로두고중첩하면밝아질수있으니부모는기존ring유지+장식 여부를실제비교. 새오오라상태/먹이아이콘생성없음.
- `drawAbsorptionRasterTexture(ctx,target,eater,progress,zoom,color)` target.beingAbsorbedByRef===eater이고실제progress>0에서만가능. target→eater방향에맞춰unlit질감만회전. 기존실제진행arc/색별대상·적대구분/화살표는부모code가그대로유지. 부모는적대흡수경로에만호출하고진짜absorptionProgress/absorptionRequired비율을전달해야한다. 이질감자체가progress나화살표를대체하지않음. 함수에새교전/대상판정은추가하지않았다.
- 두API준비전/실패/비활성에서false, 기존code폴백. 실제부모game/vectorArt/actionArt미수정.

## 검증과 병목

관련테스트3개통과: 기존pulse의기하·실제흡수관계/진행요구·상태/난수불변/폴백. 부모브라우저실제합성검증남음.

병목: 생성기가cleanline프롬프트에도flow영역을roughbrush로만드는경향. 원본2회직접참조/강한negative에도잔여. 우회: alpha낮춰진행정보아래에장식으로만제한, 최종채택보류권장. 새툴/숨긴외부API/원본픽셀후처리로고치지않았다. ring/flow자산제작은완료하지만흡수장식품질은부분실패로명시한다. 실제움직임·줌.5/1·작은공·공중첩시판독확인후자연스러운쪽을채택.

추가회귀: geometry(target,eater,progress,zoom,world), draw(...,color,world)에선택적world인자추가. topology.delta가토러스경계의짧은방향/거리선택, 생략하면엔티티_world지원.부모g.balance.world전달권장. 경계양축20+20shortpath/실제관계/비wrap대조테스트추가,4테스트통과. 흡수자산은품질보류로이번큰묶음연결제외;성장만검수대상.
