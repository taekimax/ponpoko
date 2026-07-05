import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { inflateRawSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { CATALOG } from "../src/catalog";

const expectedRoms = CATALOG.map((game) => game.romFile);
const metalSlugFbNeoSpriteRoms = {
  "201-c1.c1": "72813676",
  "201-c2.c2": "96f62574",
  "201-c3.c3": "5121456a",
  "201-c4.c4": "f4ad59a3"
};
const neoGeoFbNeoBiosRoms = {
  "000-lo.lo": "5a86cff2",
  "sfix.sfix": "c2ea0cfd",
  "sm1.sm1": "94416d67",
  "sp-s3.sp1": "91b64be3"
};
const metalSlugSpriteRomSize = 4 * 1024 * 1024;

describe("root ROM files", () => {
  it("uses the catalog ROM manifest from root roms for build-time verification", () => {
    const manifestPath = path.join(process.cwd(), "scripts/catalog-roms.mjs");
    const manifestSource = readFileSync(manifestPath, "utf8");

    for (const romFile of expectedRoms) {
      expect(manifestSource).toContain(`"${romFile}"`);
    }
  });

  it("declares the required Neo Geo parent BIOS for build copy", () => {
    const manifestSource = readFileSync(path.join(process.cwd(), "scripts/catalog-roms.mjs"), "utf8");
    const copyScriptSource = readFileSync(path.join(process.cwd(), "scripts/copy-root-roms-to-dist.mjs"), "utf8");
    const prepareScriptSource = readFileSync(path.join(process.cwd(), "scripts/prepare-roms.mjs"), "utf8");

    expect(manifestSource).toContain("CATALOG_PARENT_ROMS");
    expect(manifestSource).toContain('"neogeo.zip"');
    expect(copyScriptSource).toContain("CATALOG_PARENT_ROMS");
    expect(copyScriptSource).toContain("distRootPath");
    expect(copyScriptSource).not.toContain("existsSync");
    expect(prepareScriptSource).toContain("CATALOG_PARENT_ROMS");
  });

  it("requires a Neo Geo parent BIOS archive for FBNeo Metal Slug", () => {
    const sourcePath = path.join(process.cwd(), "roms", "neogeo.zip");

    expect(existsSync(sourcePath), `${sourcePath} should exist`).toBe(true);
    const archive = readZipEntries(readFileSync(sourcePath));

    expect([...archive.keys()].sort()).toEqual(Object.keys(neoGeoFbNeoBiosRoms).sort());
    for (const [fileName, expectedCrc] of Object.entries(neoGeoFbNeoBiosRoms)) {
      const entry = archive.get(fileName);

      expect(entry, `${fileName} should be present in neogeo.zip`).toBeDefined();
      expect(entry?.metadataCrc32, `${fileName} central directory CRC`).toBe(expectedCrc);
      expect(crc32Hex(extractZipEntry(entry!)), `${fileName} content CRC`).toBe(expectedCrc);
    }
  });

  it("matches catalog cache versions to the actual root ROM bytes", () => {
    for (const game of CATALOG) {
      const sourcePath = path.join(process.cwd(), "roms", game.romFile);
      const bytes = readFileSync(sourcePath);
      const hash = createHash("sha256").update(bytes).digest("hex");

      expect(existsSync(sourcePath), `${sourcePath} should exist`).toBe(true);
      expect(bytes.byteLength).toBeGreaterThan(1024);
      expect(bytes[0]).toBe(0x50);
      expect(bytes[1]).toBe(0x4b);
      expect(hash, game.romFile).toBe(game.romVersion);
    }
  });

  it("keeps Metal Slug sprite ROMs in the original FBNeo-compatible order", () => {
    const sourcePath = path.join(process.cwd(), "roms", "mslug.zip");
    const archive = readZipEntries(readFileSync(sourcePath));

    for (const [fileName, expectedCrc] of Object.entries(metalSlugFbNeoSpriteRoms)) {
      const entry = archive.get(fileName);

      expect(entry, `${fileName} should be present in mslug.zip`).toBeDefined();
      expect(entry?.uncompressedSize, fileName).toBe(metalSlugSpriteRomSize);
      expect(entry?.metadataCrc32, `${fileName} central directory CRC`).toBe(expectedCrc);
      expect(crc32Hex(extractZipEntry(entry!)), `${fileName} content CRC`).toBe(expectedCrc);
    }

    for (const mame2003PlusName of ["201-c1.bin", "201-c2.bin", "201-c3.bin", "201-c4.bin"]) {
      expect(archive.has(mame2003PlusName), `${mame2003PlusName} should not be required for Metal Slug`).toBe(false);
    }
  });

  it("runs root ROM copy and validation in the build and Pages workflow", () => {
    const packageJson = JSON.parse(readFileSync(path.join(process.cwd(), "package.json"), "utf8")) as {
      scripts: Record<string, string>;
    };
    const workflow = readFileSync(path.join(process.cwd(), ".github/workflows/deploy.yml"), "utf8");

    expect(packageJson.scripts.build).toContain("copy-root-roms-to-dist.mjs");
    expect(workflow).not.toContain("ARCADE_SAFARI_SKIP_ROMS");
    expect(workflow).toContain("npm run smoke");
  });
});

interface ZipEntry {
  compressedDataOffset: number;
  compressedSize: number;
  compressionMethod: number;
  metadataCrc32: string;
  uncompressedSize: number;
  zip: Buffer;
}

function readZipEntries(zip: Buffer): Map<string, ZipEntry> {
  const endOfCentralDirectoryOffset = findEndOfCentralDirectory(zip);
  const centralDirectorySize = zip.readUInt32LE(endOfCentralDirectoryOffset + 12);
  const centralDirectoryOffset = zip.readUInt32LE(endOfCentralDirectoryOffset + 16);
  const entries = new Map<string, ZipEntry>();
  let offset = centralDirectoryOffset;
  const endOffset = centralDirectoryOffset + centralDirectorySize;

  while (offset < endOffset) {
    if (zip.readUInt32LE(offset) !== 0x02014b50) {
      throw new Error(`Invalid ZIP central directory header at ${offset}`);
    }

    const compressionMethod = zip.readUInt16LE(offset + 10);
    const metadataCrc32 = zip.readUInt32LE(offset + 16).toString(16).padStart(8, "0");
    const compressedSize = zip.readUInt32LE(offset + 20);
    const uncompressedSize = zip.readUInt32LE(offset + 24);
    const fileNameLength = zip.readUInt16LE(offset + 28);
    const extraFieldLength = zip.readUInt16LE(offset + 30);
    const fileCommentLength = zip.readUInt16LE(offset + 32);
    const localHeaderOffset = zip.readUInt32LE(offset + 42);
    const fileName = zip.subarray(offset + 46, offset + 46 + fileNameLength).toString("utf8");
    const compressedDataOffset = readCompressedDataOffset(zip, localHeaderOffset);

    entries.set(fileName, {
      compressedDataOffset,
      compressedSize,
      compressionMethod,
      metadataCrc32,
      uncompressedSize,
      zip
    });
    offset += 46 + fileNameLength + extraFieldLength + fileCommentLength;
  }

  return entries;
}

function findEndOfCentralDirectory(zip: Buffer): number {
  const minimumOffset = Math.max(0, zip.length - 0xffff - 22);

  for (let offset = zip.length - 22; offset >= minimumOffset; offset -= 1) {
    if (zip.readUInt32LE(offset) === 0x06054b50) {
      return offset;
    }
  }

  throw new Error("ZIP end of central directory not found");
}

function readCompressedDataOffset(zip: Buffer, localHeaderOffset: number): number {
  if (zip.readUInt32LE(localHeaderOffset) !== 0x04034b50) {
    throw new Error(`Invalid ZIP local file header at ${localHeaderOffset}`);
  }

  const fileNameLength = zip.readUInt16LE(localHeaderOffset + 26);
  const extraFieldLength = zip.readUInt16LE(localHeaderOffset + 28);
  return localHeaderOffset + 30 + fileNameLength + extraFieldLength;
}

function extractZipEntry(entry: ZipEntry): Buffer {
  const compressed = entry.zip.subarray(
    entry.compressedDataOffset,
    entry.compressedDataOffset + entry.compressedSize
  );

  if (entry.compressionMethod === 0) {
    return compressed;
  }

  if (entry.compressionMethod === 8) {
    return inflateRawSync(compressed);
  }

  throw new Error(`Unsupported ZIP compression method: ${entry.compressionMethod}`);
}

function crc32Hex(bytes: Buffer): string {
  let crc = 0xffffffff;

  for (const byte of bytes) {
    crc = (crc >>> 8) ^ crc32Table[(crc ^ byte) & 0xff];
  }

  return ((crc ^ 0xffffffff) >>> 0).toString(16).padStart(8, "0");
}

const crc32Table = Array.from({ length: 256 }, (_, index) => {
  let value = index;

  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }

  return value >>> 0;
});
