import { describe, expect, it, vi } from "vitest";
import { downloadRom, downloadRomArrayBuffer } from "../src/rom-download";

describe("ROM downloader", () => {
  it("downloads a ROM at play time and reports progress", async () => {
    const progress: number[] = [];
    const chunks = [new Uint8Array([1, 2]), new Uint8Array([3, 4])];
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        for (const chunk of chunks) {
          controller.enqueue(chunk);
        }
        controller.close();
      }
    });
    const fetcher = vi.fn(async () => new Response(stream, {
      headers: { "content-length": "4" }
    }));

    const result = await downloadRom("/ponpoko/roms/ponpoko.zip", {
      fetcher,
      onProgress: (value) => progress.push(value)
    });

    expect(fetcher).toHaveBeenCalledWith("/ponpoko/roms/ponpoko.zip", expect.objectContaining({
      cache: "force-cache"
    }));
    expect(result.blob.size).toBe(4);
    expect(result.objectUrl).not.toBeNull();
    expect(result.objectUrl?.startsWith("blob:")).toBe(true);
    expect(progress).toEqual([50, 100]);

    URL.revokeObjectURL(result.objectUrl!);
  });

  it("returns a Korean error message when download fails", async () => {
    const fetcher = vi.fn(async () => new Response("missing", { status: 404 }));

    await expect(downloadRom("/ponpoko/roms/missing.zip", { fetcher })).rejects.toThrow(
      "ROM을 다운로드하지 못했습니다"
    );
  });

  it("can warm up a ROM download without creating a blob URL", async () => {
    const fetcher = vi.fn(async () => new Response(new Uint8Array([0x50, 0x4b]), {
      headers: { "content-length": "2" }
    }));

    const result = await downloadRom("/ponpoko/roms/ponpoko.zip", {
      fetcher,
      createObjectUrl: false
    });

    expect(result.blob.size).toBe(2);
    expect(result.objectUrl).toBeNull();
  });

  it("downloads the complete ROM ZIP as one ArrayBuffer handoff", async () => {
    const progress: number[] = [];
    const romBytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04]);
    const fetcher = vi.fn(async () => new Response(romBytes, {
      headers: {
        "content-length": "4",
        "content-type": "application/zip"
      }
    }));

    const result = await downloadRomArrayBuffer("/ponpoko/roms/ponpoko.zip", {
      fetcher,
      onProgress: (value) => progress.push(value)
    });

    expect(fetcher).toHaveBeenCalledWith("/ponpoko/roms/ponpoko.zip", expect.objectContaining({
      cache: "force-cache"
    }));
    expect(result.byteLength).toBe(4);
    expect([...new Uint8Array(result.arrayBuffer)]).toEqual([...romBytes]);
    expect("objectUrl" in result).toBe(false);
    expect(progress).toEqual([100]);
  });

  it("reuses a locally cached ROM ArrayBuffer before requesting the network", async () => {
    const cached = new Uint8Array([7, 8, 9]).buffer;
    const fetcher = vi.fn(async () => new Response(new Uint8Array([1, 2, 3])));
    const romCache = {
      load: vi.fn(async () => cached),
      save: vi.fn(async (_cacheKey: string, _arrayBuffer: ArrayBuffer) => true)
    };

    const result = await downloadRomArrayBuffer("/ponpoko/roms/mslug.zip", {
      cacheKey: "mslug.zip:hash",
      fetcher,
      romCache
    });

    expect(fetcher).not.toHaveBeenCalled();
    expect(romCache.load).toHaveBeenCalledWith("mslug.zip:hash");
    expect(romCache.save).not.toHaveBeenCalled();
    expect([...new Uint8Array(result.arrayBuffer)]).toEqual([7, 8, 9]);
  });

  it("defers saving a freshly downloaded ROM ArrayBuffer until after the first response", async () => {
    vi.useFakeTimers();
    const romBytes = new Uint8Array([0x50, 0x4b, 0x03, 0x04]);
    const fetcher = vi.fn(async () => new Response(romBytes, {
      headers: {
        "content-length": "4",
        "content-type": "application/zip"
      }
    }));
    const romCache = {
      load: vi.fn(async () => null),
      save: vi.fn(async (_cacheKey: string, _arrayBuffer: ArrayBuffer) => true)
    };

    const result = await downloadRomArrayBuffer("/ponpoko/roms/mslug.zip", {
      cacheKey: "mslug.zip:hash",
      fetcher,
      romCache
    });

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(romCache.save).not.toHaveBeenCalled();
    expect([...new Uint8Array(result.arrayBuffer)]).toEqual([...romBytes]);

    await vi.runAllTimersAsync();

    expect(romCache.save).toHaveBeenCalledWith("mslug.zip:hash", expect.any(ArrayBuffer));
    const savedBuffer = romCache.save.mock.calls[0]?.[1];
    expect(savedBuffer).toBeInstanceOf(ArrayBuffer);
    expect([...new Uint8Array(savedBuffer)]).toEqual([...romBytes]);
    vi.useRealTimers();
  });

  it("lets the app hold ROM cache writes until gameplay startup is complete", async () => {
    const romBytes = new Uint8Array([0x50, 0x4b, 0x05, 0x06]);
    const fetcher = vi.fn(async () => new Response(romBytes, {
      headers: {
        "content-length": String(romBytes.byteLength)
      },
      status: 200
    }));
    const queuedTasks: Array<() => void> = [];
    const romCache = {
      load: vi.fn(async () => null),
      save: vi.fn(async () => true)
    };

    const result = await downloadRomArrayBuffer("/ponpoko/roms/spang.zip", {
      cacheKey: "spang.zip:hash",
      cacheSaveScheduler: (task) => queuedTasks.push(task),
      fetcher,
      romCache
    });

    expect([...new Uint8Array(result.arrayBuffer)]).toEqual([...romBytes]);
    expect(queuedTasks).toHaveLength(1);
    expect(romCache.save).not.toHaveBeenCalled();

    queuedTasks[0]();

    expect(romCache.save).toHaveBeenCalledWith("spang.zip:hash", expect.any(ArrayBuffer));
  });
});
