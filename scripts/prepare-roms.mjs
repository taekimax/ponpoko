import { readFile } from "node:fs/promises";
import path from "node:path";

const romDir = process.env.ARCADE_SAFARI_ROM_DIR ?? "/Volumes/dev/ponpoko/roms";
const roms = ["ponpoko.zip", "bublbobl1.zip", "spangj.zip"];
const skipRoms = process.env.ARCADE_SAFARI_SKIP_ROMS === "1";

if (skipRoms) {
  console.log("rom validation skipped because ARCADE_SAFARI_SKIP_ROMS=1");
  process.exit(0);
}

for (const rom of roms) {
  await validateZip(path.join(romDir, rom));
  console.log(`rom ok ${rom}`);
}

console.log(`roms ready from ${romDir}`);

async function validateZip(targetPath) {
  const buffer = await readFile(targetPath);
  if (buffer.byteLength === 0) {
    throw new Error(`${targetPath} is empty`);
  }
  if (buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
    throw new Error(`${targetPath} is not a zip file`);
  }
}
