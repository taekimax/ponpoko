import { readFile, stat } from "node:fs/promises";
import path from "node:path";

const roms = [
  "ponpoko.zip",
  "bubbobr1.zip",
  "neobombe.zip",
  "atetris.zip",
  "snowbros.zip",
  "dino.zip",
  "pbobble.zip",
  "penbros.zip",
  "tnzs.zip",
  "pang.zip"
];
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

for (const rom of roms) {
  await assertZip(path.join("public/roms", rom));
  await assertZip(path.join("dist/roms", rom));
}

for (const asset of emulatorAssets) {
  await assertAsset(path.join("public/emulatorjs", asset));
  await assertAsset(path.join("dist/emulatorjs", asset));
}

for (const asset of stateAssets) {
  await assertAsset(path.join("public/states", asset));
  await assertAsset(path.join("dist/states", asset));
}

console.log("smoke ok: build paths, ROM files, local EmulatorJS assets, and start states are available");

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
