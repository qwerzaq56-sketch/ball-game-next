# 캐릭터·효과 렌더 비용 읽기전용 점검

2026-10-06. 현재 characterRasterArt.js/effectRasterArt.js/progressionRasterArt.js 코드읽기만,추가생성/게임/API/git수정없음. 실제자연플레이FPS/프레임시간/기기GPU측정아님. 기존fixturecache수치로자연플레이FPS를추정하지않는다.

## 캐시와 cold cost

| 경로 | 상한 | RGBA 픽셀 이론용량 | 최초비용 |
|---|---:|---:|---|
| 캐릭터source |192²×3|약.422MiB|PNGdecode·3crop·getImageData |
| 캐릭터color |192²×32|약4.5MiB|색/단계미스마다2번픽셀loop·typedarray/createImageData·putImageData |
| 공통effect |최대256edge×7|최대1.75MiB,실제종횡비따라작음|PNGdecode·sourcecrop1회. 현재v2에는restrainBloom설정없어alpha곡선미실행 |
| 성장/흡수source |256²+512×171|약.584MiB|이미지2개decode·crop |
| 성장/흡수tint |최대24×512×171|최대8.02MiB;성장256²항목은더작음|첫name+color에canvas·source-in fill |

위는rawRGBA계산만. PNG원본디코드버퍼·브라우저canvas/GPU복제·GC·Map/string overhead가더해지므로프로세스실메모리수치아님. 정상5종×3stage+flashwhite×3=18 캐릭터color라32아래이며색상무제한변형을매프레임만들지않는현재설계에서FIFOthrash가능성낮다. 커스텀색/다수flashhex변형이추가되면32미스반복점검필요.

## 매 프레임 draw/할당

- 캐릭터cachehit: 문자열key생성·Map조회후drawImage1회. 정확bodyclip·separatorfill1회·charge/흡수일때stroke1회. 새crescent는추가ellipse path+fill1회이며blur/filter/새canvas없음. ellipse상단은body에덮여보이지않지만GPUfill은실행되므로대형공이화면을가득채우는장면에서추가overdraw존재.
- 캐릭터매프레임픽셀getImageData/색화없음. 색cache미스첫등장은CPU작업이렌더내발생하므로실제5색/3stage처음등장시점에서스파이크측정필요. 가능하면부모검수로cold/warm분리,현재코드추가불필요.
- drawEntityEffectRaster: 호출당painted배열1개·paintclosure1개,실제효과paint마다옵션객체1개생성. 한효과당drawImage1회+save/translate/restore,일부directionalrotate1회. 동시에charge/dodge/shield/strength/heal/frostclear최대6장식이나실제상태에따라대부분비활성. 이론최대6을평균draw수로말하지않는다.
- drawEffectRaster 자체cachehit는캐시canvas재사용·픽셀처리없음. 준비전호출은loadEffectRaster([id])로작은배열/Promise생성가능하나이미pending에묶여추가decode하지않음. ready후이경로없음.
- progression 활성growth geometry객체1개,흡수 geometry객체1개+topology.delta객체1개. 비활성일때false로끝나draw없음. growth/absorption 각각활성drawImage1회. tintcachehit에서는픽셀처리없음.

## 위험과 현재 판단

색stage첫등장cold CPU작업,많은대형공overdraw,모든상태동시표시시효과옵션/closure/배열의GC가실제점검대상. 하지만코드읽기만으로병목확정또는최적화효과수치주장불가. 현재는고정캐시상한/해상도·inactiveguard·프레임별무blur라구조상무제한자산/픽셀loop보다제어되어있다. 새생성/긴급최적화/게임수치변경을권고하지않는다.

후속자연플레이검수는동일맵·개체수·줌·단계·효과조건에서body/effectONOFF와cold/warm별장기frame distribution/GC/메모리를실측. fixture한번render수치를FPS환산하지않기. 이보고서는비용경로/상한만기록하며최종성능승인아님.
