import { copyFile, mkdir, readFile, rm } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { CATALOG_PARENT_ROMS, CATALOG_ROMS } from "./catalog-roms.mjs";

const rootDir = process.cwd();
const sourceDir = path.join(rootDir, "roms");
const distRootDir = path.join(rootDir, "dist");
const distRomDir = path.join(rootDir, "dist/roms");

await rm(distRomDir, { force: true, recursive: true });
await mkdir(distRomDir, { recursive: true });

const romFiles = [
  ...CATALOG_ROMS,
  ...CATALOG_PARENT_ROMS
];

for (const romFile of romFiles) {
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

for (const parentRomFile of CATALOG_PARENT_ROMS) {
  const sourcePath = path.join(sourceDir, parentRomFile);
  const distRootPath = path.join(distRootDir, parentRomFile);

  await copyFile(sourcePath, distRootPath);

  const sourceHash = await sha256(sourcePath);
  const distHash = await sha256(distRootPath);
  if (sourceHash !== distHash) {
    throw new Error(`${parentRomFile} root copy mismatch: source=${sourceHash} dist=${distHash}`);
  }

  console.log(`copied root parent rom ${parentRomFile} ${sourceHash}`);
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
