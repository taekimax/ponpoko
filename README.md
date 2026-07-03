# 폰포코 아케이드

iPhone Safari 세로 화면 기준의 고전 게임 실행기입니다. 현재 폰포코, 퍼즐 보블, 슈퍼 팡, 메탈 슬러그, 슈퍼 마리오 월드 한국어판, 스트리트 파이터 II CE, 천지를 먹다 II 한국어판을 노출합니다.

모바일 액션 게임은 화면 왼쪽의 반투명 가상 스틱과 오른쪽 게임 버튼으로 조작합니다. 데스크톱은 방향키와 `QWE` / `ASD` 버튼 배열을 사용합니다.


EmulatorJS 런타임, MAME/SNES9x 코어 데이터, 압축 해제 스크립트는 iPhone Safari의 cross-origin 초기화 변수를 줄이기 위해 `public/emulatorjs/`에서 같은 origin으로 제공합니다. 교체할 때는 `public/emulatorjs/LICENSE`와 `public/emulatorjs/NOTICE.txt`도 함께 확인합니다.

## 개발

```bash
npm install
npm run dev
```

## 검증

```bash
npm test
npm run typecheck
npm run build
npm run smoke
```

## 배포

GitHub Pages URL은 `https://taekimax.github.io/ponpoko/`입니다.
