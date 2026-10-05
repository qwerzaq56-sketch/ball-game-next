# 캐릭터 래스터 묶음001 — 부모 통합 인계

## 출처와 제작

imagegen 스킬의 기본 image_gen 사용. 승인 `ball-002-refined.png` 기본/성장/최상위 청록공3개와 `gameplay-regions-a-001.png` 청록공1개를 정확히 크롭하여 생성 입력에 직접 전달했다. 전체 장면이나 텍스트만으로 대체하지 않았다. `assets/art-packs/characters-raster-v1/references/crop-manifest.json`에 원본·크롭 좌표·원본 크기·SHA256 보존. `body-sheet-001-prompt.txt`가 정확한 호출 프롬프트이며 `body-sheet-001.png` 원본은 덮어쓰지 않는다.

3단계 중립 matte body 시트1장을 생성했다. 실제 알파0–255이며 몸체 외부가 투명하다. 넓은 균일면/상단 가는 밝은 rim/하단 어두운 내부 rim을 유지했다. 기본/성장/최상위 본체 차이는 작다(승인 원화도 크기·외부 오오라 외 본체 차이가 작음). 최상위 오오라를 이 이미지에 굽지 않았고 성장/직위 규칙을 새로 만들지 않았다. 외부 그림자·배경·방향/UI 제외.

잠정 검수: 원화의 평면 원반에 가까우나 회색 미세 질감과 내부 rim이 원화보다 강하다. 색 캐시에서 광도차를 -.12~+.08로 제한해 3D 명암/무채색 질감을 억제한다. 완전 원화 동일재현 승인 또는 실제 게임 검증 완료로 주장하지 않는다. 생성 실패 시안은 없음. 후보1회 생성 후 코드·테스트 준비.

## API와 실제 연결

새 `js/characterRasterArt.js`만 제작했다. 부모가 공유 파일에서 연결한다.

- `await loadCharacterRaster()` : 선택적 사전준비. 실패시false, 기존 코드 폴백 유지.
- `drawCharacterRasterBody(ctx,e,r,zoom,flash,stage)` : 준비전/잘못된 colorHex/orb/로드실패이면false. true일 때 기존drawMatteBody만 대체한다. `r=e.size/2`를 그대로 전달. stage는 `'base'|'growth'|'apex'`, 기존 게임 상태로 부모가 선택. 새로운 크기 임계값을 모듈에서 발명하지 않는다.
- `characterRasterStatus()` : ready, colorCache,cacheLimit32.
- 원형clip이 정확히radius r. 기존시각 분리 윤곽1.5screenpx와 차징/흡수 흰rim은 유지. 게임 판정/색명/난수/엔티티를 변경하지 않는다.
- 실제 `e.colorHex`를 바탕색으로 캐시색화한다. 5종+flash화이트×3stage가 캐시32안에 들어가며 색상이 늘어도 FIFO32제한. 해상도192, 최초 각색·단계만 픽셀 처리하고 이후drawImage.
- 본체는 facing 회전/반전하지 않는다. 부모는 기존 종족 문양·방향·공격/스킬·최상위 오오라를 독립 code레이어로 유지한다. 승인 공 원화에는 문양이 없으므로 새로운 상징이미지 대신 기존 문양 가독성 유지가 맞다.
- vectorArt 등의 외부 파일·브라우저·버전키·planning/NIGHT/커밋은 담당하지 않았다.

## 검증

`node --test --test-isolation=none tests/character-raster-art.test.mjs` 3개 통과. alpha/hue보존·원본픽셀무변경·폴백·난수/캐릭터불변·실제draw지름·facing바뀌어도같은캐시·회전없음·32캐시상한 검증. 실제 브라우저는 부모가 연결 후5색×2줌×기본/성장/최상위·관목위이동·전투중첩 확인해야 한다.

## 병목과 잔여

- 원화공 배경/외부shadow가 같이 들어가므로 정확 crop을 투명 추출 입력으로 사용. 생성alpha실제확인과bounds메타로우회. crop후생성본은정확pixel동일아님.
- 생성시트3단계 pixel크기/여백이 약간 달라 pivot/축척 혼선 가능. manifest에 실제bbox보존, 런타임은192정규화+원형clip로같은축척·pivot유지.
- 회색광도만 그대로 tint하면 종족색이 퇴색. median 기준 광도편차만제한적용, 실제colorHex기준 채색으로우회.
- 현재 body색캐시는 첫 등장에CPU픽셀작업이 있다. 부모가 게임시작 전5색×3stage준비 또는 첫등장성능검수 가능. 한시트고정광원을 유지하며 실제scene검증전최종스타일완성주장금지.
