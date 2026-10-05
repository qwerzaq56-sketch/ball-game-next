# 캐릭터 낮은 접지 crescent · 2026-10-06

초기ball-002-refined의절제된하단외부coloredshadow와대조해캐릭터래스터렌더에blur없는어두운ellipse추가. 기존sprite/원본/5종색/반경/게임수치/난수/방향회전은변경하지않았다. js/characterRasterArt.js와관련테스트만변경. API동일.

그림자축은세계아래방향고정. ellipse중심y=actor.y+min(r*.12,6/zoom)+1.5/zoom,반축=.98r. 기존1.5screenpx분리윤곽과몸체가상단을가려하단에작은crescent만남는다. +1.5/zoom은저배율에서기존분리윤곽뒤에shadow가전부숨는현상을피하기위한것. 증가분최대6screenpx,본문원형rclip/흰차징흡수rim유지. 색rgba(5,18,22,.28),blur/glow/필터없음. 원화의종족별shadowhue를정확하게복제하지는않고어두운접지값으로통일했으며실제지역별합성검수필요.

관련3테스트통과: source픽셀/색/alpha·폴백/난수불변·정확body지름·facing변경같은cache·회전없음·save/restore균형·zoom.5/1/큰공offsetscreen상한. 부모실제브라우저전후검수남음,코드검증만으로원화일치완료주장하지않는다. 게임판정에외부shadow반경을추가하지않음. 자산새생성/git/shared문서미수정.

통합 검수: 407/407 전체 테스트 통과. 실제 Game.render 숲5색 size100/zoom1 전후 캡처, size40/zoom.5, size200/zoom1 상태중첩 확인. 브라우저 오류·경고0. 새 원화 생성 없이 낮은 하단 접지감만 보정, 수치/판정 불변. 캡처 character-shadow-before/after/small05/overlap.png. 전체 자연플레이·모든6지역 조합·원화 픽셀동일 검수는 아니며 다음묶음에서 효과중첩 추가검수.

