# 흡수흐름 v2 exactcrop 제작

absorption-003.png 및정확프롬프트를읽고중앙패널작은오른쪽→큰왼쪽의두흐름만crop XYXY(1055,330)-(1171,394), 116×64했다. 원본2172×724. crop는몸체/대상진행arc포함없고olive배경+두얇은선만. references/crop-manifest.json에원본·좌표·SHA보존. 이exactcrop를각builtinimagegen입력으로직접전달해001과필요한단일repair002생성. 모든원본/정확prompt보존. pixel편집없음.

001은왼쪽화살표머리와흰파편질감이과했다. cleanedge/작은tip단일교정002는아래선화살표를없애고상단선두만남기며전체파편이줄었지만희소흰조각은여전히남는다. 002잠정선택,완전해결로평가하지않음. parent작은게임규모합성판단필수. body/terrain/targetarc/ring/leaf/fooddot/plus/noUI없고중립ivory라회복민트모티프와구분. alpha실제0–255이며체크배경없음.

manifest의visibleBBoxAlpha64·크기·SHA·방향/pivot보존. 실제자산은오른쪽trailing→왼쪽leading방향이다. 부모가target→eater방향을+X로맞춰그리면자산방향을맞추기위해angle+PI 또는등가좌표배치필수. 그냥angle로회전하면수혜전달처럼큰개체→작은개체로거꾸로보일수있음. asset전체pivot(.5,.5), leading약(.225,.28),trailing약(.78,.65); 두곡선의전체대각밴드여서bbox를짧은실제접촉간격에폭을늘려맞추고높이를6~10screenpx이내검수. 진행arc는실제작은target에기존code로유지하며흡수량/대상/유효거리/쿨다운/RNG변경없음.

병목: 추출형생성도source보다굵은arrow·roughalpha파편을만든다. 한회repair후남은흰질감은부분실패로기록,무작정추가생성안함. final배치검수전잠정asset이며새전투판정/동족구분을이미지로정하지않는다. 모듈/공유문서/커밋수정없음.
