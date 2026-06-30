import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import process from "node:process";

const ROM_SOURCE_BASE = "https://emulatorgamez.net/roms/mame/";
const OLDGAMENARA_FILE_BASE = "https://www.oldgamenara.com/data/file/oldgame2/";

const games = [
  ["ponpoko.zip", "ponpoko.jpg", "838743301_wvFVg8yi_ponpoko.jpg"],
  ["bubbobr1.zip", "bubbobr1.jpg", "1794155758_VaSh3bMp_2013-11-18_143B023B37.JPEG"],
  ["neobombe.zip", "neobombe.jpg", "1794155758_HjNzfMhD_2013-11-18_143B033B19.JPEG"],
  ["atetris.zip", "atetris.jpg", "1794155758_HzXNuQfC_2013-11-18_143B143B06.JPEG"],
  ["snowbros.zip", "snowbros.jpg", "838743301_SRXqN2hn_1460.jpg"],
  ["dino.zip", "dino.jpg", "1794155758_oY9bVENw_2013-11-18_143B263B05.JPEG"],
  ["pbobble.zip", "pbobble.jpg", "1794155758_ZDlYLs3h_2013-11-18_143B203B14.JPEG"],
  ["penbros.zip", "penbros.jpg", "1794155758_Ij1H7Nc9_2013-11-18_133B543B14.JPEG"],
  ["tnzs.zip", "tnzs.jpg", "1794155758_ogwTkUsi_2013-11-18_143B273B37.JPEG"],
  ["pang.zip", "pang.jpg", "838743301_xmEQlzAU_0105.jpg"]
].map(([romFile, thumbFile, thumbSourceFile]) => ({
  romFile,
  thumbFile,
  romUrl: `${ROM_SOURCE_BASE}${romFile}`,
  thumbUrl: `${OLDGAMENARA_FILE_BASE}${thumbSourceFile}`
}));

const force = process.argv.includes("--force");
const romDir = path.resolve("public/roms");
const thumbDir = path.resolve("public/thumbs");

await mkdir(romDir, { recursive: true });
await mkdir(thumbDir, { recursive: true });

for (const game of games) {
  await downloadFile(game.romUrl, path.join(romDir, game.romFile), { force, kind: "zip" });
  await downloadFile(game.thumbUrl, path.join(thumbDir, game.thumbFile), { force, kind: "asset" });
}

async function downloadFile(url, targetPath, options) {
  if (!options.force && existsSync(targetPath)) {
    await validateFile(targetPath, options.kind);
    console.log(`skip ${path.basename(targetPath)}`);
    return;
  }

  console.log(`download ${url}`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download ${url}: ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  await writeFile(targetPath, buffer);
  await validateFile(targetPath, options.kind);
  console.log(`saved ${path.basename(targetPath)} ${buffer.byteLength} bytes`);
}

async function validateFile(targetPath, kind) {
  const buffer = await readFile(targetPath);
  if (buffer.byteLength === 0) {
    throw new Error(`${targetPath} is empty`);
  }
  if (kind === "zip" && (buffer[0] !== 0x50 || buffer[1] !== 0x4b)) {
    throw new Error(`${targetPath} is not a zip file`);
  }
}
