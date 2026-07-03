import { readFile } from "node:fs/promises";
import path from "node:path";
import { CATALOG_ROMS } from "./catalog-roms.mjs";

const romDir = path.join(process.cwd(), "roms");

for (const rom of CATALOG_ROMS) {
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
