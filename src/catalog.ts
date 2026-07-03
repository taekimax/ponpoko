import { GAME_CATALOG, type GameEntry } from "./games";

export type { ControllerProfileId, GameEntry, GameId } from "./games";

type RomImportMeta = ImportMeta & {
  env?: {
    VITE_ROM_BASE_URL?: string;
  };
};

const DEFAULT_ROM_BASE_PATH = "/ponpoko/roms/";
const CONFIGURED_ROM_BASE_URL = ((import.meta as RomImportMeta).env?.VITE_ROM_BASE_URL ?? "").trim();

export const ROM_BASE_PATH = normalizeRomBaseUrl(CONFIGURED_ROM_BASE_URL) ?? DEFAULT_ROM_BASE_PATH;
export const THUMB_BASE_PATH = "/ponpoko/thumbs/";

export const CATALOG: GameEntry[] = [...GAME_CATALOG];

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
