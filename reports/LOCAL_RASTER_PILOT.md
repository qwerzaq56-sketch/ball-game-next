# 숲 이미지 리소스 시범 적용 · 2026-10-06

사용자 `진행해` 승인으로 제안 A(이미지 배경·벡터 캐릭터 혼합), B(대표 자산 SVG 변환 비교)를 실행했다.

- 원화: `planning/art-concepts/concept-002-vector.png`. 생성 원본 PNG와 정확한 프롬프트는 `assets/art-packs/forest-raster-v1/`에 보존.
- 바닥 PNG: 월드 800×800 캐시. 투명 나무 PNG: 256×256 캐시, 150~184 world 크기, 200 world 셀 중 결정적 해시로 약 1/5 배치. 나무가 빽빽하던 첫 적용을 줄였다.
- 실제 TerrainArt/Game.render에 적용. 캐릭터·먹이·공격 전조는 위 레이어 유지. PNG 로딩 실패 시 기존 SVG, 지형 아트 OFF 시 단색 폴백. 난수·판정·게임 수치는 변경하지 않았다.
- VTracer 0.6.15 변환: 2,602 paths / 389,054 bytes. 첫 변환은 잎·가지 색면이 뭉개지고 검은 얼룩이 생겨 **채택하지 않음**. 실패 결과도 비교 자료로 보존. 도구 자체의 모든 설정/엔진이 불가능하다는 결론은 아님.
- 전체 테스트 365/365 통과. 브라우저 아트 로딩 및 오류/경고 0 확인. 화면은 실제 게임 렌더러의 고정 검증 장면이며 자연 플레이 관찰과 구분한다.

확인: http://127.0.0.1:8781/tools/art-review.html?biome=forest
변환 비교: http://127.0.0.1:8781/tools/forest-asset-review.html
게임: http://127.0.0.1:8781/index.html

남은 작업: 바닥 반복/정사각 경계, 나무 배치 변형, 별도 풀·바위 자산, 기능 고목의 원화와의 불일치. 원화와 동일한 완성 화면이라고 주장하지 않는다. 다음 자동 작업은 이 간격을 줄이는 데 우선한다.

변환 재현: `pip install vtracer==0.6.15 Pillow` 후 프로젝트 루트에서 `python tools/trace-forest-pilot.py`. 격리 설치를 쓸 경우 `--dependency-dir 경로`. 이번 설치 위치는 프로젝트 밖 cloud-review/art-tools-vtracer이며 게임 런타임 의존성이 아니다.

후속002: 나무 반전4종 캐시·셀 안 위치 변화·크기140~184world로 반복 감소. 관련4테스트 통과, forest-raster-002.png. 원본 PNG는 수정하지 않음.
