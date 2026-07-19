import { describe, expect, it, vi } from "vitest";
import {
  StreamCaptureSpikeHarness,
  isStreamCaptureSpikeEnabled,
  type StreamCaptureSpikeEnvironment
} from "../src/stream-capture-spike";
import type {
  StreamCaptureAdapter,
  StreamCaptureFrameReadback,
  StreamCaptureSession,
  StreamCaptureSnapshot
} from "../src/stream-capture";

class FakeElement {
  readonly children: FakeElement[] = [];
  readonly dataset: Record<string, string> = {};
  readonly listeners = new Map<string, () => void>();
  autoplay = false;
  height = 0;
  muted = false;
  paused = false;
  playsInline = false;
  currentTime = 1;
  readyState = 4;
  removed = false;
  srcObject: MediaStream | null = null;
  textContent: string | null = null;
  type = "";
  videoHeight = 448;
  videoWidth = 512;
  width = 0;
  readonly play = vi.fn(async () => undefined);

  append(...elements: FakeElement[]): void {
    this.children.push(...elements);
  }

  appendChild(element: FakeElement): FakeElement {
    this.children.push(element);
    return element;
  }

  addEventListener(type: string, listener: () => void): void {
    this.listeners.set(type, listener);
  }

  click(): void {
    this.listeners.get("click")?.();
  }

  remove(): void {
    this.removed = true;
  }
}

function track(kind: "audio" | "video") {
  return { kind, readyState: "live", stop: vi.fn() } as unknown as MediaStreamTrack;
}

function stream(tracks: MediaStreamTrack[]) {
  return {
    getAudioTracks: () => tracks.filter((item) => item.kind === "audio"),
    getTracks: () => [...tracks],
    getVideoTracks: () => tracks.filter((item) => item.kind === "video")
  } as unknown as MediaStream;
}

interface SessionFixture {
  session: StreamCaptureSession;
  stageFrames: Record<"source" | "bridge" | "staging", Uint8ClampedArray | null>;
  stageReadbacks: Record<"source" | "bridge" | "staging", StreamCaptureFrameReadback>;
  stop: ReturnType<typeof vi.fn>;
}

function sessionFixture(options: {
  audio?: boolean;
  audioContextState?: AudioContextState | "unavailable";
  trackOrder?: Array<"audio" | "video">;
} = {}): SessionFixture {
  const trackOrder = options.trackOrder ?? ["video", ...(options.audio ? ["audio" as const] : [])];
  const tracks = trackOrder.map((kind) => track(kind));
  const stop = vi.fn();
  const stageFrames = {
    source: solidVideoFrame(32),
    bridge: solidVideoFrame(32),
    staging: solidVideoFrame(32)
  };
  const stageReadbacks: SessionFixture["stageReadbacks"] = {
    source: "ok",
    bridge: "ok",
    staging: "ok"
  };
  const snapshot: StreamCaptureSnapshot = {
    width: 512,
    height: 448,
    fps: 30,
    videoTrackCount: 1,
    audioTrackCount: options.audio ? 1 : 0,
    audioContextState: options.audioContextState ?? (options.audio ? "running" : "unavailable"),
    audioLevelRms: options.audio ? 0.25 : 0,
    videoPath: "bridge",
    bridgeReady: true,
    bridgePlayError: null,
    sourceContextType: "webgl2",
    sourcePreserveDrawingBuffer: false
  };
  return {
    stop,
    stageFrames,
    stageReadbacks,
    session: {
      stream: stream(tracks),
      getSnapshot: () => ({ ...snapshot }),
      sampleVideoStages: () => ({
        source: {
          readback: stageReadbacks.source,
          pixels: stageFrames.source,
          detail: stageReadbacks.source === "ok" ? null : "source readback"
        },
        bridge: {
          readback: stageReadbacks.bridge,
          pixels: stageFrames.bridge,
          detail: stageReadbacks.bridge === "ok" ? null : "bridge readback"
        },
        staging: {
          readback: stageReadbacks.staging,
          pixels: stageFrames.staging,
          detail: stageReadbacks.staging === "ok" ? null : "staging readback"
        }
      }),
      resumeAudio: vi.fn(async () => snapshot.audioContextState === "running"),
      stop
    }
  };
}

class FakePeer {
  onicecandidate: ((event: RTCPeerConnectionIceEvent) => void) | null = null;
  ontrack: ((event: RTCTrackEvent) => void) | null = null;
  readonly tracks: MediaStreamTrack[] = [];
  readonly addIceCandidate = vi.fn(async () => undefined);
  readonly close = vi.fn();
  readonly createAnswer = vi.fn(async () => ({ type: "answer", sdp: "answer" }) as RTCSessionDescriptionInit);
  readonly createOffer = vi.fn(async () => ({ type: "offer", sdp: "offer" }) as RTCSessionDescriptionInit);
  readonly getStats = vi.fn(async () => this.stats());
  readonly setRemoteDescription = vi.fn(async (description: RTCSessionDescriptionInit) => {
    if (description.type === "offer") {
      for (const item of this.senderTracks()) {
        this.ontrack?.({ track: item } as RTCTrackEvent);
      }
    }
  });
  readonly setLocalDescription = vi.fn(async (description: RTCSessionDescriptionInit) => {
    this.onicecandidate?.({ candidate: { candidate: description.type } } as RTCPeerConnectionIceEvent);
  });

  constructor(
    readonly configuration: RTCConfiguration,
    private readonly senderTracks: () => MediaStreamTrack[],
    private readonly stats: () => RTCStatsReport
  ) {}

  addTrack(item: MediaStreamTrack): RTCRtpSender {
    this.tracks.push(item);
    return {} as RTCRtpSender;
  }
}

interface HarnessFixture {
  analyser: { amplitude: number };
  audioContext: AudioContext;
  audioContextClose: ReturnType<typeof vi.fn>;
  audioContextResume: ReturnType<typeof vi.fn>;
  elements: Map<string, FakeElement[]>;
  environment: StreamCaptureSpikeEnvironment;
  intervalCallbacks: Map<number, () => void>;
  peers: FakePeer[];
  resolveFirstOffer?: () => void;
  stats: { audioEnergy: number; audioPackets: number; videoFrames: number };
  videoFrame: {
    detail: string | null;
    pixels: Uint8ClampedArray | null;
    readback: StreamCaptureFrameReadback;
  };
}

function solidVideoFrame(value: number): Uint8ClampedArray {
  const pixels = new Uint8ClampedArray(32 * 28 * 4);
  for (let index = 0; index < pixels.length; index += 4) {
    pixels[index] = value;
    pixels[index + 1] = value;
    pixels[index + 2] = value;
    pixels[index + 3] = 255;
  }
  return pixels;
}

function harnessFixture(
  options: {
    deferFirstOffer?: boolean;
    previewPlayError?: string;
    previewPlayErrors?: Error[];
    previewPlayPromise?: Promise<undefined>;
  } = {}
): HarnessFixture {
  const elements = new Map<string, FakeElement[]>();
  const intervalCallbacks = new Map<number, () => void>();
  let nextInterval = 0;
  const analyserState = { amplitude: 0 };
  const analyser = {
    connect: vi.fn(),
    disconnect: vi.fn(),
    fftSize: 4,
    getByteTimeDomainData: vi.fn((data: Uint8Array) => data.fill(128 + analyserState.amplitude))
  } as unknown as AnalyserNode;
  const source = { connect: vi.fn(), disconnect: vi.fn() } as unknown as MediaStreamAudioSourceNode;
  let state: AudioContextState = "suspended";
  const audioContextResume = vi.fn(() => {
    state = "running";
    return Promise.resolve();
  });
  const audioContextClose = vi.fn(() => {
    state = "closed";
    return Promise.resolve();
  });
  const audioContext = {
    createAnalyser: vi.fn(() => analyser),
    createMediaStreamSource: vi.fn(() => source),
    destination: {} as AudioDestinationNode,
    get state() {
      return state;
    },
    resume: audioContextResume,
    close: audioContextClose
  } as unknown as AudioContext;
  const stats = { audioEnergy: 0, audioPackets: 0, videoFrames: 0 };
  const videoFrame = {
    detail: null,
    pixels: solidVideoFrame(32) as Uint8ClampedArray | null,
    readback: "ok" as StreamCaptureFrameReadback
  };
  const peers: FakePeer[] = [];
  const previewPlayErrors = [
    ...(options.previewPlayErrors ??
      (options.previewPlayError ? [new Error(options.previewPlayError)] : []))
  ];
  let previewPlayPromiseUsed = false;
  let resolveFirstOffer: (() => void) | undefined;
  const firstOffer = options.deferFirstOffer
    ? new Promise<RTCSessionDescriptionInit>((resolve) => {
        resolveFirstOffer = () => resolve({ type: "offer", sdp: "offer" });
      })
    : undefined;
  const environment: StreamCaptureSpikeEnvironment = {
    document: {
      createElement: ((tagName: string) => {
        const element = new FakeElement();
        if (tagName === "video" && (previewPlayErrors.length > 0 || options.previewPlayPromise)) {
          element.play.mockImplementation(() => {
            if (options.previewPlayPromise && !previewPlayPromiseUsed) {
              previewPlayPromiseUsed = true;
              return options.previewPlayPromise;
            }
            const error = previewPlayErrors.shift();
            return error ? Promise.reject(error) : Promise.resolve(undefined);
          });
        }
        const list = elements.get(tagName) ?? [];
        list.push(element);
        elements.set(tagName, list);
        return element;
      }) as unknown as StreamCaptureSpikeEnvironment["document"]["createElement"]
    },
    createAudioContext: vi.fn(() => audioContext),
    createMediaStream: vi.fn((tracks: MediaStreamTrack[]) => stream(tracks)),
    createPeerConnection: vi.fn((configuration: RTCConfiguration) => {
      const peer = new FakePeer(
        configuration,
        () => peers[0]?.tracks ?? [],
        () =>
          new Map([
            [
              "audio",
              {
                id: "audio",
                type: "inbound-rtp",
                kind: "audio",
                packetsReceived: stats.audioPackets,
                totalAudioEnergy: stats.audioEnergy
              }
            ],
            [
              "video",
              {
                id: "video",
                type: "inbound-rtp",
                kind: "video",
                framesDecoded: stats.videoFrames
              }
            ]
          ]) as unknown as RTCStatsReport
      );
      if (firstOffer && peers.length === 0) {
        peer.createOffer.mockImplementation(() => firstOffer);
      }
      peers.push(peer);
      return peer as unknown as RTCPeerConnection;
    }),
    readVideoFrame: vi.fn(() => ({
      detail: videoFrame.detail,
      pixels: videoFrame.pixels,
      readback: videoFrame.readback
    })),
    setInterval: vi.fn((callback: () => void) => {
      const handle = ++nextInterval;
      intervalCallbacks.set(handle, callback);
      return handle;
    }),
    clearInterval: vi.fn((handle: number) => {
      intervalCallbacks.delete(handle);
    })
  };
  return {
    analyser: analyserState,
    audioContext,
    audioContextClose,
    audioContextResume,
    elements,
    environment,
    intervalCallbacks,
    peers,
    resolveFirstOffer,
    stats,
    videoFrame
  };
}

function adapterFromSessions(fixtures: SessionFixture[]) {
  let index = 0;
  return {
    start: vi.fn(() => fixtures[Math.min(index++, fixtures.length - 1)].session),
    stop: vi.fn(),
    resumeAudio: vi.fn(async () => true)
  } as unknown as StreamCaptureAdapter;
}

async function flush(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

function previewElement(fixture: HarnessFixture): FakeElement {
  const preview = fixture.elements.get("video")?.[0];
  if (!preview) {
    throw new Error("capture preview is missing from the fixture");
  }
  return preview;
}

async function pollOnce(fixture: HarnessFixture): Promise<void> {
  for (const callback of fixture.intervalCallbacks.values()) {
    callback();
  }
  await flush();
}

async function driveReady(
  subject: StreamCaptureSpikeHarness,
  fixture: HarnessFixture,
  frameValue = 96
): Promise<void> {
  fixture.analyser.amplitude = 32;
  fixture.stats.audioPackets += 1;
  fixture.stats.audioEnergy += 0.5;
  fixture.stats.videoFrames += 3;
  fixture.videoFrame.pixels = solidVideoFrame(frameValue);
  previewElement(fixture).currentTime += 0.5;
  await pollOnce(fixture);
  expect(subject.getSnapshot()).toMatchObject({ ready: true, status: "ready" });
}

describe("isStreamCaptureSpikeEnabled", () => {
  it("accepts only the exact captureSpike=1/true values", () => {
    expect(isStreamCaptureSpikeEnabled("?captureSpike=1")).toBe(true);
    expect(isStreamCaptureSpikeEnabled("captureSpike=true&x=1")).toBe(true);
    expect(isStreamCaptureSpikeEnabled("?captureSpike=0&captureSpike=1")).toBe(true);
    expect(isStreamCaptureSpikeEnabled("?captureSpike=TRUE")).toBe(false);
    expect(isStreamCaptureSpikeEnabled("?captureSpike=yes")).toBe(false);
    expect(isStreamCaptureSpikeEnabled("?captureSpike=trueish")).toBe(false);
    expect(isStreamCaptureSpikeEnabled("?captureSpikes=1")).toBe(false);
  });
});

describe("StreamCaptureSpikeHarness", () => {
  it("arms the owned receiver context synchronously and creates in-memory no-ICE peers", async () => {
    const fixture = harnessFixture();
    const subject = new StreamCaptureSpikeHarness(fixture.environment);
    const armed = subject.attemptReceiverAudioArm();

    expect(fixture.audioContextResume).toHaveBeenCalledOnce();
    await expect(armed).resolves.toBe(true);

    const capture = sessionFixture({ audio: true });
    const adapter = adapterFromSessions([capture]);
    const mount = new FakeElement();
    await subject.start(adapter, mount as unknown as HTMLElement);

    expect(fixture.peers).toHaveLength(2);
    expect(fixture.peers.map((peer) => peer.configuration)).toEqual([
      { iceServers: [] },
      { iceServers: [] }
    ]);
    expect(fixture.peers[0].tracks.map((item) => item.kind)).toEqual(["video", "audio"]);
    expect(fixture.peers[0].addIceCandidate).toHaveBeenCalledOnce();
    expect(fixture.peers[1].addIceCandidate).toHaveBeenCalledOnce();

    const preview = fixture.elements.get("video")?.[0];
    expect(preview).toMatchObject({ autoplay: true, muted: true, playsInline: true, width: 512, height: 448 });
    expect(preview?.srcObject?.getVideoTracks()).toHaveLength(1);
    expect(preview?.srcObject?.getAudioTracks()).toHaveLength(0);
    expect(preview?.play).toHaveBeenCalledOnce();
    expect(fixture.environment.createMediaStream).toHaveBeenCalledTimes(2);
  });

  it("binds and plays the preview once when the audio track arrives first", async () => {
    const fixture = harnessFixture();
    const subject = new StreamCaptureSpikeHarness(fixture.environment);
    await subject.attemptReceiverAudioArm();
    await subject.start(
      adapterFromSessions([
        sessionFixture({ audio: true, trackOrder: ["audio", "video"] })
      ]),
      new FakeElement() as unknown as HTMLElement
    );

    const preview = previewElement(fixture);
    expect(preview.play).toHaveBeenCalledOnce();
    expect(preview.srcObject?.getVideoTracks()).toHaveLength(1);
    expect(preview.srcObject?.getAudioTracks()).toHaveLength(0);
    expect(fixture.environment.createMediaStream).toHaveBeenCalledTimes(2);
    expect(subject.getSnapshot()).toMatchObject({
      receivedAudioTrackCount: 1,
      receivedVideoTrackCount: 1
    });
  });

  it("reports ready only after presented, visible, changing video and non-silent audio", async () => {
    const fixture = harnessFixture();
    const subject = new StreamCaptureSpikeHarness(fixture.environment);
    await subject.attemptReceiverAudioArm();
    await subject.start(
      adapterFromSessions([sessionFixture({ audio: true })]),
      new FakeElement() as unknown as HTMLElement
    );

    expect(subject.getSnapshot()).toMatchObject({ ready: false, receiverAudioLevelRms: 0 });
    fixture.analyser.amplitude = 32;
    fixture.stats.audioPackets = 1;
    fixture.stats.audioEnergy = 0.25;
    fixture.stats.videoFrames = 2;
    previewElement(fixture).currentTime += 0.5;
    await pollOnce(fixture);

    expect(subject.getSnapshot()).toMatchObject({
      ready: false,
      receivedVideoActivityChanging: false,
      receivedVideoContentVisible: true,
      status: "waiting"
    });

    fixture.stats.audioPackets = 2;
    fixture.stats.audioEnergy = 0.5;
    fixture.stats.videoFrames = 3;
    fixture.videoFrame.pixels = solidVideoFrame(96);
    previewElement(fixture).currentTime += 0.5;
    await pollOnce(fixture);

    expect(subject.getSnapshot()).toMatchObject({
      status: "ready",
      ready: true,
      receivedVideoTrackCount: 1,
      receivedAudioTrackCount: 1,
      audioActivityChanging: true,
      inboundAudioPacketsReceived: 2,
      inboundVideoFramesDecoded: 3,
      previewPresentationReady: true,
      previewTimeChanging: true,
      receivedVideoActivityChanging: true,
      receivedVideoBlack: false,
      receivedVideoContentVisible: true
    });
    expect(subject.getSnapshot().receiverAudioLevelRms).toBeGreaterThan(0);
    expect(JSON.parse(JSON.stringify(subject.getSnapshot()))).toEqual(subject.getSnapshot());

    fixture.analyser.amplitude = 0;
    fixture.videoFrame.pixels = solidVideoFrame(160);
    fixture.stats.videoFrames = 4;
    previewElement(fixture).currentTime += 0.5;
    await pollOnce(fixture);
    expect(subject.getSnapshot()).toMatchObject({
      fallbackAvailable: false,
      ready: true,
      status: "ready"
    });
  });

  it("summarizes a moving bridge pipeline as one normal verdict", async () => {
    const fixture = harnessFixture();
    const capture = sessionFixture({ audio: true });
    const subject = new StreamCaptureSpikeHarness(fixture.environment);
    await subject.attemptReceiverAudioArm();
    await subject.start(
      adapterFromSessions([capture]),
      new FakeElement() as unknown as HTMLElement
    );

    for (const stage of ["source", "bridge", "staging"] as const) {
      capture.stageFrames[stage] = solidVideoFrame(96);
    }
    fixture.analyser.amplitude = 32;
    fixture.stats.audioPackets = 1;
    fixture.stats.audioEnergy = 0.5;
    fixture.stats.videoFrames = 2;
    fixture.videoFrame.pixels = solidVideoFrame(96);
    previewElement(fixture).currentTime += 0.5;
    await pollOnce(fixture);

    expect(subject.getSnapshot()).toMatchObject({
      ready: true,
      status: "ready",
      videoPipeline: {
        diagnosis: "ok",
        source: { verdict: "ok", readback: "ok" },
        bridge: { verdict: "ok", readback: "ok" },
        staging: { verdict: "ok", readback: "ok" },
        receiver: { verdict: "ok", readback: "ok" }
      }
    });
    expect(fixture.elements.get("pre")?.[0].textContent).toContain("영상 경로: 정상");
  });

  it("accepts a moving bridge pipeline when preserve=false source readback stays black", async () => {
    const fixture = harnessFixture();
    const capture = sessionFixture({ audio: true });
    capture.stageFrames.source = solidVideoFrame(0);
    const subject = new StreamCaptureSpikeHarness(fixture.environment);
    await subject.attemptReceiverAudioArm();
    await subject.start(
      adapterFromSessions([capture]),
      new FakeElement() as unknown as HTMLElement
    );

    fixture.analyser.amplitude = 32;
    for (let index = 1; index <= 10; index += 1) {
      const movingValue = index % 2 === 0 ? 96 : 160;
      capture.stageFrames.bridge = solidVideoFrame(movingValue);
      capture.stageFrames.staging = solidVideoFrame(movingValue);
      fixture.videoFrame.pixels = solidVideoFrame(movingValue);
      fixture.stats.audioPackets = index;
      fixture.stats.audioEnergy = index / 10;
      fixture.stats.videoFrames = index;
      previewElement(fixture).currentTime += 0.5;
      await pollOnce(fixture);
    }

    expect(subject.getSnapshot()).toMatchObject({
      sourcePreserveDrawingBuffer: false,
      ready: true,
      status: "ready",
      videoPipeline: {
        diagnosis: "ok",
        source: { verdict: "black" },
        bridge: { verdict: "ok" },
        staging: { verdict: "ok" },
        receiver: { verdict: "ok" }
      }
    });
  });

  it("localizes visible bridge but black staging and receiver to the 512x448 copy", async () => {
    const fixture = harnessFixture();
    fixture.videoFrame.pixels = solidVideoFrame(0);
    const capture = sessionFixture({ audio: true });
    capture.stageFrames.staging = solidVideoFrame(0);
    const subject = new StreamCaptureSpikeHarness(fixture.environment);
    await subject.attemptReceiverAudioArm();
    await subject.start(
      adapterFromSessions([capture]),
      new FakeElement() as unknown as HTMLElement
    );

    fixture.analyser.amplitude = 32;
    for (let index = 1; index <= 10; index += 1) {
      const movingValue = index % 2 === 0 ? 96 : 160;
      capture.stageFrames.source = solidVideoFrame(movingValue);
      capture.stageFrames.bridge = solidVideoFrame(movingValue);
      fixture.stats.audioPackets = index;
      fixture.stats.audioEnergy = index / 10;
      fixture.stats.videoFrames = index;
      previewElement(fixture).currentTime += 0.5;
      await pollOnce(fixture);
    }

    expect(subject.getSnapshot()).toMatchObject({
      ready: false,
      status: "failed",
      videoPipeline: {
        diagnosis: "staging-copy-failed",
        bridge: { verdict: "ok" },
        staging: { verdict: "black" },
        receiver: { verdict: "black" }
      }
    });
    expect(fixture.elements.get("pre")?.[0].textContent).toContain(
      "영상 경로: 512x448 복사 실패"
    );
  });

  it("localizes a black bridge to source capture", async () => {
    const fixture = harnessFixture();
    fixture.videoFrame.pixels = solidVideoFrame(0);
    const capture = sessionFixture({ audio: true });
    capture.stageFrames.bridge = solidVideoFrame(0);
    capture.stageFrames.staging = solidVideoFrame(0);
    const subject = new StreamCaptureSpikeHarness(fixture.environment);
    await subject.attemptReceiverAudioArm();
    await subject.start(
      adapterFromSessions([capture]),
      new FakeElement() as unknown as HTMLElement
    );

    for (let index = 1; index <= 10; index += 1) {
      capture.stageFrames.source = solidVideoFrame(index % 2 === 0 ? 96 : 160);
      fixture.analyser.amplitude = 32;
      fixture.stats.audioPackets = index;
      fixture.stats.audioEnergy = index / 10;
      fixture.stats.videoFrames = index;
      previewElement(fixture).currentTime += 0.5;
      await pollOnce(fixture);
    }

    expect(subject.getSnapshot()).toMatchObject({
      ready: false,
      status: "failed",
      videoPipeline: {
        diagnosis: "source-capture-failed",
        bridge: { verdict: "black" }
      }
    });
    expect(fixture.elements.get("pre")?.[0].textContent).toContain(
      "영상 경로: 원본 캡처 실패"
    );
  });

  it("localizes moving staging with a black receiver to downstream capture", async () => {
    const fixture = harnessFixture();
    fixture.videoFrame.pixels = solidVideoFrame(0);
    const capture = sessionFixture({ audio: true });
    const subject = new StreamCaptureSpikeHarness(fixture.environment);
    await subject.attemptReceiverAudioArm();
    await subject.start(
      adapterFromSessions([capture]),
      new FakeElement() as unknown as HTMLElement
    );

    for (let index = 1; index <= 10; index += 1) {
      const movingValue = index % 2 === 0 ? 96 : 160;
      capture.stageFrames.source = solidVideoFrame(movingValue);
      capture.stageFrames.bridge = solidVideoFrame(movingValue);
      capture.stageFrames.staging = solidVideoFrame(movingValue);
      fixture.analyser.amplitude = 32;
      fixture.stats.audioPackets = index;
      fixture.stats.audioEnergy = index / 10;
      fixture.stats.videoFrames = index;
      previewElement(fixture).currentTime += 0.5;
      await pollOnce(fixture);
    }

    expect(subject.getSnapshot()).toMatchObject({
      ready: false,
      status: "failed",
      videoPipeline: {
        diagnosis: "downstream-capture-failed",
        staging: { verdict: "ok" },
        receiver: { verdict: "black" }
      }
    });
    expect(fixture.elements.get("pre")?.[0].textContent).toContain(
      "영상 경로: 캔버스 캡처/전송 실패"
    );
  });

  it.each([
    ["bridge", "bridge-readback-unavailable", "영상 경로: 원본 캡처 판독 불가"],
    ["staging", "staging-readback-unavailable", "영상 경로: 512x448 판독 불가"]
  ] as const)("reports an unreadable %s stage", async (stage, diagnosis, label) => {
    const fixture = harnessFixture();
    const capture = sessionFixture({ audio: true });
    capture.stageReadbacks[stage] = "failed";
    capture.stageFrames[stage] = null;
    const subject = new StreamCaptureSpikeHarness(fixture.environment);
    await subject.attemptReceiverAudioArm();
    await subject.start(
      adapterFromSessions([capture]),
      new FakeElement() as unknown as HTMLElement
    );

    const movingValue = 96;
    for (const readableStage of ["source", "bridge", "staging"] as const) {
      if (readableStage !== stage) {
        capture.stageFrames[readableStage] = solidVideoFrame(movingValue);
      }
    }
    fixture.videoFrame.pixels = solidVideoFrame(movingValue);
    fixture.stats.videoFrames = 1;
    previewElement(fixture).currentTime += 0.5;
    await pollOnce(fixture);

    expect(subject.getSnapshot()).toMatchObject({
      ready: false,
      status: "failed",
      videoPipeline: {
        diagnosis,
        [stage]: { verdict: "unreadable", readback: "failed" }
      }
    });
    expect(fixture.elements.get("pre")?.[0].textContent).toContain(label);
  });

  it("reports an unreadable receiver separately instead of calling it black", async () => {
    const fixture = harnessFixture();
    const capture = sessionFixture({ audio: true });
    const subject = new StreamCaptureSpikeHarness(fixture.environment);
    await subject.attemptReceiverAudioArm();
    await subject.start(
      adapterFromSessions([capture]),
      new FakeElement() as unknown as HTMLElement
    );

    for (const stage of ["source", "bridge", "staging"] as const) {
      capture.stageFrames[stage] = solidVideoFrame(96);
    }
    fixture.stats.videoFrames = 5;
    fixture.videoFrame.readback = "tainted";
    fixture.videoFrame.pixels = null;
    fixture.videoFrame.detail = "SecurityError";
    previewElement(fixture).currentTime += 0.5;
    await pollOnce(fixture);

    expect(subject.getSnapshot()).toMatchObject({
      ready: false,
      status: "failed",
      receivedVideoBlack: false,
      receivedVideoContentVisible: false,
      videoPipeline: {
        diagnosis: "receiver-readback-unavailable",
        receiver: {
          verdict: "unreadable",
          readback: "tainted",
          detail: "SecurityError"
        }
      }
    });
  });

  it("clears a prior black latch when receiver readback becomes unreadable", async () => {
    const fixture = harnessFixture();
    fixture.videoFrame.pixels = solidVideoFrame(0);
    const subject = new StreamCaptureSpikeHarness(fixture.environment);
    await subject.attemptReceiverAudioArm();
    await subject.start(
      adapterFromSessions([sessionFixture({ audio: true })]),
      new FakeElement() as unknown as HTMLElement
    );

    for (let index = 1; index <= 10; index += 1) {
      fixture.stats.videoFrames = index;
      previewElement(fixture).currentTime += 0.5;
      await pollOnce(fixture);
    }
    expect(subject.getSnapshot().receivedVideoBlack).toBe(true);

    fixture.videoFrame.readback = "failed";
    fixture.videoFrame.pixels = null;
    fixture.videoFrame.detail = "readback failed";
    previewElement(fixture).currentTime += 0.5;
    await pollOnce(fixture);

    expect(subject.getSnapshot()).toMatchObject({
      ready: false,
      status: "failed",
      receivedVideoBlack: false,
      videoPipeline: {
        diagnosis: "receiver-readback-unavailable",
        receiver: { verdict: "unreadable", readback: "failed" }
      }
    });
  });

  it("clears ready after a bounded static-video grace window", async () => {
    const fixture = harnessFixture();
    const subject = new StreamCaptureSpikeHarness(fixture.environment);
    await subject.attemptReceiverAudioArm();
    await subject.start(
      adapterFromSessions([sessionFixture({ audio: true })]),
      new FakeElement() as unknown as HTMLElement
    );
    await driveReady(subject, fixture);

    previewElement(fixture).currentTime += 0.5;
    await pollOnce(fixture);
    expect(subject.getSnapshot().ready).toBe(true);
    previewElement(fixture).currentTime += 0.5;
    await pollOnce(fixture);

    expect(subject.getSnapshot()).toMatchObject({
      status: "waiting",
      ready: false,
      previewPresentationReady: true,
      receivedVideoActivityChanging: false,
      receivedVideoContentVisible: true
    });
  });

  it("clears ready when preview time stops even if pixels keep changing", async () => {
    const fixture = harnessFixture();
    const subject = new StreamCaptureSpikeHarness(fixture.environment);
    await subject.attemptReceiverAudioArm();
    await subject.start(
      adapterFromSessions([sessionFixture({ audio: true })]),
      new FakeElement() as unknown as HTMLElement
    );
    await driveReady(subject, fixture);

    fixture.videoFrame.pixels = solidVideoFrame(160);
    await pollOnce(fixture);
    fixture.videoFrame.pixels = solidVideoFrame(224);
    await pollOnce(fixture);

    expect(subject.getSnapshot()).toMatchObject({
      status: "waiting",
      ready: false,
      previewPresentationReady: false,
      previewTimeChanging: false,
      receivedVideoActivityChanging: true
    });
  });

  it("clears ready immediately when video turns black after presentation", async () => {
    const fixture = harnessFixture();
    const subject = new StreamCaptureSpikeHarness(fixture.environment);
    await subject.attemptReceiverAudioArm();
    await subject.start(
      adapterFromSessions([sessionFixture({ audio: true })]),
      new FakeElement() as unknown as HTMLElement
    );
    await driveReady(subject, fixture);

    fixture.videoFrame.pixels = solidVideoFrame(0);
    previewElement(fixture).currentTime += 0.5;
    await pollOnce(fixture);

    expect(subject.getSnapshot()).toMatchObject({
      status: "waiting",
      ready: false,
      receivedVideoBlack: false,
      receivedVideoContentVisible: false
    });
  });

  it("clears ready immediately when the received video track ends", async () => {
    const fixture = harnessFixture();
    const subject = new StreamCaptureSpikeHarness(fixture.environment);
    await subject.attemptReceiverAudioArm();
    await subject.start(
      adapterFromSessions([sessionFixture({ audio: true })]),
      new FakeElement() as unknown as HTMLElement
    );
    await driveReady(subject, fixture);

    const receivedVideoTrack = previewElement(fixture).srcObject?.getVideoTracks()[0];
    Object.assign(receivedVideoTrack ?? {}, { readyState: "ended" });
    fixture.videoFrame.pixels = solidVideoFrame(160);
    previewElement(fixture).currentTime += 0.5;
    await pollOnce(fixture);

    expect(subject.getSnapshot()).toMatchObject({
      status: "waiting",
      ready: false,
      previewPresentationReady: false,
      receivedVideoTrackCount: 0
    });
  });

  it("rejects decoded but persistently black received video", async () => {
    const fixture = harnessFixture();
    fixture.videoFrame.pixels = solidVideoFrame(0);
    const subject = new StreamCaptureSpikeHarness(fixture.environment);
    await subject.attemptReceiverAudioArm();
    await subject.start(
      adapterFromSessions([sessionFixture({ audio: true })]),
      new FakeElement() as unknown as HTMLElement
    );

    const poll = [...fixture.intervalCallbacks.values()][0];
    fixture.analyser.amplitude = 32;
    for (let index = 1; index <= 10; index += 1) {
      fixture.stats.audioPackets = index;
      fixture.stats.audioEnergy = index / 10;
      fixture.stats.videoFrames = index;
      previewElement(fixture).currentTime += 0.5;
      poll();
      await flush();
    }

    expect(subject.getSnapshot()).toMatchObject({
      status: "failed",
      ready: false,
      previewPresentationReady: true,
      receivedVideoActivityChanging: false,
      receivedVideoBlack: true,
      receivedVideoContentVisible: false
    });
  });

  it("reports a rejected preview play operation and never becomes ready", async () => {
    const blocked = new Error("preview playback rejected");
    blocked.name = "NotAllowedError";
    const fixture = harnessFixture({ previewPlayErrors: [blocked] });
    const subject = new StreamCaptureSpikeHarness(fixture.environment);
    await subject.attemptReceiverAudioArm();
    await subject.start(
      adapterFromSessions([sessionFixture({ audio: true })]),
      new FakeElement() as unknown as HTMLElement
    );
    await flush();

    expect(subject.getSnapshot()).toMatchObject({
      status: "failed",
      ready: false,
      previewPlayError: "preview playback rejected",
      previewPresentationReady: false
    });
    expect(previewElement(fixture).play).toHaveBeenCalledOnce();
  });

  it("retries one current preview AbortError without reattaching on the audio track", async () => {
    const aborted = new Error("The operation was aborted");
    aborted.name = "AbortError";
    const fixture = harnessFixture({ previewPlayErrors: [aborted] });
    const subject = new StreamCaptureSpikeHarness(fixture.environment);
    await subject.attemptReceiverAudioArm();
    await subject.start(
      adapterFromSessions([sessionFixture({ audio: true })]),
      new FakeElement() as unknown as HTMLElement
    );
    await flush();

    const preview = previewElement(fixture);
    expect(preview.play).toHaveBeenCalledTimes(2);
    expect(preview.srcObject?.getVideoTracks()).toHaveLength(1);
    expect(preview.srcObject?.getAudioTracks()).toHaveLength(0);
    expect(subject.getSnapshot()).toMatchObject({
      previewPlayError: null,
      ready: false,
      status: "waiting"
    });

    await driveReady(subject, fixture);
  });

  it("ignores a late preview rejection after the loopback is stopped", async () => {
    let rejectPlay: (reason?: unknown) => void = () => undefined;
    const pendingPlay = new Promise<undefined>((_resolve, reject) => {
      rejectPlay = reject;
    });
    const fixture = harnessFixture({ previewPlayPromise: pendingPlay });
    const subject = new StreamCaptureSpikeHarness(fixture.environment);
    await subject.attemptReceiverAudioArm();
    await subject.start(
      adapterFromSessions([sessionFixture({ audio: true })]),
      new FakeElement() as unknown as HTMLElement
    );

    subject.stop();
    const aborted = new Error("late abort");
    aborted.name = "AbortError";
    rejectPlay(aborted);
    await flush();

    expect(subject.getSnapshot()).toMatchObject({
      previewPlayError: null,
      ready: false,
      status: "idle"
    });
  });

  it("waits the full five-second silent-media watchdog before offering fallback", async () => {
    const fixture = harnessFixture();
    const subject = new StreamCaptureSpikeHarness(fixture.environment);
    await subject.attemptReceiverAudioArm();
    await subject.start(
      adapterFromSessions([sessionFixture({ audio: true })]),
      new FakeElement() as unknown as HTMLElement
    );

    expect(fixture.environment.setInterval).toHaveBeenCalledWith(expect.any(Function), 500);
    expect(fixture.elements.get("button")).toBeUndefined();
    const poll = [...fixture.intervalCallbacks.values()][0];
    for (let index = 0; index < 9; index += 1) {
      poll();
      await flush();
    }

    expect(subject.getSnapshot()).toMatchObject({ fallbackAvailable: false, status: "waiting" });
    expect(fixture.elements.get("button")).toBeUndefined();

    poll();
    await flush();
    expect(subject.getSnapshot()).toMatchObject({ fallbackAvailable: true, status: "fallback" });
    expect(fixture.elements.get("button")).toHaveLength(1);
  });

  it("offers exactly one fallback and restarts capture/loopback at most once", async () => {
    const fixture = harnessFixture();
    const first = sessionFixture();
    const second = sessionFixture();
    const adapter = adapterFromSessions([first, second]);
    const subject = new StreamCaptureSpikeHarness(fixture.environment);
    await subject.attemptReceiverAudioArm();
    await subject.start(adapter, new FakeElement() as unknown as HTMLElement);

    const buttons = fixture.elements.get("button") ?? [];
    expect(buttons).toHaveLength(1);
    expect(buttons[0].textContent).toBe("방 열고 소리 켜기");
    buttons[0].click();
    buttons[0].click();
    await vi.waitFor(() => {
      expect(adapter.start).toHaveBeenCalledTimes(2);
      expect(subject.getSnapshot().status).toBe("failed");
    });

    expect(adapter.resumeAudio).toHaveBeenCalledOnce();
    expect(fixture.peers).toHaveLength(4);
    expect(fixture.elements.get("button")).toHaveLength(1);
    expect(subject.getSnapshot()).toMatchObject({
      fallbackAvailable: false,
      fallbackUsed: true,
      ready: false,
      status: "failed"
    });
  });

  it("cleans up peers, timers, preview, sessions, adapter, and only its owned audio", async () => {
    const fixture = harnessFixture();
    const capture = sessionFixture({ audio: true });
    const adapter = adapterFromSessions([capture]);
    const subject = new StreamCaptureSpikeHarness(fixture.environment);
    await subject.attemptReceiverAudioArm();
    await subject.start(adapter, new FakeElement() as unknown as HTMLElement);
    const preview = fixture.elements.get("video")?.[0];

    subject.stop();
    subject.stop();

    expect(fixture.peers.every((peer) => peer.close.mock.calls.length === 1)).toBe(true);
    expect(fixture.intervalCallbacks).toHaveLength(0);
    expect(capture.stop).toHaveBeenCalledOnce();
    expect(adapter.stop).toHaveBeenCalledOnce();
    expect(fixture.audioContextClose).toHaveBeenCalledOnce();
    expect(preview?.srcObject).toBeNull();
    expect(subject.getSnapshot()).toMatchObject({ status: "idle", ready: false });
  });

  it("cancels pending negotiation without installing late timers after stop", async () => {
    const fixture = harnessFixture({ deferFirstOffer: true });
    const capture = sessionFixture({ audio: true });
    const adapter = adapterFromSessions([capture]);
    const subject = new StreamCaptureSpikeHarness(fixture.environment);
    await subject.attemptReceiverAudioArm();

    const starting = subject.start(adapter, new FakeElement() as unknown as HTMLElement);
    await flush();
    expect(fixture.peers).toHaveLength(2);
    expect(fixture.peers[0].createOffer).toHaveBeenCalledOnce();

    subject.stop();
    fixture.resolveFirstOffer?.();
    await expect(starting).resolves.toBeUndefined();
    await flush();

    expect(fixture.environment.setInterval).not.toHaveBeenCalled();
    expect(fixture.intervalCallbacks).toHaveLength(0);
    expect(fixture.peers[0].setLocalDescription).not.toHaveBeenCalled();
    expect(fixture.peers.every((peer) => peer.close.mock.calls.length === 1)).toBe(true);
    expect(capture.stop).toHaveBeenCalledOnce();
    expect(adapter.stop).toHaveBeenCalledOnce();
    expect(subject.getSnapshot()).toMatchObject({ status: "idle", ready: false });
  });

  it("ignores a stale rejected stats poll after stop", async () => {
    const fixture = harnessFixture();
    const capture = sessionFixture({ audio: true });
    const adapter = adapterFromSessions([capture]);
    const subject = new StreamCaptureSpikeHarness(fixture.environment);
    await subject.attemptReceiverAudioArm();
    await subject.start(adapter, new FakeElement() as unknown as HTMLElement);

    let rejectStats: (reason?: unknown) => void = () => undefined;
    const pendingStats = new Promise<RTCStatsReport>((_resolve, reject) => {
      rejectStats = reject;
    });
    fixture.peers[1].getStats.mockImplementationOnce(() => pendingStats);
    const poll = [...fixture.intervalCallbacks.values()][0];
    poll();
    await flush();

    subject.stop();
    rejectStats(new Error("late stats failure"));
    await flush();

    expect(subject.getSnapshot()).toMatchObject({ error: null, ready: false, status: "idle" });
  });
});
