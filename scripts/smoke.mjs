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

const html = await readFile("dist/index.html", "utf8");
if (!html.includes("/ponpoko/assets/")) {
  throw new Error("dist/index.html does not use /ponpoko/ asset paths");
}

for (const rom of roms) {
  await assertZip(path.join("public/roms", rom));
  await assertZip(path.join("dist/roms", rom));
}

const loaderResponse = await fetch("https://cdn.emulatorjs.org/stable/data/loader.js", { method: "HEAD" });
if (!loaderResponse.ok) {
  throw new Error(`EmulatorJS CDN loader is not reachable: ${loaderResponse.status}`);
}

console.log("smoke ok: build paths, ROM files, and EmulatorJS CDN are reachable");

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
