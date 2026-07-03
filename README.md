# 폰포코 아케이드

iPhone Safari 세로 화면 기준의 고전 아케이드 실행기입니다. 현재 `native-emulator` 작업 브랜치는 폰포코, 퍼즐 보블, 팡 3개 게임만 노출합니다.

EmulatorJS 런타임, MAME 코어 데이터, 압축 해제 스크립트는 iPhone Safari의 cross-origin 초기화 변수를 줄이기 위해 `public/emulatorjs/`에서 같은 origin으로 제공합니다. 교체할 때는 `public/emulatorjs/LICENSE`와 `public/emulatorjs/NOTICE.txt`도 함께 확인합니다.

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
