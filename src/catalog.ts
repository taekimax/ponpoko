export type ControllerProfileId =
  | "platformJump"
  | "platformFire"
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

type RomImportMeta = ImportMeta & {
  env?: {
    VITE_ROM_BASE_URL?: string;
  };
};

const DEFAULT_ROM_BASE_PATH = "/ponpoko/roms/";
const CONFIGURED_ROM_BASE_URL = ((import.meta as RomImportMeta).env?.VITE_ROM_BASE_URL ?? "").trim();

export const ROM_BASE_PATH = normalizeRomBaseUrl(CONFIGURED_ROM_BASE_URL) ?? DEFAULT_ROM_BASE_PATH;
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
    id: "bublbobl1",
    titleKo: "보글보글",
    titleEn: "Bubble Bobble",
    core: "mame2003_plus",
    rotation: 0,
    romFile: "bublbobl1.zip",
    thumbnailFile: "bubbobr1.jpg",
    sourcePageUrl: "https://www.oldgamenara.com/bbs/board.php?bo_table=oldgame2&wr_id=5&sca=arcade",
    controllerProfile: "platformFire"
  },
  {
    id: "spangj",
    titleKo: "슈퍼 팡",
    titleEn: "Super Pang",
    core: "mame2003_plus",
    rotation: 0,
    romFile: "spangj.zip",
    thumbnailFile: "pang.jpg",
    sourcePageUrl: "https://www.oldgamenara.com/bbs/board.php?bo_table=oldgame2&wr_id=357",
    controllerProfile: "puzzleShoot"
  }
];

export function getRomPath(game: GameEntry): string {
  return resolveRomPath(ROM_BASE_PATH, game.romFile);
}

export function getThumbnailPath(game: GameEntry): string {
  return `${THUMB_BASE_PATH}${game.thumbnailFile}`;
}

export function findGame(gameId: string): GameEntry | undefined {
  return CATALOG.find((game) => game.id === gameId);
}

export function resolveRomPath(baseUrl: string | undefined, romFile: string): string {
  return `${normalizeRomBaseUrl(baseUrl) ?? DEFAULT_ROM_BASE_PATH}${romFile}`;
}

function normalizeRomBaseUrl(baseUrl: string | undefined): string | null {
  const trimmed = baseUrl?.trim();
  if (!trimmed) {
    return null;
  }

  return trimmed.endsWith("/") ? trimmed : `${trimmed}/`;
}
