# 오아시스 본체·효과범위 1.4배 · 사용자 승인

js/biomeObjects.js의동일scale계산에desert-oasis만1.4곱함. 기존결정적variation(.8~1.2)은그대로남고실제visualScale=variation×1.4. o.config.radius=기존cfg.radius×같은visualScale. renderer drawObjectArt는visualScale×2로본체를그리고range표시/실제heal접촉은o.config.radius를함께사용하므로세경로가동일배율로커진다.

기준body228×154world→319.2×215.6world,기준radius140→196world(variation=1일때). 변동size/범위는같은배율. 카탈로그/설정값기본은미수정. 기본count2,위치seed/hash,회복power기존cfg.power×2(.10),cooldown·대상·연속heal·난수불변. 다른후보scale영향없음.

tests/biome-objects.test.mjs 기존R-WORLD-016 visualScale/radius정합과실제경계안팎continuousheal검수유지. 추가테스트1.4공식·기존variation·count2·power불변·동seeddeterminism검증. 관련11테스트통과. 실제장면크기/직관성확인은부모브라우저후속. config/repo다른모듈/git수정없음.
