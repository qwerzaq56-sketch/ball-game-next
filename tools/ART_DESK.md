# 아트 요청 데스크 (art desk)

GPT 이미지 생성을 **Codex**와 **ChatGPT 웹** 어느 쪽으로 하든 같은 요청서·같은 결과 폴더·같은 검수 화면을 쓰게 하는 도구.
기획 문서: `ball-game-planning/03_아트/33_아트_요청_데스크.md`. 사용자 요청(2026-10-08): "실시간 상호작용을 목표로 코덱스/챗 모두 호환 가능한 툴 및 문서".

| 역할 | 누가 | 하는 일 |
|---|---|---|
| 요청 포장 | Claude | 참조 크롭·역할·크기·프롬프트를 `items.json`으로 쓰고 `add` |
| 생성 | GPT (Codex imagegen 또는 ChatGPT 웹) | `next`/요청서대로 생성 → `ingest` 또는 업로드 |
| 자동 검사 | 도구 | 투명도·체크무늬·여백·비율·크기·이음새 (파일 사실만) |
| 판정 | **사용자만** | 검수 페이지에서 승인 / 다시 요청 / 버림 / 메모 |
| 게임 반영 | Claude (또는 Codex) | 승인된 `out-vN.png`만 게임 에셋으로 옮김 |

**승인은 사용자만 한다.** Claude·Codex·ChatGPT는 `feedback --verdict ok`를 실행하지 않고 `--by user`를 쓰지 않는다. 도구도 `ok`는 `by=user`일 때만 받는다(CLI 기본값은 `agent`).

## 폴더

```text
assets/art-desk/
  index.json                      배치 목록 (자동)
  <batch>/
    desk.json                     원본 데이터 (도구만 고침)
    REQUEST.md                    생성 담당용 지시서 (자동 생성, 직접 고치지 않음)
    events.jsonl                  모든 동작 기록 (추가만)
    _inbox/                       여기에 넣은 이미지는 서버가 자동으로 받음 → _inbox/_done/
    <item-id>/
      ref-1.png, ref-2.png …      참조 (원본에서 크롭, 원본 경로·좌표·SHA 기록)
      prompt.txt                  요청 프롬프트
      CHAT.txt                    ChatGPT에 그대로 붙일 메시지
      out-v1.png, out-v2.png …    결과 (덮어쓰지 않음, 실패작도 지우지 않음)
```

## 명령

```bash
python tools/art_desk.py new <batch> --title "제목"
python tools/art_desk.py add <batch> --spec items.json
python tools/art_desk.py next <batch>
python tools/art_desk.py ingest <batch> --id <ID> --file <이미지> --by codex --prompt-file <실제 프롬프트>
python tools/art_desk.py feedback <batch> --id <ID> --verdict redo --note "고칠 점"
python tools/art_desk.py focus <batch> --id <ID>
python tools/art_desk.py status <batch>
python tools/art_desk.py chat <batch> --id <ID> --zip <새 파일>.zip
python tools/art_desk.py serve --port 8010 --watch ~/Downloads
```

- `add`: 이미 결과가 있는 항목은 바꾸지 않는다. 바꾸려면 새 ID(`<ID>-b`)로 추가.
- `next`: "다시 요청" 항목을 먼저, 그다음 "요청됨" 항목. 첨부 순서, 다시 요청 메모, 넣을 명령, 메시지 전문을 출력.
- `feedback`의 `note` 판정은 상태를 바꾸지 않는 메모. `redo`/`drop` 뒤에는 이전 승인 표시가 풀린다(기록은 남음).
- `chat --zip`은 메시지 + 번호 붙은 참조를 묶는다. 같은 이름 파일이 있으면 덮어쓰지 않고 실패.

## 검수 페이지 (실시간)

```bash
python tools/art_desk.py serve
```

`http://127.0.0.1:8010/tools/art-desk.html` 을 연다. 1.5초마다 갱신되므로 Codex가 `ingest`하면 바로 나타난다.

- **항목 카드:** 참조(역할·순서, "이미지 복사"), 요청 프롬프트, 합격 기준, 결과 목록(체크무늬 배경), 자동 검사 배지.
- **게임 크기 미리보기:** `size.world`가 있으면 결과를 그 크기로, `size.compare` 지름의 공 옆에 지역 바닥색 위에 그린다.
- **결과 넣기:** 카드에 끌어다 놓기 · 눌러서 파일 선택 · 카드 위에 마우스를 둔 채 Ctrl+V.
- **"이 항목으로 받기"(focus):** 이름 없는 파일(`_inbox`, `--watch` 폴더)을 이 항목으로 받는다.
- **판정:** 승인 / 다시 요청(고칠 점 필수) / 메모만 / 버림. 메모는 그대로 `next`와 `REQUEST.md`에 실려 GPT에게 간다.
- 서버 없이(예: `tools/serve.py`) 열면 읽기 전용.

## 흐름 A — Codex (자동 반복)

Codex에게 이렇게 맡긴다: "`python tools/art_desk.py next <batch>` 를 실행해 나온 항목을 생성하고 ingest, 검사 fail이면 원인 고쳐 한 번 더, 할 일이 없을 때까지 반복."

1. `next <batch>` → `NEXT <ID>`와 메시지를 읽는다.
2. imagegen 호출 1회 = 항목 1개. 참조 이미지를 **출력된 순서대로** 첨부하고 메시지 전문을 프롬프트로 쓴다.
3. 실제로 쓴 프롬프트를 파일로 저장하고 `ingest ... --by codex --prompt-file <그 파일>`.
4. 자동 검사 `fail`(투명 없음, 체크무늬 등)이면 같은 항목을 한 번 더 생성해 다시 `ingest`(이전 결과는 남는다). `warn`은 사용자 판단에 맡긴다.
5. 다시 `next`. "nothing to generate"면 끝 — 사용자 검수 대기.
6. 사용자가 "다시 요청"을 누르면 다음 `next`에 `REDO NOTE`가 나온다. 그 메모를 반영해 생성.

## 흐름 B — ChatGPT 웹 (사람이 중계)

1. `serve` 실행 후 검수 페이지에서 항목의 **"ChatGPT 메시지 복사"** → ChatGPT에 붙여 넣기.
2. 참조는 "이미지 복사" → ChatGPT에 붙여 넣기 (번호 순서대로). 또는 `chat --zip`으로 묶은 파일을 첨부.
3. 결과 이미지를 받는 방법 중 편한 것:
   - ChatGPT에서 이미지 복사 → 검수 페이지 카드 위에서 **Ctrl+V**
   - 다운로드한 파일을 카드에 **끌어다 놓기**
   - 서버를 `--watch ~/Downloads`로 켜고 카드에서 **"이 항목으로 받기"** → 이후 내려받는 이미지가 자동으로 그 항목에 들어감(원본 파일은 그대로 둠, 서버 켜기 전 파일은 무시)
   - `_inbox/<ID>.png`로 저장 (파일 이름이 항목 ID로 시작하면 그 항목, 아니면 focus 항목)
4. 자동 검사를 보고 바로 판정하거나, 같은 ChatGPT 대화에서 고쳐 달라고 한 뒤 다시 넣는다.

## items.json 형식

```json
[
  {
    "id": "fx-buf-01",
    "kind": "effect",
    "title": "하늘색 보호막",
    "use": "보호막 버프 고리 (leaf-shield-002 교체)",
    "region": "grassland",
    "size": {"px": [1024, 1024], "world": [90, 90], "pivot": "center", "compare": [40, 60], "aspect": 1.0},
    "alpha": true,
    "variants": 1,
    "refs": [
      {"source": "assets/art-packs/benefits-raster-v2/leaf-shield-002.png", "role": "shape source; recolour to sky blue"},
      {"source": "<승인된 컨셉 이미지>", "crop": [x, y, w, h], "role": "final gameplay look"}
    ],
    "prompt": "영어 프롬프트 본문",
    "avoid": ["leaves", "text"],
    "accept": ["reads as a shield ring at 90 units"],
    "planning": ["이펙트.md §6"]
  }
]
```

- `source`는 저장소 기준 상대 경로 또는 절대 경로. `crop`은 `[x, y, w, h]` 픽셀.
- `size.aspect`: 보이는 그림(투명 제외) 가로/세로 목표. `size.tile: true`면 좌우 이음새 검사.
- `region`: 미리보기 바닥색 (forest, grassland, lake, snow, desert, volcano, dark).
- `alpha: false`면 투명·체크무늬·여백 검사를 하지 않는다 (배경·타일용).

## 자동 검사

| 검사 | fail | warn |
|---|---|---|
| alpha | 투명 채널 없음 / 투명 영역 3% 미만 | — |
| checker | 불투명한 밝은 회색 2~4톤 가장자리 (체크무늬를 그려 넣음) | 가장자리 불투명 |
| margin | 보이는 그림 없음 | 가장자리에 닿음 / 그림이 캔버스 20% 미만 |
| aspect | — | 목표와 15% 넘게 차이 |
| size | — | `px`의 90%보다 작음 |
| tile | — | 좌우 이음새 평균 차 12/255 이상 |

검사는 파일 사실만 본다. 그림이 맞는지(형태·색·화풍)는 사용자가 본다.

## 지키는 것

- 결과·참조·실패작을 지우거나 덮어쓰지 않는다. 승인된 것만 게임 에셋으로 복사하고, 복사본은 `desk.json`의 결과 SHA로 추적한다.
- `desk.json`·`REQUEST.md`·`CHAT.txt`는 손으로 고치지 않는다 (`add`/`feedback`으로).
- 서버는 `127.0.0.1`에만 열린다.
- 예전 배치 도구(`tools/art-batch.py`, `assets/art-batches/`)는 그대로 둔다. 새 요청은 데스크로.
