# 보호막 필수 상태 원 표시 완화

부모 실제 forest fixture에서 수혜 shieldHp40 / 범위 밖0을 확인했고, 완전한 cyan 원이 초기 원화 partial 장식보다 굵게 튀는 것을 관찰했다. 기존 필수 상태 원을 지우지 않고 rich 표시일 때 선명도만 낮추는 독립 helper를 작성했다.

`drawShieldStateArt(ctx,e,r,zoom,{rich})`는 기존 shieldHp>0 조건과 반경 r+7/zoom의 완전한 원을 그대로 유지한다. 기본 rich=false는 기존 #a5f3fc, 3/zoom 선폭이다. rich=true일 때 rgba(165,243,252,.65), 1.5/zoom로만 바꾼다. ctx save/restore로 스타일 상태를 보존하고 개체·수치·대상·RNG는 변경하지 않는다.

부모가 Game의 기존 shield 원 위치에서 effectRasterEnabled / terrainArt.enabled를 근거로 rich를 전달한다. helper는 이미지 로딩 성공 여부를 추측하지 않고 필수 원은 항상 남긴다. 이미지 누락과 상태 판정이 혼동되지 않도록 유지한다. 공유 Game 파일은 이 담당자가 수정하지 않았다.

전용 테스트: 양의 보호막과 remaining0의 기존 조건 유지, shieldHp0/음수/undefined 미표시, zoom .5/1/2에서 기하·fallback 정확 일치, rich 선만 변경, 입력·난수 불변, ctx 상태 복원 검증. 실제 렌더 통합 및 후속 브라우저 검수는 부모 담당이다. git 작업 없음.

통합 검수: 409/409 테스트. 실제forest-tree 호출 수혜 shieldHp40/범위밖0 전후불변, ON/OFF 원 유지, 피격contact거리50=몸체반경50/HP500불변, 브라우저오류경고0. 전후/폴백/접촉 캡처 shield-rim-*.png. 장식의밝기/선폭만보정, shield반경/실제효과불변. 복합상태와자연플레이 전부합격을뜻하지않음.

