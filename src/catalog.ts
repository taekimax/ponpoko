export type ControllerProfileId =
  | "platformJump"
  | "platformFire"
  | "dpadOneButton"
  | "tetris"
  | "beatEmUp"
  | "puzzleAim"
  | "puzzleShoot";

export interface GameEntry {
  id: string;
  titleKo: string;
  titleEn: string;
  core: "mame2003_plus";
  rotation: 0;
  romFile: string;
  thumbnailFile: string;
  sourcePageUrl: string;
  controllerProfile: ControllerProfileId;
}

export const ROM_BASE_PATH = "/ponpoko/roms/";
export const THUMB_BASE_PATH = "/ponpoko/thumbs/";

export const CATALOG: GameEntry[] = [
  {
    id: "ponpoko",
    titleKo: "너구리",
    titleEn: "Ponpoko",
    core: "mame2003_plus",
    rotation: 0,
    romFile: "ponpoko.zip",
    thumbnailFile: "ponpoko.jpg",
    sourcePageUrl: "https://www.oldgamenara.com/bbs/board.php?bo_table=oldgame2&wr_id=89",
    controllerProfile: "platformJump"
  },
  {
    id: "bubbobr1",
    titleKo: "보글보글",
    titleEn: "Bubble Bobble",
    core: "mame2003_plus",
    rotation: 0,
    romFile: "bubbobr1.zip",
    thumbnailFile: "bubbobr1.jpg",
    sourcePageUrl: "https://www.oldgamenara.com/bbs/board.php?bo_table=oldgame2&wr_id=5&sca=arcade",
    controllerProfile: "platformFire"
  },
  {
    id: "neobombe",
    titleKo: "네오범버맨",
    titleEn: "Neo Bomberman",
    core: "mame2003_plus",
    rotation: 0,
    romFile: "neobombe.zip",
    thumbnailFile: "neobombe.jpg",
    sourcePageUrl: "https://www.oldgamenara.com/bbs/board.php?bo_table=oldgame2&wr_id=353&sca=arcade",
    controllerProfile: "dpadOneButton"
  },
  {
    id: "atetris",
    titleKo: "테트리스",
    titleEn: "Tetris",
    core: "mame2003_plus",
    rotation: 0,
    romFile: "atetris.zip",
    thumbnailFile: "atetris.jpg",
    sourcePageUrl: "https://www.oldgamenara.com/bbs/board.php?bo_table=oldgame2&wr_id=181&sca=arcade",
    controllerProfile: "tetris"
  },
  {
    id: "snowbros",
    titleKo: "스노우 브라더스",
    titleEn: "Snow Bros.",
    core: "mame2003_plus",
    rotation: 0,
    romFile: "snowbros.zip",
    thumbnailFile: "snowbros.jpg",
    sourcePageUrl: "https://www.oldgamenara.com/bbs/board.php?bo_table=oldgame2&wr_id=91&sca=arcade",
    controllerProfile: "platformFire"
  },
  {
    id: "dino",
    titleKo: "캐딜락&디노사우르스",
    titleEn: "Cadillacs and Dinosaurs",
    core: "mame2003_plus",
    rotation: 0,
    romFile: "dino.zip",
    thumbnailFile: "dino.jpg",
    sourcePageUrl: "https://www.oldgamenara.com/bbs/board.php?bo_table=oldgame2&wr_id=82&sca=arcade",
    controllerProfile: "beatEmUp"
  },
  {
    id: "pbobble",
    titleKo: "퍼즐 보블",
    titleEn: "Puzzle Bobble",
    core: "mame2003_plus",
    rotation: 0,
    romFile: "pbobble.zip",
    thumbnailFile: "pbobble.jpg",
    sourcePageUrl: "https://www.oldgamenara.com/bbs/board.php?bo_table=oldgame2&wr_id=178&sca=arcade",
    controllerProfile: "puzzleAim"
  },
  {
    id: "penbros",
    titleKo: "펭귄 브라더스",
    titleEn: "Penguin Brothers",
    core: "mame2003_plus",
    rotation: 0,
    romFile: "penbros.zip",
    thumbnailFile: "penbros.jpg",
    sourcePageUrl: "https://www.oldgamenara.com/bbs/board.php?bo_table=oldgame2&wr_id=182&sca=arcade",
    controllerProfile: "platformFire"
  },
  {
    id: "tnzs",
    titleKo: "뉴질랜드 스토리",
    titleEn: "The New Zealand Story",
    core: "mame2003_plus",
    rotation: 0,
    romFile: "tnzs.zip",
    thumbnailFile: "tnzs.jpg",
    sourcePageUrl: "https://www.oldgamenara.com/bbs/board.php?bo_table=oldgame2&wr_id=85&sca=arcade",
    controllerProfile: "platformFire"
  },
  {
    id: "pang",
    titleKo: "팡!",
    titleEn: "Pang!",
    core: "mame2003_plus",
    rotation: 0,
    romFile: "pang.zip",
    thumbnailFile: "pang.jpg",
    sourcePageUrl: "https://www.oldgamenara.com/bbs/board.php?bo_table=oldgame2&wr_id=357",
    controllerProfile: "puzzleShoot"
  }
];

export function getRomPath(game: GameEntry): string {
  return `${ROM_BASE_PATH}${game.romFile}`;
}

export function getThumbnailPath(game: GameEntry): string {
  return `${THUMB_BASE_PATH}${game.thumbnailFile}`;
}

export function findGame(gameId: string): GameEntry | undefined {
  return CATALOG.find((game) => game.id === gameId);
}
