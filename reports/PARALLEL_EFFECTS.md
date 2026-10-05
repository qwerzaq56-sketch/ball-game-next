# 공통 전투·수혜 효과 래스터 묶음1

2026-10-06 07:02–07:20 KST. 사용자 승인된 병렬 제작. 담당 범위는 `assets/art-packs/effects-raster-v1/`, `js/effectRasterArt.js`, 해당 테스트·보고서다. 공유 게임/액션/벡터/기획 파일은 수정하지 않았고 커밋·push·브라우저 조작도 하지 않았다.

## 실제 결과

| 역할 | 선택된 PNG | 기준 원화 크롭 | 구현 의미 |
|---|---|---|---|
| 차징 | charge-002.png | charge-neutral.png | 중립 아이보리 조각, 실제 차징 진행량에 따른 장식 알파. 정확한 진행 호/공격 방향/범위는 기존 벡터 |
| 피격 | impact-001.png | charge-body.png | 원화에 전용 피격 그림이 없어 같은 배우/전조 크롭 스타일로 새 질감 파생. 실제 contact impact-ring 좌표에만 부모가 합성 |
| 회피 | dodge-001.png | dodge-body.png | 짧은 무광원 수면색 궤적. 실제 DODGING 방향/잔상 판정은 기존 코드 |
| 보호 | shield-001.png | shield-recipient.png | 실제 남은 보호막이 있는 수혜자에만 얇은 민트 장식. 원래 보호막 기하 유지 |
| 강화 | strength-001.png | strength-recipient.png | 실제 vigor/rally 수혜자의 작은 잎 조각. 새 버프/아이콘 추가 없음 |
| 서리 해제 | frost-clear-002.png | frost-clear-recipient.png | 실제 냉기 해제 전이 확인 후 짧게 흩어지는 흰 조각. 새 냉기 판정 없음 |
| 회복 | heal-001.png | heal-recipient.png | 실제 HP 증가 확인 후 조용한 물결/물방울. 거리에만 근거해 회복을 표시하지 않음 |

built-in image_gen로 9개 원본 제작, 7개 선택. 전체는 true RGBA alpha0..255이며 불투명 체크 배경은 관찰되지 않았다. 원본별 크기·알파 점유·SHA256은 alpha-metrics.json. 정확한 생성 프롬프트·원본 생성 경로·선택/실패 이유·표시 crop/pivot은 manifest.json에 보존했다. 선택은 단독 리소스 검토 기준이며 실제 게임에서 완전한 원화 재현이나 모든 중첩 합격을 의미하지 않는다.

## 직접 원화 참조와 실패 보존

`references/crop-manifest.json`은 승인 원화 원본 경로·크기·exclusive XYXY 좌표·원본 SHA256·크롭 SHA256·용도를 기록한다. 각 생성에 해당 크롭을 실제 image_gen referenced_image_paths로 직접 전달했다. 전체 원화나 텍스트만으로 대체하지 않았다. 공격/피격/회피 전용 승인 효과 그림은 없으므로 gameplay-regions-a/b-001의 실제 몸·전조·잔상 크롭을 스타일 근거로 사용한 신규 장식임을 구분한다. 수혜 효과는 ally-buffs-001의 실제 수혜자 부분을 사용했다.

- 차징001: 첫 크롭에 들어 있던 녹색 잎이 공통 차징에도 따라와 종족 버프처럼 보였다. 원본/프롬프트 보존·비선택. 같은 원화에서 잎을 제외한 정확한 charge-neutral 크롭을 추가해 아이보리 charge002를 제작했다. 직접 크롭도 의미가 다른 요소를 섞으면 잘못된 효과가 된다는 병목을 확인했다.
- 서리해제001: 아치가 두껍고 빈 배우 중심이 아래로 치우쳤다. 냉기를 새로 둘러친 것처럼 보여 원본/프롬프트 보존·비선택. 중심 x50%/y50%, 작은 조각만, 링·아치 금지로 002를 재생성했다.
- 보호/회복001: 프롬프트의 절제 지시에도 넓은 블룸이 생성됐다. 실제 본체/선의 색은 유지하고 캐시에서 alpha^1.8 곡선으로 약한 넓은 빛을 줄인다. 원본 PNG/RGB는 불변이다. 실제 장면에서 충분한 절제인지 부모가 비교한다.

## 제공 API와 통합 위치

```js
import {loadEffectRaster, drawEffectRaster, drawEntityEffectRaster, effectRasterStatus} from './effectRasterArt.js';
await loadEffectRaster(); // 전체7개, 또는 ['charge','impact','dodge'] 선택 묶음

// Game.renderEntity의 정확한 벡터 전조·진행 호·몸을 그리기 전, 장식만.
drawEntityEffectRaster(ctx,e,game,r,zoom,{status:false,impact:false});
// 실제 수혜 상태, HP 증가/냉기 해제 타이머를 부모가 확인한 뒤 몸 근처.
drawEntityEffectRaster(ctx,e,game,r,zoom,{charge:false,dodge:false,impact:false,
  healing:actualHealing,frostCured:actualFrostClear});
// 기존 impact-ring의 실제 접촉 좌표. shield색 피격은 부모가 제외.
drawEffectRaster(ctx,'impact',{x:particle.x,y:particle.y,radius:visualRadius,alpha:fade});
```

`radius`는 표시 footprint이며 공격/버프 효과 반경이 아니다. 실제 방향·거리·진행량·쉴드 윤곽 같은 필수 기하는 기존 벡터를 유지한다. convenience의 impact 기본값은 false로 둬 몸 중심을 접촉 위치처럼 표현하지 않도록 했다. 회복/해제는 기본 false이고 실제 전이 결과만 명시적으로 전달한다. 모든 함수는 e/game에 쓰지 않으며 판정·HP·쿨다운·타이머·게임 난수를 생성하지 않는다. orb·사망 배우·만료된 효과는 제외한다.

## 캐시와 축척

7종 선택적 로더, 종별 실패 독립, anonymous CORS, 로딩 전 false 폴백. 원본 PNG의 큰 투명 패딩을 명시 crop로 캐시할 때만 잘라내고 원본 배우 피벗을 좌표 변환해 유지한다. 종횡비 유지, 폭256 캐시, 이미지당1장·7종 상한. 정착된 성공/실패는 requested pending에서 제외한다. alpha 보정은 보호/회복 캐시 생성 시에만 실행하고 프레임에는 drawImage만 수행한다. 정확한 crop는 manifest에 기록되며 원본 경계 안임을 검사했다.

세계 광원이 구워진 본체를 돌리지 않는다. 방향 회전은 처음부터 무광원 궤적으로 제작한 dodge에만 적용한다. 나머지 원화 조각과 상태 장식은 방향과 무관하게 고정한다.

## 병목·검증·한계

| 대략 시점 | 병목 | 우회 | 남은 일 |
|---|---|---|---|
| 07:02–07:08 | 전투 전용 승인 효과 원화 없음 | 실제 배우/전조 부분 정확 크롭에서 질감만 파생하고 벡터 기하는 유지 | 실제 숲/6지역 가독성 비교 |
| 07:08–07:14 | 크롭 속 잎 때문에 차징001 의미가 달라짐 | 의미를 좁힌 재크롭과 charge002 제작, 실패 보존 | 작은 몸/차징량별 구분 |
| 07:11–07:15 | 서리해제001 중심·두꺼운 아치 실패 | 중앙 빈 공간과 작은 조각만을 강제한 002 | 실제 냉기 해제 전이 캡처 |
| 07:13–07:17 | 보호/회복 넓은 블룸, 패딩으로 실제 효과 크기 불일치 | 캐시 alpha곡선·명시crop·원본피벗유지 | 효과 중첩 및 0.5/1배율 비교 |
| 07:17 | status의 requested가 완료한7개도 표시 | 미정착 요청만 표시하고 회귀assert | 부모 실제 preload 재확인 |

담당 테스트2/2 통과: 부분 로딩 실패/벡터 폴백, 실제 수혜/만료/사망/orb 구분, 게임 상태·난수 보존, 무광원 궤적만 회전, 원본/RGB 보존 alpha보정, pending 상태 정리. 자산 검사9개 원본/7개 선택·전부투명·캐시crop범위정상.

부모 전달 확인: 브라우저에서 7종 loaded·failed[] 관찰, 실제 contact particle/HP 증가/냉기 해제 타이머 통합 중. 실제 화면 캡처/전체 테스트/공유 파일/커밋·릴리즈는 부모 담당이며 이 보고서는 해당 결과를 새로 완료했다고 주장하지 않는다. 작은 효과의 배경 대비, 실제 수혜·비수혜 동일 장면, 상태 중첩, 6지역·줌0.5/1의 최종 평가는 남아 있다.
