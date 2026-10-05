# 간단한 원화 배치 워크플로우

`python tools/art-batch.py prepare`는 현재 기획 13종을 카탈로그에서 읽고, 원화 영역·게임플레이 참조·항목별 프롬프트·manifest를 준비한다. 기존 생성 파일은 덮어쓰지 않는다. Python/Pillow와 Node가 필요하며 게임 런타임 의존성이 아니다.

Codex는 manifest의 준비된 항목마다 기본 imagegen을 한 번 호출한다. 별도 API키 없이 이번 배치 전체를 실행했다. 이 Python 도구 자체는 생성 API를 호출하지 않으며 무인 CLI 생성기라고 주장하지 않는다.

`python tools/art-batch.py record --id ID --file 생성원본.png`는 원본 복사·알파/크기·SHA256·시간 기록을 수행한다. 이미 결과가 있으면 중단해 원본을 보호한다. 재시도는 별도 batch 버전/결과명으로 보존한다. `status`로 manifest 확인.

`tools/art-batch-review.html`에서 전체 비교 및 원화/프롬프트 링크를 본다. 다음 단계는 오브젝트 원화와 gameplay-regions-a/b를 함께 넣어 새 게임플레이 원화를 생성한 뒤 전체 룩을 기준으로 선택·실제 적용한다. 생성 완료를 스타일 승인 또는 실제 게임 반영 완료로 취급하지 않는다.

전체 폴더 `assets/art-batches/scene-coherent-v1/`가 공유 단위다. 다른 PC에서는 prepare로 현재 checkout 경로에 맞게 참조 경로를 갱신한다. 자동 판정은 범위/파일/알파 검사까지만이며 자연스러운 최종 룩은 실제 장면 비교가 필요하다.

ZIP: `python tools/art-batch.py pack --file 출력-v1.zip`. 원화·전체 결과·도구·카탈로그·참조 게임플레이 원본이 함께 들어가며 기존 ZIP 덮어쓰기를 거부한다.
