import { Suspense, useState, useEffect } from 'react'
import { Canvas } from '@react-three/fiber'
import ShatterScene from '../showcase/ShatterScene'
import useHandGesture from '../showcase/useHandGesture'
import { BG_COLOR } from '../showcase/constants'

function GestureOverlay({ isOpen, isFist, isReady, error, hasImage }) {
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

export default function Showcase() {
  const { isOpen, isFist, isReady, error } = useHandGesture()
  const [userImage, setUserImage] = useState(null)

  useEffect(() => {
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
          />
        </Suspense>
      </Canvas>

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
        hasImage={!!userImage}
      />
    </div>
  )
}
