import { readFile, readdir, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { CATALOG_ROMS } from "./catalog-roms.mjs";

const romDir = path.join(process.cwd(), "roms");
const distRomDir = path.join(process.cwd(), "dist/roms");
const emulatorAssets = [
  "loader.js",
  "emulator.min.js",
  "emulator.min.css",
  "cores/reports/mame2003_plus.json",
  "cores/mame2003_plus-legacy-wasm.data",
  "compression/extract7z.js",
  "compression/extractzip.js",
  "LICENSE",
  "NOTICE.txt"
];
const stateAssets = ["ponpoko-start.state"];

const html = await readFile("dist/index.html", "utf8");
if (!html.includes("/ponpoko/assets/")) {
  throw new Error("dist/index.html does not use /ponpoko/ asset paths");
}

const distRomFiles = (await readdir(distRomDir)).filter((fileName) => fileName.endsWith(".zip")).sort();
if (JSON.stringify(distRomFiles) !== JSON.stringify([...CATALOG_ROMS].sort())) {
  throw new Error(`dist/roms must contain only catalog ROMs, got ${JSON.stringify(distRomFiles)}`);
}

for (const rom of CATALOG_ROMS) {
  const rootRom = path.join(romDir, rom);
  const distRom = path.join(distRomDir, rom);

  await assertZip(rootRom);
  await assertZip(distRom);
  await assertSameHash(rootRom, distRom);
}

for (const asset of emulatorAssets) {
  await assertAsset(path.join("public/emulatorjs", asset));
  await assertAsset(path.join("dist/emulatorjs", asset));
}

for (const asset of stateAssets) {
  await assertAsset(path.join("public/states", asset));
  await assertAsset(path.join("dist/states", asset));
}

console.log("smoke ok: build paths, root/dist ROM hashes, local EmulatorJS assets, and start states are available");

async function assertZip(filePath) {
  const fileStat = await stat(filePath);
  if (fileStat.size < 1024) {
    throw new Error(`${filePath} is unexpectedly small`);
  }

  const buffer = await readFile(filePath);
  if (buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
    throw new Error(`${filePath} is not a zip file`);
  }
}

async function assertAsset(filePath) {
  const fileStat = await stat(filePath);
  if (fileStat.size <= 0) {
    throw new Error(`${filePath} is empty`);
  }
}

async function assertSameHash(sourcePath, targetPath) {
  const sourceHash = await sha256(sourcePath);
  const targetHash = await sha256(targetPath);
  if (sourceHash !== targetHash) {
    throw new Error(`${targetPath} does not match ${sourcePath}: ${targetHash} !== ${sourceHash}`);
  }
}

async function sha256(filePath) {
  return createHash("sha256").update(await readFile(filePath)).digest("hex");
}
