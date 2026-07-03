# 폰포코 아케이드

iPhone Safari 세로 화면 기준의 고전 아케이드 실행기입니다. 
EmulatorJS 런타임, MAME 코어 데이터, 압축 해제 스크립트는 iPhone Safari의 cross-origin 초기화 변수를 줄이기 위해 `public/emulatorjs/`에서 같은 origin으로 제공합니다. 교체할 때는 `public/emulatorjs/LICENSE`와 `public/emulatorjs/NOTICE.txt`도 함께 확인합니다.

## 개발

```bash
npm install
npm run prepare:roms
npm run dev
```

기본 ROM 디렉터리는 `/Volumes/dev/ponpoko/roms`입니다. 다른 위치를 쓸 때는 `ARCADE_SAFARI_ROM_DIR=/path/to/roms npm run dev`처럼 지정합니다. 필요한 파일은 `ponpoko.zip`, `bublbobl1.zip`, `spangj.zip`입니다.

## 검증

```bash
npm test
npm run typecheck
npm run build
npm run smoke
```

## 배포

GitHub Pages URL은 `https://taekimax.github.io/ponpoko/`입니다. 이 브랜치의 ROM ZIP은 git에 커밋하지 않고 로컬 Vite dev/preview 서버가 `ARCADE_SAFARI_ROM_DIR`에서 제공합니다.

정적 배포에서 ROM을 웹에서 받으려면 GitHub repository variable `ARCADE_SAFARI_ROM_BASE_URL`에 권한 있는 ROM 호스팅 URL을 설정합니다. 빌드는 이 값을 `VITE_ROM_BASE_URL`로 주입하며, 앱은 `${VITE_ROM_BASE_URL}/ponpoko.zip`처럼 ZIP 파일을 가져옵니다. Pages 배포 워크플로는 이 값이 없으면 실패합니다. 로컬 개발에서 값이 없을 때의 기본값은 같은 origin의 `/ponpoko/roms/`입니다.
