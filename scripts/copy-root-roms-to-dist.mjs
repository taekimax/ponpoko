import { copyFile, mkdir, readFile, rm } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { CATALOG_ROMS } from "./catalog-roms.mjs";

const rootDir = process.cwd();
const sourceDir = path.join(rootDir, "roms");
const distRomDir = path.join(rootDir, "dist/roms");

await rm(distRomDir, { force: true, recursive: true });
await mkdir(distRomDir, { recursive: true });

for (const romFile of CATALOG_ROMS) {
  const sourcePath = path.join(sourceDir, romFile);
  const distPath = path.join(distRomDir, romFile);

  await validateZip(sourcePath);
  await copyFile(sourcePath, distPath);

  const sourceHash = await sha256(sourcePath);
  const distHash = await sha256(distPath);
  if (sourceHash !== distHash) {
    throw new Error(`${romFile} copy mismatch: source=${sourceHash} dist=${distHash}`);
  }

  console.log(`copied root rom ${romFile} ${sourceHash}`);
}

async function validateZip(filePath) {
  const buffer = await readFile(filePath);
  if (buffer.byteLength === 0) {
    throw new Error(`${filePath} is empty`);
  }
  if (buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
    throw new Error(`${filePath} is not a zip file`);
  }
}

async function sha256(filePath) {
  return createHash("sha256").update(await readFile(filePath)).digest("hex");
}
