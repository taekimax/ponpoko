# 폰포코 아케이드

iPhone Safari 세로 화면 기준의 고전 아케이드 실행기입니다. 정적 카탈로그 10개 게임만 지원하며, 게임을 선택할 때 같은 origin의 `/ponpoko/roms/<romFile>` 경로에서 ROM을 다운로드한 뒤 EmulatorJS `mame2003` 코어로 실행합니다.

## 개발

```bash
npm install
npm run prepare:roms
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

GitHub Pages URL은 `https://taekimax.github.io/ponpoko/`입니다. ROM ZIP은 git에 커밋하지 않고, `prepare:roms`가 빌드 전에 `public/roms/`에 준비합니다.
