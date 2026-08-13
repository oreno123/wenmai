import { Suspense, useState, useEffect, useRef, useCallback } from 'react'
import { Canvas } from '@react-three/fiber'
import ShatterScene from '../../../showcase/ShatterScene'
import type { ShatterSceneProps } from '../../../showcase/ShatterScene'
import useHandGesture from '../../../showcase/useHandGesture'
import { BG_COLOR } from '../../../showcase/constants'

// ── Types ─────────────────────────────────────────────
// useHandGesture exports its own HandGestureState now, but sessionStorage
// JSON is free-form — placements are cast at the call site to stay
// logic-neutral about the puzzle page's exact schema.
interface Landmark {
  x: number
  y: number
  z: number
}

interface HandGestureState {
  isOpen: boolean
  isFist: boolean
  isReady: boolean
  error: string | null
  allLandmarks: Landmark[][]
  videoEl: HTMLVideoElement | null
}

const HAND_CONNECTIONS: ReadonlyArray<readonly [number, number]> = [
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [0,9],[9,10],[10,11],[11,12],
  [0,13],[13,14],[14,15],[15,16],
  [0,17],[17,18],[18,19],[19,20],
  [5,9],[9,13],[13,17],
]

function HandOverlay({ videoEl, allLandmarks }: { videoEl: HTMLVideoElement | null; allLandmarks: Landmark[][] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    const video = videoEl
    if (!canvas || !video) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Draw camera feed (mirrored)
    ctx.save()
    ctx.translate(canvas.width, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(video, 0, 0)
    ctx.restore()

    // Draw hand skeleton for ALL detected hands
    if (allLandmarks && allLandmarks.length > 0) {
      const w = canvas.width
      const h = canvas.height

      for (const landmarks of allLandmarks) {
        // Draw connections
        ctx.strokeStyle = 'rgba(0, 255, 200, 0.7)'
        ctx.lineWidth = 2
        for (const [a, b] of HAND_CONNECTIONS) {
          const la = landmarks[a], lb = landmarks[b]
          ctx.beginPath()
          ctx.moveTo((1 - la.x) * w, la.y * h)
          ctx.lineTo((1 - lb.x) * w, lb.y * h)
          ctx.stroke()
        }

        // Draw landmarks
        for (const pt of landmarks) {
          ctx.beginPath()
          ctx.arc((1 - pt.x) * w, pt.y * h, 3, 0, Math.PI * 2)
          ctx.fillStyle = 'rgba(255, 200, 50, 0.9)'
          ctx.fill()
        }
      }
    }
  }, [videoEl, allLandmarks])

  useEffect(() => {
    let raf = 0
    const loop = () => { draw(); raf = requestAnimationFrame(loop) }
    loop()
    return () => cancelAnimationFrame(raf)
  }, [draw])

  if (!videoEl) return null

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute', bottom: 16, right: 16,
        width: 240, height: 180,
        borderRadius: 12,
        border: '2px solid rgba(0,255,200,0.3)',
        boxShadow: '0 0 20px rgba(0,255,200,0.15)',
        zIndex: 20,
        objectFit: 'cover',
      }}
    />
  )
}

function GestureOverlay({ isOpen, isFist, isReady, error, hasImage }: { isOpen: boolean; isFist: boolean; isReady: boolean; error: string | null; hasImage: boolean }) {
  return (
    <div style={{
      position: 'absolute', bottom: 24, left: 0, right: 0,
      display: 'flex', justifyContent: 'center', zIndex: 20, pointerEvents: 'none',
    }}>
      <div style={{
        background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)',
        padding: '8px 20px', borderRadius: 20,
        color: '#F2D58A', fontSize: 13, textAlign: 'center',
      }}>
        {!hasImage ? '暂无创作纹样，请先前往创作' :
         error ? '摄像头不可用，用空格键控制' :
         !isReady ? '正在启动摄像头...' :
         isOpen ? '碎裂中 — 握拳拼合' :
         isFist ? '拼合中 — 张手碎裂' :
         '张开手掌碎裂 / 握拳拼合 / 空格键切换'}
      </div>
    </div>
  )
}

export default function Shatter() {
  const { isOpen, isFist, isReady, error, allLandmarks, videoEl } = useHandGesture() as HandGestureState
  const [userImage, setUserImage] = useState<string | null>(null)
  // placements come from sessionStorage JSON; shape is owned by the puzzle
  // page. Keep loose here to stay logic-neutral.
  const [placements, setPlacements] = useState<unknown[] | null>(null)

  useEffect(() => {
    const placementData = sessionStorage.getItem('showcase_placements')
    if (placementData) {
      try {
        setPlacements(JSON.parse(placementData))
        sessionStorage.removeItem('showcase_placements')
      } catch {}
    }
    const data = sessionStorage.getItem('showcase_image')
    if (data) {
      setUserImage(data)
      sessionStorage.removeItem('showcase_image')
    }
  }, [])

  return (
    <div style={{ position: 'fixed', inset: 0, background: BG_COLOR }}>
      <Canvas
        camera={{ position: [0, 0, 4], fov: 50 }}
        style={{ background: BG_COLOR }}
        gl={{ antialias: true, alpha: false }}
      >
        <Suspense fallback={null}>
          <ShatterScene
            isOpen={isOpen}
            isFist={isFist}
            imageUrl={userImage}
            placements={placements as ShatterSceneProps['placements']}
            allLandmarks={allLandmarks}
          />
        </Suspense>
      </Canvas>

      {/* Camera feed with hand skeleton overlay */}
      <HandOverlay videoEl={videoEl} allLandmarks={allLandmarks} />

      <a
        href="#/home"
        style={{
          position: 'absolute', top: 16, left: 16, zIndex: 20,
          color: '#F2D58A', textDecoration: 'none', fontSize: 14,
          background: 'rgba(0,0,0,0.4)', padding: '6px 14px',
          borderRadius: 16, backdropFilter: 'blur(4px)',
        }}
      >
        返回
      </a>

      <GestureOverlay
        isOpen={isOpen}
        isFist={isFist}
        isReady={isReady}
        error={error}
        hasImage={!!(placements || userImage)}
      />
    </div>
  )
}
