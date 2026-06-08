import { useRef, useEffect, useState, useCallback } from 'react'
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision'
import { GESTURE_OPEN_THRESHOLD, GESTURE_CLOSE_THRESHOLD, GESTURE_FRAMES } from './constants'

export default function useHandGesture() {
  const [state, setState] = useState({
    isOpen: false,
    isFist: false,
    isReady: false,
    error: null,
    allLandmarks: [],
    videoEl: null,
  })

  const handLandmarkerRef = useRef(null)
  const videoRef = useRef(null)
  const openFramesRef = useRef(0)
  const closeFramesRef = useRef(0)
  const gestureRef = useRef({ isOpen: false, isFist: false })
  const rafRef = useRef(null)
  const lastTimestamp = useRef(-1)

  useEffect(() => {
    let cancelled = false
    const video = document.createElement('video')
    video.playsInline = true
    video.muted = true
    video.style.display = 'none'
    document.body.appendChild(video)
    videoRef.current = video

    async function init() {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        )
        if (cancelled) return

        const handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numHands: 2,
          minHandDetectionConfidence: 0.5,
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        })
        if (cancelled) return
        handLandmarkerRef.current = handLandmarker

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
          audio: false,
        })
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return }

        video.srcObject = stream
        await new Promise((resolve) => { video.onloadedmetadata = () => video.play().then(resolve) })

        setState((s) => ({ ...s, isReady: true, videoEl: video }))
        detect()
      } catch (err) {
        setState((s) => ({ ...s, error: err.message }))
      }
    }

    function detect() {
      if (cancelled) return
      const hl = handLandmarkerRef.current
      const vid = videoRef.current
      if (!hl || !vid || vid.readyState < 2) {
        rafRef.current = requestAnimationFrame(detect)
        return
      }

      const timestamp = performance.now()
      if (timestamp <= lastTimestamp.current) {
        rafRef.current = requestAnimationFrame(detect)
        return
      }
      lastTimestamp.current = timestamp

      try {
        const result = hl.detectForVideo(vid, timestamp)
        if (result.landmarks && result.landmarks.length > 0) {
          // Store all hands' landmarks
          setState(s => ({ ...s, allLandmarks: result.landmarks }))

          // Use first hand for gesture detection
          const landmarks = result.landmarks[0]
          const wrist = landmarks[0]
          const middleMCP = landmarks[9]
          const palmScale = dist3D(wrist, middleMCP)

          if (palmScale > 0.01) {
            const tips = [8, 12, 16, 20]
            let spreadCount = 0
            let closeCount = 0
            for (const tipIdx of tips) {
              const ratio = dist3D(landmarks[tipIdx], wrist) / palmScale
              if (ratio > GESTURE_OPEN_THRESHOLD) spreadCount++
              if (ratio < GESTURE_CLOSE_THRESHOLD) closeCount++
            }

            if (spreadCount >= 3) {
              openFramesRef.current++
              closeFramesRef.current = 0
            } else if (closeCount >= 3) {
              closeFramesRef.current++
              openFramesRef.current = 0
            } else {
              openFramesRef.current = 0
              closeFramesRef.current = 0
            }

            const prev = gestureRef.current
            const newOpen = openFramesRef.current >= GESTURE_FRAMES
            const newFist = closeFramesRef.current >= GESTURE_FRAMES

            if (newOpen !== prev.isOpen || newFist !== prev.isFist) {
              gestureRef.current = { isOpen: newOpen, isFist: newFist }
              setState((s) => ({ ...s, isOpen: newOpen, isFist: newFist }))
            }
          }
        } else {
          setState(s => ({ ...s, allLandmarks: [] }))
          openFramesRef.current = 0
          closeFramesRef.current = 0
          if (gestureRef.current.isOpen || gestureRef.current.isFist) {
            gestureRef.current = { isOpen: false, isFist: false }
            setState((s) => ({ ...s, isOpen: false, isFist: false }))
          }
        }
      } catch {}

      rafRef.current = requestAnimationFrame(detect)
    }

    init()

    return () => {
      cancelled = true
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      if (videoRef.current) {
        const s = videoRef.current.srcObject
        if (s) s.getTracks().forEach((t) => t.stop())
        videoRef.current.remove()
      }
      if (handLandmarkerRef.current) {
        handLandmarkerRef.current.close()
        handLandmarkerRef.current = null
      }
    }
  }, [])

  return state
}

function dist3D(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2)
}
