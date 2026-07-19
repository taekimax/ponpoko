import { describe, expect, it, vi } from "vitest";
import {
  readW2LanConfig,
  W2LanGuestHarness,
  W2LanHostHarness,
  type W2LanCaptureEnvironment
} from "../src/w2-lan-capture";
import type {
  StreamCaptureAdapter,
  StreamCaptureSession,
  StreamCaptureSnapshot
} from "../src/stream-capture";

interface Deferred<T> {
  promise: Promise<T>;
  reject(reason?: unknown): void;
  resolve(value: T): void;
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

class FakeElement {
  readonly children: FakeElement[] = [];
  readonly listeners = new Map<string, () => void>();
  autoplay = false;
  currentTime = 1;
  disabled = false;
  muted = false;
  paused = false;
  playsInline = false;
  readyState = 4;
  removed = false;
  srcObject: MediaStream | null = null;
  textContent: string | null = null;
  type = "";
  className = "";
  readonly play = vi.fn(async () => undefined);
  readonly pause = vi.fn();

  append(...elements: FakeElement[]): void {
    this.children.push(...elements);
  }

  appendChild(element: FakeElement): FakeElement {
    this.children.push(element);
    return element;
  }

  insertBefore(element: FakeElement): FakeElement {
    this.children.unshift(element);
    return element;
  }

  addEventListener(type: string, listener: () => void): void {
    this.listeners.set(type, listener);
  }

  setAttribute(): void {}

  click(): void {
    this.listeners.get("click")?.();
  }

  dispatch(type: string): void {
    this.listeners.get(type)?.();
  }

  remove(): void {
    this.removed = true;
  }
}

interface TestTrack extends MediaStreamTrack {
  end(): void;
}

function track(kind: "audio" | "video"): TestTrack {
  const listeners = new Map<string, () => void>();
  let state: MediaStreamTrackState = "live";
  const item = {
    kind,
    get readyState() {
      return state;
    },
    stop: vi.fn(() => {
      state = "ended";
    }),
    addEventListener: vi.fn((type: string, listener: () => void) => listeners.set(type, listener)),
    end: () => {
      state = "ended";
      listeners.get("ended")?.();
    }
  } as unknown as TestTrack;
  return item;
}

function stream(tracks: MediaStreamTrack[]): MediaStream {
  return { getTracks: () => [...tracks] } as unknown as MediaStream;
}

class FakePeer {
  iceGatheringState: RTCIceGatheringState = "complete";
  localDescription: RTCSessionDescription | null = null;
  remoteDescription: RTCSessionDescription | null = null;
  readonly tracks: MediaStreamTrack[] = [];
  readonly close = vi.fn();
  readonly getStats = vi.fn(async () => this.readStats());
  readonly createOffer = vi.fn(async (): Promise<RTCSessionDescriptionInit> => ({
    type: "offer",
    sdp: "offer-with-complete-ice"
  }));
  readonly createAnswer = vi.fn(async (): Promise<RTCSessionDescriptionInit> => ({
    type: "answer",
    sdp: "answer-with-complete-ice"
  }));
  readonly setLocalDescription = vi.fn(async (description: RTCSessionDescriptionInit) => {
    this.localDescription = description as RTCSessionDescription;
  });
  readonly setRemoteDescription = vi.fn(async (description: RTCSessionDescriptionInit) => {
    this.remoteDescription = description as RTCSessionDescription;
  });
  private readonly listeners = new Map<string, (event?: RTCTrackEvent) => void>();

  constructor(private readonly readStats: () => RTCStatsReport) {}

  addTrack(item: MediaStreamTrack): RTCRtpSender {
    this.tracks.push(item);
    return {} as RTCRtpSender;
  }

  addEventListener(type: string, listener: EventListener): void {
    this.listeners.set(type, listener as (event?: RTCTrackEvent) => void);
  }

  removeEventListener(type: string): void {
    this.listeners.delete(type);
  }

  receive(item: MediaStreamTrack): void {
    this.listeners.get("track")?.({ track: item } as RTCTrackEvent);
  }

  gatherIce(): void {
    this.iceGatheringState = "complete";
    this.listeners.get("icegatheringstatechange")?.();
  }
}

function jsonResponse(body: unknown): Response {
  return { ok: true, status: 200, json: async () => body } as Response;
}

function errorResponse(status: number): Response {
  return { ok: false, status, json: async () => ({ error: `signaling ${status}` }) } as Response;
}

function videoFrame(value: number): Uint8ClampedArray {
  const pixels = new Uint8ClampedArray(32 * 28 * 4);
  for (let index = 0; index < pixels.length; index += 4) {
    pixels[index] = value;
    pixels[index + 1] = value;
    pixels[index + 2] = value;
    pixels[index + 3] = 255;
  }
  return pixels;
}

interface Fixture {
  analyserAmplitude: { value: number };
  audioContext: AudioContext;
  audioState: { value: AudioContextState };
  clock: { value: number };
  elements: Map<string, FakeElement[]>;
  environment: W2LanCaptureEnvironment;
  fetch: ReturnType<typeof vi.fn>;
  intervals: Map<number, () => void>;
  offerSdp: { value: string };
  peerIceState: { value: RTCIceGatheringState };
  peers: FakePeer[];
  signal: {
    revision: number;
    offer: RTCSessionDescriptionInit | null;
    answer: RTCSessionDescriptionInit | null;
    guestReady: boolean;
  };
  setAudioState(state: AudioContextState): void;
  stats: { frames: number; packets: number; energy: number; duration: number | undefined };
  currentFrame: { pixels: Uint8ClampedArray };
}

function fixture(options: { floatAnalyser?: boolean } = {}): Fixture {
  const elements = new Map<string, FakeElement[]>();
  const intervals = new Map<number, () => void>();
  const peers: FakePeer[] = [];
  const clock = { value: 0 };
  const stats = { frames: 0, packets: 0, energy: 0, duration: 0 as number | undefined };
  const currentFrame = { pixels: videoFrame(32) };
  const offerSdp = { value: "offer-with-complete-ice" };
  const peerIceState = { value: "complete" as RTCIceGatheringState };
  const signal = {
    revision: 0,
    offer: null as RTCSessionDescriptionInit | null,
    answer: null as RTCSessionDescriptionInit | null,
    guestReady: false
  };
  const analyserAmplitude = { value: 0 };
  const analyserShape = {
    fftSize: 4,
    connect: vi.fn(),
    disconnect: vi.fn(),
    getByteTimeDomainData: vi.fn((samples: Uint8Array) => samples.fill(128 + analyserAmplitude.value))
  } as Record<string, unknown>;
  if (options.floatAnalyser !== false) {
    analyserShape.getFloatTimeDomainData = vi.fn((samples: Float32Array) =>
      samples.fill(analyserAmplitude.value / 128)
    );
  }
  const analyser = analyserShape as unknown as AnalyserNode;
  const source = { connect: vi.fn(), disconnect: vi.fn() } as unknown as MediaStreamAudioSourceNode;
  const audioState = { value: "suspended" as AudioContextState };
  const audioStateListeners = new Set<() => void>();
  const audioContext = {
    createAnalyser: vi.fn(() => analyser),
    createMediaStreamSource: vi.fn(() => source),
    addEventListener: vi.fn((type: string, listener: () => void) => {
      if (type === "statechange") {
        audioStateListeners.add(listener);
      }
    }),
    removeEventListener: vi.fn((type: string, listener: () => void) => {
      if (type === "statechange") {
        audioStateListeners.delete(listener);
      }
    }),
    destination: {} as AudioDestinationNode,
    get state() {
      return audioState.value;
    },
    resume: vi.fn(() => {
      audioState.value = "running";
      return Promise.resolve();
    }),
    close: vi.fn(() => {
      audioState.value = "closed";
      return Promise.resolve();
    })
  } as unknown as AudioContext;
  const setAudioState = (state: AudioContextState): void => {
    audioState.value = state;
    for (const listener of [...audioStateListeners]) {
      listener();
    }
  };
  const fetch = vi.fn(async (_input: string, init?: RequestInit) => {
    if (init?.method === "POST") {
      const body = JSON.parse(String(init.body)) as {
        action: "offer" | "answer" | "ready";
        description?: RTCSessionDescriptionInit;
        expectedRevision?: number;
        revision?: number;
        ready?: boolean;
      };
      if (body.action === "offer") {
        if (body.expectedRevision !== signal.revision) {
          return errorResponse(409);
        }
        signal.revision += 1;
        signal.offer = body.description ?? null;
        signal.answer = null;
        signal.guestReady = false;
      } else if (body.action === "answer" && body.revision === signal.revision) {
        signal.answer = body.description ?? null;
      } else if (body.action === "ready" && body.revision === signal.revision) {
        signal.guestReady = body.ready === true;
      }
    }
    return jsonResponse({ ...signal });
  });
  let nextInterval = 0;
  const environment: W2LanCaptureEnvironment = {
    document: {
      createElement: ((tag: string) => {
        const element = new FakeElement();
        const list = elements.get(tag) ?? [];
        list.push(element);
        elements.set(tag, list);
        return element;
      }) as Document["createElement"]
    } as Document,
    lifecycleTarget: { addEventListener: vi.fn(), removeEventListener: vi.fn() },
    fetch,
    createAudioContext: vi.fn(() => audioContext),
    createMediaStream: vi.fn((tracks: MediaStreamTrack[]) => stream(tracks)),
    createPeerConnection: vi.fn(() => {
      const peer = new FakePeer(
        () =>
          new Map([
            ["v", { type: "inbound-rtp", kind: "video", framesDecoded: stats.frames }],
            [
              "a",
              {
                type: "inbound-rtp",
                kind: "audio",
                packetsReceived: stats.packets,
                totalAudioEnergy: stats.energy,
                totalSamplesDuration: stats.duration
              }
            ]
          ]) as unknown as RTCStatsReport
      );
      peer.createOffer.mockImplementation(async () => ({ type: "offer", sdp: offerSdp.value }));
      peer.iceGatheringState = peerIceState.value;
      peers.push(peer);
      return peer as unknown as RTCPeerConnection;
    }),
    readVideoFrame: vi.fn(() => ({ readback: "ok" as const, pixels: currentFrame.pixels, detail: null })),
    now: () => clock.value,
    setInterval: vi.fn((callback: () => void) => {
      const handle = ++nextInterval;
      intervals.set(handle, callback);
      return handle;
    }),
    clearInterval: vi.fn((handle: number) => intervals.delete(handle)),
    setTimeout: vi.fn(() => ++nextInterval),
    clearTimeout: vi.fn()
  };
  return {
    analyserAmplitude,
    audioContext,
    audioState,
    clock,
    elements,
    environment,
    fetch,
    intervals,
    offerSdp,
    peerIceState,
    peers,
    signal,
    setAudioState,
    stats,
    currentFrame
  };
}

function session(audio = true, audioLevelRms = audio ? 0.1 : 0): StreamCaptureSession {
  const tracks = [track("video"), ...(audio ? [track("audio")] : [])];
  const snapshot: StreamCaptureSnapshot = {
    width: 512,
    height: 448,
    fps: 30,
    videoTrackCount: 1,
    audioTrackCount: audio ? 1 : 0,
    audioContextState: audio ? "running" : "unavailable",
    audioLevelRms,
    videoPath: "bridge",
    bridgeReady: true,
    bridgePlayError: null,
    sourceContextType: "webgl",
    sourcePreserveDrawingBuffer: false
  };
  return {
    stream: stream(tracks),
    getSnapshot: () => snapshot,
    sampleVideoStages: () => {
      throw new Error("not used");
    },
    resumeAudio: vi.fn(async () => true),
    stop: vi.fn()
  };
}

function adapter(sessions: StreamCaptureSession[]): StreamCaptureAdapter {
  let index = 0;
  return {
    start: vi.fn(() => sessions[Math.min(index++, sessions.length - 1)]),
    stop: vi.fn()
  } as unknown as StreamCaptureAdapter;
}

function mount(): HTMLElement {
  return new FakeElement() as unknown as HTMLElement;
}

async function flush(): Promise<void> {
  for (let index = 0; index < 16; index += 1) {
    await Promise.resolve();
  }
}

async function tick(subject: Fixture, elapsedMs = 500): Promise<void> {
  subject.clock.value += elapsedMs;
  for (const callback of [...subject.intervals.values()]) {
    callback();
  }
  await flush();
}

function postBodies(subject: Fixture, action?: "offer" | "answer" | "ready"): Array<Record<string, unknown>> {
  return subject.fetch.mock.calls.flatMap(([, init]) => {
    if (init?.method !== "POST") {
      return [];
    }
    const body = JSON.parse(String(init.body)) as Record<string, unknown>;
    return !action || body.action === action ? [body] : [];
  });
}

async function connectGuest(subject: Fixture): Promise<{
  audio: TestTrack;
  harness: W2LanGuestHarness;
  preview: FakeElement;
  video: TestTrack;
}> {
  subject.signal.revision = 3;
  subject.signal.offer = { type: "offer", sdp: "host" };
  const harness = new W2LanGuestHarness(subject.environment);
  harness.mount(mount(), "room-a");
  subject.elements.get("button")?.[0]?.click();
  await flush();
  const video = track("video");
  const audio = track("audio");
  subject.peers[0].receive(video);
  subject.peers[0].receive(audio);
  await tick(subject);
  const preview = subject.elements.get("video")?.[0];
  if (!preview) {
    throw new Error("preview unavailable");
  }
  return { audio, harness, preview, video };
}

async function makeGuestReady(
  subject: Fixture,
  preview: FakeElement,
  frameValue = 96,
  amplitude = 24
): Promise<void> {
  subject.stats.frames += 4;
  subject.stats.packets += 5;
  subject.stats.duration = (subject.stats.duration ?? 0) + 0.5;
  subject.analyserAmplitude.value = amplitude;
  subject.currentFrame.pixels = videoFrame(frameValue);
  preview.currentTime += 0.5;
  await tick(subject);
}

describe("readW2LanConfig", () => {
  it("keeps the legacy gate and accepts one exact role with a safe room", () => {
    expect(readW2LanConfig("?captureSpike=1&captureRole=host")).toEqual({
      role: "host",
      room: "w2-a-to-b"
    });
    expect(readW2LanConfig("?captureSpike=true&captureRole=guest&captureRoom=room-2")).toEqual({
      role: "guest",
      room: "room-2"
    });
  });

  it("rejects implicit, duplicate, case-folded, or unsafe values", () => {
    expect(readW2LanConfig("?captureRole=guest")).toBeNull();
    expect(readW2LanConfig("?captureSpike=TRUE&captureRole=guest")).toBeNull();
    expect(readW2LanConfig("?captureSpike=1&captureRole=Guest")).toBeNull();
    expect(readW2LanConfig("?captureSpike=1&captureRole=host&captureRole=guest")).toBeNull();
    expect(readW2LanConfig("?captureSpike=1&captureRole=host&captureRoom=Room")).toBeNull();
  });
});

describe("W2LanHostHarness", () => {
  it("publishes one ICE-complete media-only offer and never creates a receiver", async () => {
    const subject = fixture();
    const harness = new W2LanHostHarness(subject.environment);
    await harness.start(adapter([session()]), mount(), "room-a");
    expect(subject.peers).toHaveLength(1);
    expect(subject.peers[0].tracks.map((item) => item.kind)).toEqual(["video", "audio"]);
    expect(subject.signal.offer).toEqual({ type: "offer", sdp: "offer-with-complete-ice" });
    expect(subject.environment.createAudioContext).not.toHaveBeenCalled();
    expect(harness.getSnapshot().captureAudioLevelRms).toBe(0.1);
    expect(harness.getSnapshot().captureAudioActivityObserved).toBe(true);

    subject.signal.answer = { type: "answer", sdp: "answer-with-complete-ice" };
    subject.signal.guestReady = true;
    await tick(subject);
    expect(harness.getSnapshot()).toMatchObject({ status: "ready", ready: true, guestReady: true });
  });

  it("offers capture fallback once before creating an offer", async () => {
    const subject = fixture();
    const first = session(false);
    const second = session(true);
    const capture = adapter([first, second]);
    const harness = new W2LanHostHarness(subject.environment);
    await harness.start(capture, mount());
    expect(subject.peers).toHaveLength(0);
    const button = subject.elements.get("button")?.[0];
    expect(button?.textContent).toBe("방 열고 소리 켜기");
    button?.click();
    button?.click();
    await flush();
    expect(first.resumeAudio).toHaveBeenCalledTimes(1);
    expect(subject.peers).toHaveLength(1);
    expect(harness.getSnapshot().fallbackUsed).toBe(true);
  });

  it("closes capture and peer resources when signaling fails", async () => {
    const subject = fixture();
    subject.fetch.mockRejectedValueOnce(new Error("offline"));
    const captureSession = session();
    const harness = new W2LanHostHarness(subject.environment);
    await harness.start(adapter([captureSession]), mount());
    expect(harness.getSnapshot()).toMatchObject({ status: "failed", error: "offline" });
    expect(subject.peers[0].close).toHaveBeenCalledTimes(1);
    expect(captureSession.stop).toHaveBeenCalledTimes(1);
    expect(subject.intervals.size).toBe(0);
  });

  it("re-reads once and retries one active offer conflict with the latest revision", async () => {
    const subject = fixture();
    subject.signal.revision = 4;
    subject.signal.offer = { type: "offer", sdp: "existing" };
    const originalFetch = subject.fetch.getMockImplementation() as
      | ((input: string, init?: RequestInit) => Promise<Response>)
      | undefined;
    let conflicts = 0;
    subject.fetch.mockImplementation((input: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        const body = JSON.parse(String(init.body)) as { action?: string };
        if (body.action === "offer" && conflicts++ === 0) {
          subject.signal.revision = 5;
          subject.signal.offer = { type: "offer", sdp: "competing-host" };
          subject.signal.answer = null;
          subject.signal.guestReady = false;
          return Promise.resolve(errorResponse(409));
        }
      }
      if (!originalFetch) {
        throw new Error("missing fetch implementation");
      }
      return originalFetch(input, init);
    });

    const harness = new W2LanHostHarness(subject.environment);
    await harness.start(adapter([session()]), mount(), "room-a");
    expect(postBodies(subject, "offer").map((body) => body.expectedRevision)).toEqual([4, 5]);
    expect(subject.signal.revision).toBe(6);
    expect(harness.getSnapshot()).toMatchObject({ revision: 6, status: "waiting", error: null });
  });

  it("fails after a second active offer conflict without a third attempt", async () => {
    const subject = fixture();
    const originalFetch = subject.fetch.getMockImplementation() as
      | ((input: string, init?: RequestInit) => Promise<Response>)
      | undefined;
    let conflicts = 0;
    subject.fetch.mockImplementation((input: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        const body = JSON.parse(String(init.body)) as { action?: string };
        if (body.action === "offer") {
          conflicts += 1;
          subject.signal.revision = conflicts;
          subject.signal.offer = { type: "offer", sdp: `competing-${conflicts}` };
          return Promise.resolve(errorResponse(409));
        }
      }
      if (!originalFetch) {
        throw new Error("missing fetch implementation");
      }
      return originalFetch(input, init);
    });

    const captureSession = session();
    const harness = new W2LanHostHarness(subject.environment);
    await harness.start(adapter([captureSession]), mount(), "room-a");
    expect(postBodies(subject, "offer").map((body) => body.expectedRevision)).toEqual([0, 1]);
    expect(postBodies(subject, "offer")).toHaveLength(2);
    expect(harness.getSnapshot()).toMatchObject({ status: "failed", ready: false, error: "signaling 409" });
    expect(subject.peers[0].close).toHaveBeenCalledTimes(1);
    expect(captureSession.stop).toHaveBeenCalledTimes(1);
  });

  it("lets a restarted host win while a dispatched old offer resolves late", async () => {
    const subject = fixture();
    const oldResponse = deferred<Response>();
    const originalFetch = subject.fetch.getMockImplementation() as
      | ((input: string, init?: RequestInit) => Promise<Response>)
      | undefined;
    let offerAttempts = 0;
    subject.fetch.mockImplementation((input: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        const body = JSON.parse(String(init.body)) as { action?: string };
        if (body.action === "offer" && offerAttempts++ === 0) {
          return oldResponse.promise;
        }
      }
      if (!originalFetch) {
        throw new Error("missing fetch implementation");
      }
      return originalFetch(input, init);
    });

    const firstSession = session();
    const secondSession = session();
    const harness = new W2LanHostHarness(subject.environment);
    const firstStart = harness.start(adapter([firstSession]), mount(), "room-a");
    await flush();
    expect(postBodies(subject, "offer")).toHaveLength(1);
    expect(postBodies(subject, "offer")[0]).toMatchObject({
      expectedRevision: 0,
      description: { sdp: "offer-with-complete-ice" }
    });

    subject.offerSdp.value = "replacement-offer";
    await harness.start(adapter([secondSession]), mount(), "room-a");
    expect(subject.signal).toMatchObject({
      revision: 1,
      offer: { type: "offer", sdp: "replacement-offer" }
    });
    expect(harness.getSnapshot()).toMatchObject({ revision: 1, status: "waiting", error: null });

    oldResponse.resolve(errorResponse(409));
    await firstStart;
    expect(postBodies(subject, "offer").map((body) => body.expectedRevision)).toEqual([0, 0]);
    expect(postBodies(subject, "offer")).toHaveLength(2);
    expect(subject.signal).toMatchObject({
      revision: 1,
      offer: { type: "offer", sdp: "replacement-offer" }
    });
    expect(harness.getSnapshot()).toMatchObject({ revision: 1, status: "waiting", error: null });
    expect(subject.peers[0].close).toHaveBeenCalledTimes(1);
    expect(subject.peers[1].close).not.toHaveBeenCalled();
    expect(firstSession.stop).toHaveBeenCalledTimes(1);
    expect(secondSession.stop).not.toHaveBeenCalled();
  });

  it("stops during deferred ICE without posting a stale offer", async () => {
    const subject = fixture();
    const harness = new W2LanHostHarness(subject.environment);
    const started = harness.start(adapter([session()]), mount(), "room-a");
    expect(subject.peers).toHaveLength(1);
    subject.peers[0].iceGatheringState = "gathering";
    await flush();
    expect(postBodies(subject, "offer")).toHaveLength(0);

    harness.stop();
    await started;
    expect(postBodies(subject, "offer")).toHaveLength(0);
    expect(harness.getSnapshot()).toMatchObject({ status: "idle", revision: 0, ready: false });
  });

  it("aborts a deferred offer fetch and ignores its stale response after stop", async () => {
    const subject = fixture();
    const pending = deferred<Response>();
    const originalFetch = subject.fetch.getMockImplementation() as
      | ((input: string, init?: RequestInit) => Promise<Response>)
      | undefined;
    let requestSignal: AbortSignal | null = null;
    subject.fetch.mockImplementation((input: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        const body = JSON.parse(String(init.body)) as { action?: string };
        if (body.action === "offer") {
          requestSignal = init.signal ?? null;
          return pending.promise;
        }
      }
      if (!originalFetch) {
        throw new Error("missing fetch implementation");
      }
      return originalFetch(input, init);
    });
    const harness = new W2LanHostHarness(subject.environment);
    const started = harness.start(adapter([session()]), mount(), "room-a");
    await flush();
    expect(postBodies(subject, "offer")).toHaveLength(1);
    expect(postBodies(subject, "offer")[0]).toMatchObject({ expectedRevision: 0 });

    harness.stop();
    expect((requestSignal as AbortSignal | null)?.aborted).toBe(true);
    pending.resolve(
      jsonResponse({ revision: 7, offer: { type: "offer", sdp: "stale" }, answer: null, guestReady: false })
    );
    await started;
    expect(harness.getSnapshot()).toMatchObject({ status: "idle", revision: 0, ready: false });
    expect(subject.intervals.size).toBe(0);
  });

  it("does not apply a stale remote description completion after stop", async () => {
    const subject = fixture();
    const harness = new W2LanHostHarness(subject.environment);
    await harness.start(adapter([session()]), mount(), "room-a");
    const remote = deferred<void>();
    subject.peers[0].setRemoteDescription.mockImplementationOnce(async (description) => {
      await remote.promise;
      subject.peers[0].remoteDescription = description as RTCSessionDescription;
    });
    subject.signal.answer = { type: "answer", sdp: "guest" };
    subject.signal.guestReady = true;
    await tick(subject);
    harness.stop();
    remote.resolve();
    await flush();

    expect(harness.getSnapshot()).toMatchObject({ status: "idle", ready: false, guestReady: false });
  });

  it("revokes host readiness for false, missing, or mismatched server state", async () => {
    const subject = fixture();
    const harness = new W2LanHostHarness(subject.environment);
    await harness.start(adapter([session()]), mount(), "room-a");
    const revision = subject.signal.revision;
    subject.signal.answer = { type: "answer", sdp: "guest" };
    subject.signal.guestReady = true;
    await tick(subject);
    expect(harness.getSnapshot().ready).toBe(true);

    subject.signal.guestReady = false;
    await tick(subject);
    expect(harness.getSnapshot()).toMatchObject({ ready: false, guestReady: false, status: "waiting" });

    subject.signal.guestReady = true;
    await tick(subject);
    expect(harness.getSnapshot().ready).toBe(true);
    subject.signal.revision = 0;
    subject.signal.answer = null;
    await tick(subject);
    expect(harness.getSnapshot()).toMatchObject({ ready: false, guestReady: false });

    subject.signal.revision = revision + 1;
    await tick(subject);
    expect(harness.getSnapshot()).toMatchObject({ ready: false, guestReady: false });
    harness.stop();
    expect(
      subject.fetch.mock.calls.some(
        ([input, init]) =>
          init?.method === "DELETE" &&
          input === `/ponpoko/__w2_lan?room=room-a&revision=${revision}`
      )
    ).toBe(true);
  });

  it("keeps the host ready latch during current game silence after strict acquisition", async () => {
    const subject = fixture();
    let rms = 0.1;
    const captureSession = session();
    const originalSnapshot = captureSession.getSnapshot();
    captureSession.getSnapshot = () => ({ ...originalSnapshot, audioLevelRms: rms });
    const harness = new W2LanHostHarness(subject.environment);
    await harness.start(adapter([captureSession]), mount(), "room-a");
    subject.signal.answer = { type: "answer", sdp: "guest" };
    subject.signal.guestReady = true;
    await tick(subject);
    expect(harness.getSnapshot()).toMatchObject({ ready: true, audioDiagnostic: "normal" });

    rms = 0;
    await tick(subject);
    expect(harness.getSnapshot()).toMatchObject({
      ready: true,
      captureAudioActivityObserved: true,
      audioDiagnostic: "source-silent"
    });
    expect(subject.elements.get("pre")?.[0]?.textContent).toContain(
      "소리=게임 무음(전송 정상)"
    );
  });

  it("waits five silent seconds, offers one fallback, then fails after one silent reevaluation", async () => {
    const subject = fixture();
    const first = session(true, 0);
    const second = session(true, 0);
    const capture = adapter([first, second]);
    const harness = new W2LanHostHarness(subject.environment);
    await harness.start(capture, mount(), "room-a");
    expect(subject.peers).toHaveLength(0);
    expect(subject.environment.setInterval).toHaveBeenCalledWith(expect.any(Function), 500);
    for (let index = 0; index < 9; index += 1) {
      await tick(subject);
    }
    expect(subject.elements.get("button")).toBeUndefined();
    await tick(subject);
    const button = subject.elements.get("button")?.[0];
    expect(button?.textContent).toBe("방 열고 소리 켜기");

    button?.click();
    button?.click();
    await flush();
    expect(first.resumeAudio).toHaveBeenCalledTimes(1);
    expect(capture.start).toHaveBeenCalledTimes(2);
    for (let index = 0; index < 9; index += 1) {
      await tick(subject);
    }
    expect(harness.getSnapshot().status).toBe("waiting");
    await tick(subject);
    expect(harness.getSnapshot()).toMatchObject({
      status: "failed",
      ready: false,
      fallbackAvailable: false,
      fallbackUsed: true,
      error: "capture audio silent after one fallback"
    });
    expect(subject.elements.get("button")).toHaveLength(1);
    expect(subject.peers).toHaveLength(0);
    expect(postBodies(subject, "offer")).toHaveLength(0);
  });
});

describe("W2LanGuestHarness", () => {
  it("resumes audio from its one CTA, answers the current offer, and reports actual AV readiness", async () => {
    const subject = fixture();
    subject.signal.revision = 3;
    subject.signal.offer = { type: "offer", sdp: "host" };
    const harness = new W2LanGuestHarness(subject.environment);
    harness.mount(mount(), "room-a");
    const button = subject.elements.get("button")?.[0];
    button?.click();
    button?.click();
    expect(subject.audioContext.resume).toHaveBeenCalledTimes(1);
    await flush();
    expect(subject.environment.setInterval).toHaveBeenCalledWith(expect.any(Function), 500);
    expect(subject.peers).toHaveLength(1);
    expect(subject.signal.answer).toEqual({ type: "answer", sdp: "answer-with-complete-ice" });

    subject.peers[0].receive(track("video"));
    subject.peers[0].receive(track("audio"));
    await tick(subject);
    subject.stats.frames = 4;
    subject.stats.packets = 5;
    subject.analyserAmplitude.value = 24;
    subject.currentFrame.pixels = videoFrame(96);
    const preview = subject.elements.get("video")?.[0];
    if (preview) {
      preview.currentTime += 0.5;
    }
    await tick(subject);
    expect(harness.getSnapshot()).toMatchObject({
      status: "ready",
      ready: true,
      receivedVideoTrackCount: 1,
      receivedAudioTrackCount: 1,
      previewAdvancing: true,
      previewContentVisible: true,
      previewContentChanging: true
    });
    expect(harness.getSnapshot().inboundAudioTotalEnergy).toBe(0);
    expect(subject.signal.guestReady).toBe(true);
  });

  it("skips an already-answered residual offer and accepts its replacement revision", async () => {
    const subject = fixture();
    subject.signal.revision = 1;
    subject.signal.offer = { type: "offer", sdp: "residual-host" };
    subject.signal.answer = { type: "answer", sdp: "claimed-by-old-guest" };
    const originalFetch = subject.fetch.getMockImplementation() as
      | ((input: string, init?: RequestInit) => Promise<Response>)
      | undefined;
    subject.fetch.mockImplementation((input: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        const body = JSON.parse(String(init.body)) as { action?: string; revision?: number };
        if (body.action === "answer" && body.revision === 1) {
          return Promise.resolve(errorResponse(409));
        }
      }
      if (!originalFetch) {
        throw new Error("missing fetch implementation");
      }
      return originalFetch(input, init);
    });

    const harness = new W2LanGuestHarness(subject.environment);
    harness.mount(mount(), "room-a");
    subject.elements.get("button")?.[0]?.click();
    await flush();
    expect(harness.getSnapshot()).toMatchObject({
      revision: 1,
      status: "waiting",
      ready: false,
      error: null
    });
    expect(subject.peers).toHaveLength(1);
    expect(subject.peers[0].close).toHaveBeenCalledTimes(1);

    await tick(subject);
    expect(subject.peers).toHaveLength(1);

    subject.signal.revision = 2;
    subject.signal.offer = { type: "offer", sdp: "replacement-host" };
    subject.signal.answer = null;
    subject.signal.guestReady = false;
    await tick(subject);
    expect(subject.peers).toHaveLength(2);
    expect(subject.signal.answer).toEqual({ type: "answer", sdp: "answer-with-complete-ice" });
    expect(harness.getSnapshot()).toMatchObject({ revision: 2, status: "waiting", error: null });

    const preview = subject.elements.get("video")?.[0];
    if (!preview) {
      throw new Error("preview unavailable");
    }
    subject.peers[1].receive(track("video"));
    subject.peers[1].receive(track("audio"));
    await tick(subject);
    await makeGuestReady(subject, preview);
    expect(harness.getSnapshot()).toMatchObject({ revision: 2, status: "ready", ready: true });
    expect(subject.signal.guestReady).toBe(true);
  });

  it("keeps non-conflict answer signaling failures terminal", async () => {
    const subject = fixture();
    subject.signal.revision = 1;
    subject.signal.offer = { type: "offer", sdp: "host" };
    const originalFetch = subject.fetch.getMockImplementation() as
      | ((input: string, init?: RequestInit) => Promise<Response>)
      | undefined;
    subject.fetch.mockImplementation((input: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        const body = JSON.parse(String(init.body)) as { action?: string };
        if (body.action === "answer") {
          return Promise.resolve(errorResponse(500));
        }
      }
      if (!originalFetch) {
        throw new Error("missing fetch implementation");
      }
      return originalFetch(input, init);
    });

    const harness = new W2LanGuestHarness(subject.environment);
    harness.mount(mount(), "room-a");
    subject.elements.get("button")?.[0]?.click();
    await flush();
    expect(harness.getSnapshot()).toMatchObject({
      revision: 1,
      status: "failed",
      ready: false,
      error: "signaling 500"
    });
    expect(subject.peers[0].close).toHaveBeenCalledTimes(1);
    expect(subject.audioContext.close).toHaveBeenCalledTimes(1);
    expect(subject.intervals.size).toBe(0);
  });

  it("never readies an initially black, static, and silent receiver", async () => {
    const subject = fixture();
    subject.signal.revision = 1;
    subject.signal.offer = { type: "offer", sdp: "host" };
    subject.currentFrame.pixels = videoFrame(0);
    const harness = new W2LanGuestHarness(subject.environment);
    harness.mount(mount());
    subject.elements.get("button")?.[0]?.click();
    await flush();
    subject.peers[0].receive(track("video"));
    subject.peers[0].receive(track("audio"));
    subject.stats.frames = 3;
    subject.stats.packets = 3;
    await tick(subject);
    for (let index = 0; index < 6; index += 1) {
      subject.stats.frames += 3;
      subject.stats.packets += 3;
      const preview = subject.elements.get("video")?.[0];
      if (preview) {
        preview.currentTime += 0.5;
      }
      await tick(subject);
      expect(harness.getSnapshot()).toMatchObject({
        ready: false,
        previewContentVisible: false,
        receiverAudioLevelRms: 0
      });
    }
    harness.stop();
    expect(subject.peers[0].close).toHaveBeenCalledTimes(1);
    expect(subject.audioContext.close).toHaveBeenCalledTimes(1);
  });

  it("retries one transient preview AbortError only after media becomes ready", async () => {
    const subject = fixture();
    subject.signal.revision = 1;
    subject.signal.offer = { type: "offer", sdp: "host" };
    const harness = new W2LanGuestHarness(subject.environment);
    harness.mount(mount());
    subject.elements.get("button")?.[0]?.click();
    await flush();
    const preview = subject.elements.get("video")?.[0];
    const abort = Object.assign(new Error("aborted"), { name: "AbortError" });
    preview?.play.mockRejectedValueOnce(abort).mockResolvedValueOnce(undefined);
    subject.peers[0].receive(track("video"));
    await flush();
    expect(preview?.play).toHaveBeenCalledTimes(1);
    expect(harness.getSnapshot().status).not.toBe("failed");
    preview?.dispatch("loadedmetadata");
    await flush();
    expect(preview?.play).toHaveBeenCalledTimes(2);
    expect(harness.getSnapshot().status).not.toBe("failed");
  });

  it("does not retry a genuine autoplay denial and cleans the failed guest", async () => {
    const subject = fixture();
    subject.signal.revision = 1;
    subject.signal.offer = { type: "offer", sdp: "host" };
    const harness = new W2LanGuestHarness(subject.environment);
    harness.mount(mount());
    subject.elements.get("button")?.[0]?.click();
    await flush();
    const preview = subject.elements.get("video")?.[0];
    const denied = Object.assign(new Error("not allowed"), { name: "NotAllowedError" });
    preview?.play.mockRejectedValueOnce(denied);
    subject.peers[0].receive(track("video"));
    await flush();
    expect(preview?.play).toHaveBeenCalledTimes(1);
    expect(harness.getSnapshot()).toMatchObject({ status: "failed", ready: false });
    expect(subject.peers[0].close).toHaveBeenCalledTimes(1);
    expect(subject.audioContext.close).toHaveBeenCalledTimes(1);
    expect(subject.intervals.size).toBe(0);
  });

  it("heartbeats ready true while strict AV activity remains current", async () => {
    const subject = fixture();
    const { harness, preview } = await connectGuest(subject);
    await makeGuestReady(subject, preview, 96, 24);
    expect(harness.getSnapshot().ready).toBe(true);
    expect(postBodies(subject, "ready").filter((body) => body.ready === true)).toHaveLength(1);

    await makeGuestReady(subject, preview, 144, 32);
    expect(harness.getSnapshot()).toMatchObject({ ready: true, guestReady: true, status: "ready" });
    expect(postBodies(subject, "ready").filter((body) => body.ready === true)).toHaveLength(2);
  });

  it("requires strict acquisition even when evidence dimensions arrived on different polls", async () => {
    const subject = fixture();
    const { harness, preview } = await connectGuest(subject);

    subject.stats.frames += 4;
    preview.currentTime += 0.5;
    await tick(subject);
    expect(harness.getSnapshot().ready).toBe(false);

    subject.currentFrame.pixels = videoFrame(96);
    await tick(subject);
    expect(harness.getSnapshot().ready).toBe(false);

    subject.stats.packets += 5;
    await tick(subject);
    expect(harness.getSnapshot().ready).toBe(false);

    subject.analyserAmplitude.value = 24;
    await tick(subject);
    expect(harness.getSnapshot().ready).toBe(false);

    subject.stats.frames += 4;
    subject.stats.packets += 5;
    subject.currentFrame.pixels = videoFrame(144);
    subject.analyserAmplitude.value = 32;
    preview.currentTime += 0.5;
    await tick(subject);
    expect(harness.getSnapshot()).toMatchObject({ ready: true, guestReady: true, status: "ready" });
  });

  it("keeps ready through three transient all-dimension misses and revokes on the fourth", async () => {
    const subject = fixture();
    const { harness, preview } = await connectGuest(subject);
    await makeGuestReady(subject, preview);
    expect(subject.signal.guestReady).toBe(true);
    const readyAt = subject.clock.value;
    const setInterval = subject.environment.setInterval as ReturnType<typeof vi.fn>;
    const guestPollDelay = setInterval.mock.calls.find(([, delay]) => delay === 500)?.[1] as
      | number
      | undefined;
    expect(guestPollDelay).toBe(500);

    subject.currentFrame.pixels = videoFrame(0);
    for (let missed = 1; missed <= 3; missed += 1) {
      await tick(subject);
      expect(harness.getSnapshot()).toMatchObject({
        ready: true,
        guestReady: true,
        previewAdvancing: false,
        previewContentVisible: false
      });
      expect(subject.clock.value - readyAt).toBe(missed * 500);
      const renderedStatus = subject.elements.get("pre")?.[0]?.textContent;
      expect(renderedStatus).toContain("상태=최근 정상 ready=yes");
      expect(renderedStatus).toContain("영상=최근 정상 · 소리=최근 정상");
      expect(renderedStatus).not.toContain("상태=정상");
      expect(postBodies(subject, "ready").at(-1)).toMatchObject({ ready: true, revision: 3 });
    }

    await tick(subject);
    expect(subject.clock.value - readyAt).toBe(2_000);
    expect(harness.getSnapshot()).toMatchObject({ ready: false, guestReady: false, status: "waiting" });
    expect(postBodies(subject, "ready").at(-1)).toMatchObject({ ready: false, revision: 3 });

    subject.stats.frames += 4;
    subject.stats.packets += 5;
    subject.currentFrame.pixels = videoFrame(96);
    subject.analyserAmplitude.value = 32;
    preview.currentTime += 0.5;
    await tick(subject);
    expect(harness.getSnapshot().ready).toBe(false);
    subject.stats.frames += 4;
    subject.stats.packets += 5;
    subject.currentFrame.pixels = videoFrame(144);
    subject.analyserAmplitude.value = 24;
    preview.currentTime += 0.5;
    await tick(subject);
    expect(harness.getSnapshot().ready).toBe(true);
  });

  it("expires stale evidence before a delayed poll can refresh it", async () => {
    const subject = fixture();
    const { harness, preview } = await connectGuest(subject);
    await makeGuestReady(subject, preview);
    expect(harness.getSnapshot().ready).toBe(true);
    const readyAt = subject.clock.value;

    subject.stats.frames += 4;
    subject.stats.packets += 5;
    subject.currentFrame.pixels = videoFrame(144);
    subject.analyserAmplitude.value = 32;
    preview.currentTime += 0.5;
    await tick(subject, 2_001);

    expect(subject.clock.value - readyAt).toBe(2_001);
    expect(harness.getSnapshot()).toMatchObject({
      currentVideoEvidence: true,
      currentAudioEvidence: true,
      ready: false,
      guestReady: false,
      status: "waiting"
    });
    expect(postBodies(subject, "ready").at(-1)).toMatchObject({ ready: false, revision: 3 });

    subject.stats.frames += 4;
    subject.stats.packets += 5;
    subject.currentFrame.pixels = videoFrame(96);
    subject.analyserAmplitude.value = 24;
    preview.currentTime += 0.5;
    await tick(subject);
    expect(harness.getSnapshot()).toMatchObject({ ready: true, guestReady: true, status: "ready" });
  });

  it("keeps a flat nonzero RMS ready while the other maintenance evidence stays fresh", async () => {
    const subject = fixture();
    const { harness, preview } = await connectGuest(subject);
    await makeGuestReady(subject, preview);
    expect(harness.getSnapshot().ready).toBe(true);

    for (let poll = 1; poll <= 6; poll += 1) {
      subject.stats.frames += 4;
      subject.stats.packets += 5;
      subject.currentFrame.pixels = videoFrame(poll % 2 === 1 ? 144 : 96);
      preview.currentTime += 0.5;
      await tick(subject);
      expect(harness.getSnapshot()).toMatchObject({
        ready: true,
        guestReady: true,
        receiverAudioLevelRms: expect.any(Number)
      });
    }
  });

  it("refreshes the four maintenance windows independently on different polls", async () => {
    const subject = fixture();
    const { harness, preview } = await connectGuest(subject);
    await makeGuestReady(subject, preview);
    expect(harness.getSnapshot().ready).toBe(true);

    subject.analyserAmplitude.value = 0;
    subject.stats.frames += 4;
    preview.currentTime += 0.5;
    await tick(subject);
    expect(harness.getSnapshot().ready).toBe(true);

    subject.currentFrame.pixels = videoFrame(144);
    await tick(subject);
    expect(harness.getSnapshot().ready).toBe(true);

    subject.stats.packets += 5;
    await tick(subject);
    expect(harness.getSnapshot().ready).toBe(true);

    subject.analyserAmplitude.value = 24;
    await tick(subject, 499);
    expect(harness.getSnapshot()).toMatchObject({ ready: true, guestReady: true });
  });

  it("revokes after four frozen-video polls while audio evidence stays fresh", async () => {
    const subject = fixture();
    const { harness, preview } = await connectGuest(subject);
    await makeGuestReady(subject, preview);
    expect(subject.signal.guestReady).toBe(true);

    for (let missed = 1; missed <= 4; missed += 1) {
      subject.stats.packets += 5;
      subject.analyserAmplitude.value = missed % 2 === 1 ? 32 : 24;
      await tick(subject);
      expect(harness.getSnapshot().ready).toBe(missed < 4);
    }
    expect(harness.getSnapshot()).toMatchObject({ ready: false, guestReady: false });
    expect(subject.signal.guestReady).toBe(false);
  });

  it("keeps ready through natural game silence while RTP packets grow and energy stays flat", async () => {
    const subject = fixture();
    const { harness, preview } = await connectGuest(subject);
    await makeGuestReady(subject, preview);
    expect(subject.signal.guestReady).toBe(true);

    subject.analyserAmplitude.value = 0;
    for (let missed = 1; missed <= 6; missed += 1) {
      subject.stats.frames += 4;
      subject.stats.packets += 5;
      subject.stats.duration = (subject.stats.duration ?? 0) + 0.5;
      subject.currentFrame.pixels = videoFrame(missed % 2 === 1 ? 144 : 96);
      preview.currentTime += 0.5;
      await tick(subject);
      expect(harness.getSnapshot()).toMatchObject({
        ready: true,
        guestReady: true,
        audioDiagnostic: "source-silent"
      });
    }
    expect(subject.elements.get("pre")?.[0]?.textContent).toContain(
      "상태=정상 ready=yes"
    );
    expect(subject.elements.get("pre")?.[0]?.textContent).toContain(
      "소리=게임 무음(전송 정상)"
    );
  });

  it("keeps tiny interval-normalized decoder energy as healthy game silence", async () => {
    const subject = fixture();
    const { harness, preview } = await connectGuest(subject);
    await makeGuestReady(subject, preview);
    subject.analyserAmplitude.value = 0;

    for (let poll = 1; poll <= 6; poll += 1) {
      subject.stats.frames += 4;
      subject.stats.packets += 5;
      subject.stats.energy += 0.00000001;
      subject.stats.duration = (subject.stats.duration ?? 0) + 0.5;
      subject.currentFrame.pixels = videoFrame(poll % 2 === 1 ? 144 : 96);
      preview.currentTime += 0.5;
      await tick(subject);
      expect(harness.getSnapshot()).toMatchObject({
        ready: true,
        guestReady: true,
        audioDiagnostic: "source-silent"
      });
    }
  });

  it("uses float receiver samples below byte quantization instead of reporting output silence", async () => {
    const subject = fixture();
    const { harness, preview } = await connectGuest(subject);
    await makeGuestReady(subject, preview);
    subject.analyserAmplitude.value = 0.5;

    subject.stats.frames += 4;
    subject.stats.packets += 5;
    subject.stats.energy += 0.000008;
    subject.stats.duration = (subject.stats.duration ?? 0) + 0.5;
    subject.currentFrame.pixels = videoFrame(144);
    preview.currentTime += 0.5;
    await tick(subject);

    expect(harness.getSnapshot()).toMatchObject({
      ready: true,
      guestReady: true,
      audioDiagnostic: "normal"
    });
    expect(harness.getSnapshot().receiverAudioLevelRms).toBeGreaterThan(0.001);
  });

  it("does not claim output failure below the byte analyser fallback resolution", async () => {
    const subject = fixture({ floatAnalyser: false });
    const { harness, preview } = await connectGuest(subject);
    await makeGuestReady(subject, preview);
    subject.analyserAmplitude.value = 0.5;

    for (let poll = 1; poll <= 6; poll += 1) {
      subject.stats.frames += 4;
      subject.stats.packets += 5;
      subject.stats.energy += 0.000008;
      subject.stats.duration = (subject.stats.duration ?? 0) + 0.5;
      subject.currentFrame.pixels = videoFrame(poll % 2 === 1 ? 144 : 96);
      preview.currentTime += 0.5;
      await tick(subject);
      expect(harness.getSnapshot()).toMatchObject({
        ready: true,
        guestReady: true,
        audioDiagnostic: "source-silent"
      });
    }
  });

  it("keeps readiness when normalized energy stats are missing or reset", async () => {
    const subject = fixture();
    const { harness, preview } = await connectGuest(subject);
    await makeGuestReady(subject, preview);
    subject.analyserAmplitude.value = 0;

    subject.stats.duration = undefined;
    for (let poll = 1; poll <= 5; poll += 1) {
      subject.stats.frames += 4;
      subject.stats.packets += 5;
      subject.stats.energy += 0.25;
      subject.currentFrame.pixels = videoFrame(poll % 2 === 1 ? 144 : 96);
      preview.currentTime += 0.5;
      await tick(subject);
      expect(harness.getSnapshot()).toMatchObject({
        ready: true,
        guestReady: true,
        audioDiagnostic: "recent-normal"
      });
    }

    subject.stats.energy = 0;
    subject.stats.duration = 0;
    subject.stats.frames += 4;
    subject.stats.packets += 5;
    subject.currentFrame.pixels = videoFrame(144);
    preview.currentTime += 0.5;
    await tick(subject);
    expect(harness.getSnapshot()).toMatchObject({
      ready: true,
      guestReady: true,
      audioDiagnostic: "recent-normal"
    });
  });

  it("revokes after two continuous seconds of inbound energy growth without receiver RMS", async () => {
    const subject = fixture();
    const { harness, preview } = await connectGuest(subject);
    await makeGuestReady(subject, preview);
    subject.analyserAmplitude.value = 0;

    for (let poll = 1; poll <= 4; poll += 1) {
      subject.stats.frames += 4;
      subject.stats.packets += 5;
      subject.stats.energy += 0.25;
      subject.stats.duration = (subject.stats.duration ?? 0) + 0.5;
      subject.currentFrame.pixels = videoFrame(poll % 2 === 1 ? 144 : 96);
      preview.currentTime += 0.5;
      await tick(subject);
      expect(harness.getSnapshot()).toMatchObject({
        ready: true,
        audioDiagnostic: "receiver-silent"
      });
    }
    subject.stats.frames += 4;
    subject.stats.packets += 5;
    subject.stats.energy += 0.25;
    subject.stats.duration = (subject.stats.duration ?? 0) + 0.5;
    subject.currentFrame.pixels = videoFrame(144);
    preview.currentTime += 0.5;
    await tick(subject);
    expect(harness.getSnapshot()).toMatchObject({
      ready: false,
      guestReady: false,
      audioDiagnostic: "receiver-silent"
    });
    expect(subject.elements.get("pre")?.[0]?.textContent).toContain("소리=수신 출력 무음");
  });

  it("starts a fresh receiver-silence mismatch only after a long natural quiet period", async () => {
    const subject = fixture();
    const { harness, preview } = await connectGuest(subject);
    await makeGuestReady(subject, preview);
    subject.analyserAmplitude.value = 0;

    for (let poll = 0; poll < 6; poll += 1) {
      subject.stats.frames += 4;
      subject.stats.packets += 5;
      subject.stats.duration = (subject.stats.duration ?? 0) + 0.5;
      subject.currentFrame.pixels = videoFrame(poll % 2 === 0 ? 144 : 96);
      preview.currentTime += 0.5;
      await tick(subject);
    }
    subject.stats.frames += 4;
    subject.stats.packets += 5;
    subject.stats.energy += 0.25;
    subject.stats.duration = (subject.stats.duration ?? 0) + 0.5;
    subject.currentFrame.pixels = videoFrame(144);
    preview.currentTime += 0.5;
    await tick(subject);
    expect(harness.getSnapshot()).toMatchObject({
      ready: true,
      audioDiagnostic: "receiver-silent"
    });
  });

  it("restarts the receiver-silence timer when a no-growth poll interrupts the mismatch", async () => {
    const subject = fixture();
    const { harness, preview } = await connectGuest(subject);
    await makeGuestReady(subject, preview);
    subject.analyserAmplitude.value = 0;

    const poll = async (audioGrowth: boolean, frameValue: number): Promise<void> => {
      subject.stats.frames += 4;
      if (audioGrowth) {
        subject.stats.packets += 5;
        subject.stats.energy += 0.25;
        subject.stats.duration = (subject.stats.duration ?? 0) + 0.5;
      }
      subject.currentFrame.pixels = videoFrame(frameValue);
      preview.currentTime += 0.5;
      await tick(subject);
    };

    await poll(true, 144);
    await poll(false, 96);
    await poll(true, 144);
    await poll(false, 96);
    await poll(true, 144);

    expect(harness.getSnapshot()).toMatchObject({
      ready: true,
      guestReady: true,
      audioDiagnostic: "receiver-silent"
    });

    for (let continuous = 1; continuous <= 4; continuous += 1) {
      await poll(true, continuous % 2 === 1 ? 96 : 144);
      expect(harness.getSnapshot().ready).toBe(continuous < 4);
    }
    expect(harness.getSnapshot()).toMatchObject({
      ready: false,
      guestReady: false,
      audioDiagnostic: "receiver-silent"
    });
  });

  it("revokes when audio RTP packets stop for the two-second freshness window", async () => {
    const subject = fixture();
    const { harness, preview } = await connectGuest(subject);
    await makeGuestReady(subject, preview);

    for (let poll = 1; poll <= 4; poll += 1) {
      subject.stats.frames += 4;
      subject.currentFrame.pixels = videoFrame(poll % 2 === 1 ? 144 : 96);
      preview.currentTime += 0.5;
      await tick(subject);
    }
    expect(harness.getSnapshot()).toMatchObject({
      ready: false,
      guestReady: false,
      audioDiagnostic: "rtp-stopped"
    });
    expect(subject.elements.get("pre")?.[0]?.textContent).toContain("소리=RTP 중단");
  });

  it("revokes immediately when the receiver audio context is no longer running", async () => {
    const subject = fixture();
    const { harness, preview } = await connectGuest(subject);
    await makeGuestReady(subject, preview);
    expect(subject.signal.guestReady).toBe(true);
    const beforeStateChange = subject.clock.value;

    subject.setAudioState("suspended");
    await flush();
    expect(subject.clock.value).toBe(beforeStateChange);
    expect(harness.getSnapshot()).toMatchObject({
      ready: false,
      guestReady: false,
      receiverAudioContextState: "suspended",
      audioDiagnostic: "context-not-running",
      status: "waiting"
    });
    expect(subject.elements.get("pre")?.[0]?.textContent).toContain("소리=오디오 context 중단");
    expect(postBodies(subject, "ready").at(-1)).toMatchObject({ ready: false, revision: 3 });
    const falsePosts = postBodies(subject, "ready").filter((body) => body.ready === false).length;

    subject.setAudioState("suspended");
    await flush();
    expect(postBodies(subject, "ready").filter((body) => body.ready === false)).toHaveLength(
      falsePosts
    );

    harness.stop();
    expect(subject.audioContext.removeEventListener).toHaveBeenCalledWith(
      "statechange",
      expect.any(Function)
    );
  });

  it("revokes ready immediately when a received track ends", async () => {
    const subject = fixture();
    const { audio, harness, preview } = await connectGuest(subject);
    await makeGuestReady(subject, preview);
    expect(subject.signal.guestReady).toBe(true);

    audio.end();
    await flush();
    expect(harness.getSnapshot()).toMatchObject({
      ready: false,
      guestReady: false,
      receivedAudioTrackCount: 0,
      audioDiagnostic: "track-ended",
      status: "waiting"
    });
    expect(subject.elements.get("pre")?.[0]?.textContent).toContain("소리=오디오 track 종료");
    expect(subject.signal.guestReady).toBe(false);
  });

  it("best-effort revokes ready on stop and pagehide", async () => {
    const stopped = fixture();
    const first = await connectGuest(stopped);
    await makeGuestReady(stopped, first.preview);
    first.harness.stop();
    await flush();
    expect(stopped.signal.guestReady).toBe(false);
    expect(postBodies(stopped, "ready").at(-1)).toMatchObject({ ready: false, revision: 3 });

    const hidden = fixture();
    const second = await connectGuest(hidden);
    await makeGuestReady(hidden, second.preview);
    const addEventListener = hidden.environment.lifecycleTarget
      .addEventListener as ReturnType<typeof vi.fn>;
    const pagehide = addEventListener.mock.calls.find(([type]) => type === "pagehide")?.[1] as
      | (() => void)
      | undefined;
    pagehide?.();
    await flush();
    expect(hidden.signal.guestReady).toBe(false);
    expect(postBodies(hidden, "ready").at(-1)).toMatchObject({ ready: false, revision: 3 });
  });

  it("stops during deferred guest ICE without posting a stale answer", async () => {
    const subject = fixture();
    subject.peerIceState.value = "gathering";
    subject.signal.revision = 2;
    subject.signal.offer = { type: "offer", sdp: "host" };
    const harness = new W2LanGuestHarness(subject.environment);
    harness.mount(mount(), "room-a");
    subject.elements.get("button")?.[0]?.click();
    await flush();
    expect(subject.peers).toHaveLength(1);
    expect(postBodies(subject, "answer")).toHaveLength(0);

    harness.stop();
    await flush();
    expect(postBodies(subject, "answer")).toHaveLength(0);
    expect(harness.getSnapshot()).toMatchObject({ status: "idle", revision: 0, ready: false });
  });

  it("aborts a deferred ready heartbeat and cannot restore ready after stop", async () => {
    const subject = fixture();
    const { harness, preview } = await connectGuest(subject);
    const pending = deferred<Response>();
    const originalFetch = subject.fetch.getMockImplementation() as
      | ((input: string, init?: RequestInit) => Promise<Response>)
      | undefined;
    let requestSignal: AbortSignal | null = null;
    subject.fetch.mockImplementation((input: string, init?: RequestInit) => {
      if (init?.method === "POST") {
        const body = JSON.parse(String(init.body)) as { action?: string; ready?: boolean };
        if (body.action === "ready" && body.ready === true) {
          requestSignal = init.signal ?? null;
          return pending.promise;
        }
      }
      if (!originalFetch) {
        throw new Error("missing fetch implementation");
      }
      return originalFetch(input, init);
    });
    await makeGuestReady(subject, preview);
    expect(harness.getSnapshot().ready).toBe(true);

    harness.stop();
    expect((requestSignal as AbortSignal | null)?.aborted).toBe(true);
    pending.resolve(jsonResponse({ ...subject.signal, guestReady: true }));
    await flush();
    expect(harness.getSnapshot()).toMatchObject({ status: "idle", revision: 0, ready: false });
    expect(subject.signal.guestReady).toBe(false);
  });
});
