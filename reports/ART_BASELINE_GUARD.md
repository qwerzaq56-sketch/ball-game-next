# 초기 원화·프롬프트 불변 검수

`tools/art-baseline.py`는 최초 `prepare`에서 현재 승인된 원화 PNG와 정확 프롬프트 md의 상대 경로·SHA256·바이트 수·최근 파일 커밋·미커밋 상태를 `planning/art-baselines/initial/manifest.json`에 등록한다. 기존 manifest는 배타적 생성 모드로 덮어쓰기를 거부한다. 파일을 바꾸거나 원본을 복사·정리·재승인하지 않는다.

현재 등록 쌍은 ball-002-refined, gameplay-regions-a-001, gameplay-regions-b-001, ally-buffs-001, objects-t3a-001, objects-t3b-001, terrain-t1-001, concept-002-vector 총 8개다. 최초 요청의 추측명 biome-landmarks-a/b-001은 실제 초기 자료 objects-t3a/b-001로 이름을 정정했다. 최초 4쌍 등록 뒤 사용자가 승인한 등록 보완으로 정확한 네 쌍을 일회성 추가했고, 기존 네 쌍의 SHA는 갱신하지 않았다. 이 보완은 manifest의 registrationCompletion에 기록했다. 일반 prepare에는 갱신·보완·강제 덮어쓰기 기능을 추가하지 않았다.

각 쌍의 exactPromptSource는 정확한 생성 프롬프트가 담긴 **원래 markdown 파일**을 직접 가리킨다. 재사용 시 이 원문의 생성 프롬프트를 그대로 읽으며 요약문이나 재작성본으로 대체하지 않는다. 전체 파일 SHA는 프롬프트 본문뿐 아니라 주변 출처 기록도 보호한다. 원래 문서의 과거 컨펌 상태 표기는 바꾸지 않았고 현재 사용자 승인 등록과 과거 파일 내용은 구분한다.

최초 생성 당시부터 변하지 않았다는 역사적 보증은 아니다. 현재 승인된 repo 파일을 기준으로 등록하고 git provenance를 함께 기록했다. tracked 상태는 초기 원화의 출처 검토에 도움이 되지만 생성 당시 원본을 증명하지 않는다. manifest 내용에도 같은 제한을 명시했다.

## 사용

```sh
python tools/art-baseline.py verify --JSON
python tools/art-baseline.py self-test --JSON
```

`prepare`는 최초 등록만 수행한다. 지금 다시 호출하면 오류와 exit 1로 끝난다. `verify`는 등록된 파일의 변경·누락 또는 repo 밖 경로를 탐지하면 exit 1, 일치하면 exit 0을 반환한다. 최초 등록 시 존재하지 않았던 요청 자료는 별도의 `missingRequested`에 항상 표시하며 검증 성공으로 그 자료까지 보증하지 않는다. 기계 검수용 `--JSON` / `--json`을 지원한다. `--root` / `--manifest`는 임시 fixture와 다른 체크아웃에서 같은 기준을 검사하는 용도다.

## 검증

등록 보완 후 실제 초기 8쌍 verify 통과, missingRequested는 비어 있다. 임시 디렉터리 fixture에서 정상 일치, SHA 변경 검출, 파일 누락 검출, manifest 재생성 거부 및 기존 바이트 보존을 다시 검증했다. fixture는 실제 원본을 수정하지 않는다. renderer·원본 이미지·프롬프트·공유 워크플로우·git 작업은 수정하지 않았다.
