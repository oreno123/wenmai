import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision'
import type {
  GestureState,
  HandData,
  SwipeEvent,
  ScaleEvent,
} from './types'

const CDN_WASM = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task'

// Detection constants
const SWIPE_FRAMES = 3
const SWIPE_THRESHOLD = 0.04 // minimum x delta per frame to count as swipe
const SWIPE_COOLDOWN_MS = 300
const SCALE_CHANGE_THRESHOLD = 0.15 // 15% change triggers scale event
const NO_HAND_TIMEOUT_MS = 3000

export interface GestureCallbacks {
  onSwipe: (event: SwipeEvent) => void
  onScale: (event: ScaleEvent) => void
  onStateChange: (state: GestureState) => void
  onHandsUpdate: (hands: HandData[]) => void
}

export class HandSwipeDetector {
  private callbacks: GestureCallbacks
  private video: HTMLVideoElement | null = null
  private handLandmarker: HandLandmarker | null = null
  private rafId: number | null = null
  private lastTimestamp = -1
  private cancelled = false
  private paused = false

  // State machine
  private state: GestureState = 'IDLE'
  private noHandSince = 0

  // Swipe detection
  private swipeDirections: Array<'left' | 'right'> = []
  private lastSwipeFireTime = 0

  // Scale detection
  private prevTwoHandDistance: number | null = null

  // Callbacks cleanup
  private onVisibilityChange: (() => void) | null = null

  constructor(callbacks: GestureCallbacks) {
    this.callbacks = callbacks
  }

  async init(): Promise<void> {
    // Create hidden video element
    this.video = document.createElement('video')
    this.video.playsInline = true
    this.video.muted = true
    this.video.style.display = 'none'
    document.body.appendChild(this.video)

    // Initialize MediaPipe
    const vision = await FilesetResolver.forVisionTasks(CDN_WASM)
    if (this.cancelled) return

    this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: MODEL_URL,
        delegate: 'GPU',
      },
      runningMode: 'VIDEO',
      numHands: 2,
      minHandDetectionConfidence: 0.5,
      minHandPresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    })
    if (this.cancelled) return

    // Initialize webcam
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
      audio: false,
    })
    if (this.cancelled) {
      stream.getTracks().forEach((t) => t.stop())
      return
    }

    this.video.srcObject = stream
    await new Promise<void>((resolve) => {
      this.video!.onloadedmetadata = () => {
        this.video!.play().then(resolve)
      }
    })

    // Handle visibility changes to pause/resume detection
    this.onVisibilityChange = () => {
      this.paused = document.hidden
      if (!this.paused && !this.cancelled && this.handLandmarker) {
        this.detect()
      }
    }
    document.addEventListener('visibilitychange', this.onVisibilityChange)

    // Start detection loop
    this.detect()
  }

  getVideoElement(): HTMLVideoElement | null {
    return this.video
  }

  dispose(): void {
    this.cancelled = true

    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }

    if (this.onVisibilityChange) {
      document.removeEventListener('visibilitychange', this.onVisibilityChange)
      this.onVisibilityChange = null
    }

    if (this.video) {
      const stream = this.video.srcObject as MediaStream | null
      if (stream) {
        stream.getTracks().forEach((t) => t.stop())
      }
      this.video.remove()
      this.video = null
    }

    if (this.handLandmarker) {
      this.handLandmarker.close()
      this.handLandmarker = null
    }
  }

  private detect = (): void => {
    if (this.cancelled || this.paused) return

    const hl = this.handLandmarker
    const vid = this.video
    if (!hl || !vid || vid.readyState < 2) {
      this.rafId = requestAnimationFrame(this.detect)
      return
    }

    // Monotonically increasing timestamp check
    const timestamp = performance.now()
    if (timestamp <= this.lastTimestamp) {
      this.rafId = requestAnimationFrame(this.detect)
      return
    }
    this.lastTimestamp = timestamp

    try {
      const result = hl.detectForVideo(vid, timestamp)
      this.processResult(result)
    } catch {
      // Silently ignore detection errors
    }

    this.rafId = requestAnimationFrame(this.detect)
  }

  private processResult(result: {
    landmarks: Array<Array<{ x: number; y: number; z: number }>>
    handedness: Array<Array<{ categoryName: string }>>
  }): void {
    const numHands = result.landmarks?.length ?? 0
    const now = performance.now()

    if (numHands === 0) {
      // No hands detected
      if (this.state === 'IDLE') return

      if (this.noHandSince === 0) {
        this.noHandSince = now
      }

      if (now - this.noHandSince >= NO_HAND_TIMEOUT_MS) {
        this.transitionTo('IDLE')
        this.noHandSince = 0
        this.swipeDirections = []
        this.prevTwoHandDistance = null
        this.callbacks.onHandsUpdate([])
      }
      return
    }

    // Hands detected — reset no-hand timer
    this.noHandSince = 0

    // Build HandData array
    const hands: HandData[] = result.landmarks.map((lm, idx) => {
      const palmCenter = this.palmCenter(lm)
      const handednessLabel =
        result.handedness?.[idx]?.[0]?.categoryName?.toLowerCase() as
          | 'left'
          | 'right'
          | 'unknown'
      return {
        palmCenter,
        handedness: handednessLabel ?? 'unknown',
        landmarks: lm,
      }
    })

    this.callbacks.onHandsUpdate(hands)

    // State transitions
    if (this.state === 'IDLE') {
      this.transitionTo('TRACKING')
    }

    // Scale detection: two hands
    if (numHands >= 2 && this.state !== 'SCALING') {
      const dist = this.twoHandDistance(hands[0].palmCenter, hands[1].palmCenter)
      this.prevTwoHandDistance = dist
      this.swipeDirections = []
      this.transitionTo('SCALING')
    } else if (numHands >= 2 && this.state === 'SCALING') {
      const dist = this.twoHandDistance(hands[0].palmCenter, hands[1].palmCenter)
      if (this.prevTwoHandDistance !== null) {
        const changeRatio = Math.abs(dist - this.prevTwoHandDistance) / this.prevTwoHandDistance
        if (changeRatio >= SCALE_CHANGE_THRESHOLD) {
          // Map the distance ratio to 0.5–2.0 scale range
          const normalizedScale = dist / this.prevTwoHandDistance
          const scale = Math.max(0.5, Math.min(2.0, normalizedScale))
          const event: ScaleEvent = { scale }
          this.callbacks.onScale(event)
          this.prevTwoHandDistance = dist
        }
      }
      return
    }

    // Back to single hand — exit scaling
    if (numHands < 2 && this.state === 'SCALING') {
      this.prevTwoHandDistance = null
      this.swipeDirections = []
      this.transitionTo('TRACKING')
    }

    // Swipe detection: single hand
    if (numHands >= 1 && (this.state === 'TRACKING' || this.state === 'SWIPING')) {
      this.detectSwipe(hands[0].palmCenter, now)
    }
  }

  private detectSwipe(palm: { x: number; y: number; z: number }, now: number): void {
    // Cooldown: if we just fired a swipe, don't start a new one
    if (now - this.lastSwipeFireTime < SWIPE_COOLDOWN_MS) {
      this.swipeDirections = []
      if (this.state === 'SWIPING') {
        this.transitionTo('TRACKING')
      }
      return
    }

    // On the first tracking frame after cooldown or state entry, record position
    // but don't compute delta (there's no "previous" yet)
    // We store the last palm position on each frame and compute direction on next frame.
    // Use the previous palm center from the last detection call.
    const prevPalm = this.lastPalm
    this.lastPalm = { x: palm.x, y: palm.y, z: palm.z }

    if (!prevPalm) return // no previous frame to compare

    // Mirror correction: MediaPipe x increases when hand moves LEFT on mirrored display.
    // So delta = prevX - currentX. Positive delta = screen-right movement.
    const deltaX = prevPalm.x - palm.x

    if (Math.abs(deltaX) < SWIPE_THRESHOLD) {
      // Movement too small, reset direction streak
      this.swipeDirections = []
      return
    }

    const direction: 'left' | 'right' = deltaX > 0 ? 'right' : 'left'
    this.swipeDirections.push(direction)

    // Only keep last SWIPE_FRAMES entries
    if (this.swipeDirections.length > SWIPE_FRAMES) {
      this.swipeDirections = this.swipeDirections.slice(-SWIPE_FRAMES)
    }

    // Check if all recent directions agree
    if (this.swipeDirections.length >= SWIPE_FRAMES) {
      const allSame = this.swipeDirections.every((d) => d === this.swipeDirections[0])
      if (allSame) {
        const velocity = Math.abs(deltaX) / (1000 / 60) // approximate px/ms → units/ms
        const event: SwipeEvent = {
          direction: this.swipeDirections[0],
          velocity,
        }
        this.callbacks.onSwipe(event)
        this.lastSwipeFireTime = now
        this.swipeDirections = []
        this.transitionTo('SWIPING')

        // Auto-return to TRACKING after cooldown period
        setTimeout(() => {
          if (this.state === 'SWIPING') {
            this.transitionTo('TRACKING')
          }
        }, SWIPE_COOLDOWN_MS)
      }
    }
  }

  private lastPalm: { x: number; y: number; z: number } | null = null

  private transitionTo(newState: GestureState): void {
    if (this.state === newState) return
    this.state = newState
    this.callbacks.onStateChange(newState)

    // Reset tracking-specific state on transitions
    if (newState === 'IDLE') {
      this.lastPalm = null
      this.swipeDirections = []
      this.prevTwoHandDistance = null
    }
    if (newState === 'TRACKING') {
      // Allow swipe accumulation to start fresh when entering tracking
      if (performance.now() - this.lastSwipeFireTime >= SWIPE_COOLDOWN_MS) {
        this.swipeDirections = []
      }
    }
  }

  private palmCenter(landmarks: Array<{ x: number; y: number; z: number }>): {
    x: number
    y: number
    z: number
  } {
    const wrist = landmarks[0]
    const middleMCP = landmarks[9]
    return {
      x: (wrist.x + middleMCP.x) / 2,
      y: (wrist.y + middleMCP.y) / 2,
      z: (wrist.z + middleMCP.z) / 2,
    }
  }

  private twoHandDistance(
    a: { x: number; y: number; z: number },
    b: { x: number; y: number; z: number }
  ): number {
    return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2)
  }
}
