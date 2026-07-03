export interface RomDownloadResult {
  blob: Blob;
  objectUrl: string | null;
}

export interface RomArrayBufferDownloadResult {
  arrayBuffer: ArrayBuffer;
  byteLength: number;
  contentType: string | null;
}

export interface RomDownloadOptions {
  fetcher?: typeof fetch;
  onProgress?: (percent: number) => void;
  createObjectUrl?: boolean;
}

export async function downloadRomArrayBuffer(
  url: string,
  options: RomDownloadOptions = {}
): Promise<RomArrayBufferDownloadResult> {
  const fetcher = options.fetcher ?? fetch;
  const response = await fetcher(url);

  if (!response.ok) {
    throw new Error(`ROM을 다운로드하지 못했습니다. (${response.status})`);
  }

  const arrayBuffer = await response.arrayBuffer();
  options.onProgress?.(100);

  return {
    arrayBuffer,
    byteLength: arrayBuffer.byteLength,
    contentType: response.headers.get("content-type")
  };
}

export async function downloadRom(url: string, options: RomDownloadOptions = {}): Promise<RomDownloadResult> {
  const fetcher = options.fetcher ?? fetch;
  const response = await fetcher(url);
  let lastProgress = -1;
  const reportProgress = (percent: number) => {
    if (percent !== lastProgress) {
      lastProgress = percent;
      options.onProgress?.(percent);
    }
  };

  if (!response.ok) {
    throw new Error(`ROM을 다운로드하지 못했습니다. (${response.status})`);
  }

  const contentLength = Number(response.headers.get("content-length") ?? "0");

  if (!response.body || contentLength <= 0) {
    const blob = await response.blob();
    reportProgress(100);
    return { blob, objectUrl: createObjectUrl(blob, options) };
  }

  const reader = response.body.getReader();
  const chunks: BlobPart[] = [];
  let received = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    const copy = new Uint8Array(value.byteLength);
    copy.set(value);
    chunks.push(copy.buffer);
    received += value.byteLength;
    reportProgress(Math.min(100, Math.round((received / contentLength) * 100)));
  }

  const blob = new Blob(chunks, { type: "application/zip" });
  reportProgress(100);

  return {
    blob,
    objectUrl: createObjectUrl(blob, options)
  };
}

function createObjectUrl(blob: Blob, options: RomDownloadOptions): string | null {
  if (options.createObjectUrl === false) {
    return null;
  }
  return URL.createObjectURL(blob);
}
