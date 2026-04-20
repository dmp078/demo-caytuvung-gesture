import { useEffect, useRef, useState } from 'react'
import {
  FilesetResolver,
  HandLandmarker,
  type HandLandmarkerResult,
} from '@mediapipe/tasks-vision'
import type { HandFrame, Vec3, UseHandTrackingResult } from '../../types'
import { averageVec3, distance3, lerpVec3 } from '../../utils/math'

const TARGET_DETECTION_FPS = 28
const SMOOTHING_ALPHA = 0.58
const MODEL_ASSET_PATH =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'
const WASM_BASE_PATH =
  'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.34/wasm'

const smoothLandmarks = (
  previous: Vec3[] | null,
  current: Vec3[],
  alpha: number,
): Vec3[] => {
  if (!previous || previous.length !== current.length) {
    return current
  }

  return current.map((point, index) => lerpVec3(previous[index], point, alpha))
}

const toVec3 = (source: { x: number; y: number; z: number }): Vec3 => ({
  x: source.x,
  y: source.y,
  z: source.z,
})

const deriveFrame = (
  result: HandLandmarkerResult,
  timestamp: number,
  previousLandmarks: Vec3[] | null,
): { frame: HandFrame | null; smoothedLandmarks: Vec3[] | null } => {
  if (!result.landmarks.length) {
    return { frame: null, smoothedLandmarks: null }
  }

  const rawLandmarks = result.landmarks[0].map(toVec3)
  const landmarks = smoothLandmarks(previousLandmarks, rawLandmarks, SMOOTHING_ALPHA)

  const wrist = landmarks[0]
  const thumbTip = landmarks[4]
  const indexTip = landmarks[8]
  const middleTip = landmarks[12]
  const ringTip = landmarks[16]
  const pinkyTip = landmarks[20]

  const palmCenter = averageVec3([
    landmarks[0],
    landmarks[5],
    landmarks[9],
    landmarks[13],
    landmarks[17],
  ])

  const palmWidth = distance3(landmarks[5], landmarks[17]) + 1e-4
  const indexExtension = distance3(wrist, indexTip) / palmWidth
  const middleExtension = distance3(wrist, middleTip) / palmWidth
  const ringExtension = distance3(wrist, ringTip) / palmWidth
  const pinkyExtension = distance3(wrist, pinkyTip) / palmWidth

  const openness =
    (indexExtension + middleExtension + ringExtension + pinkyExtension) / 4
  const pinchDistance = distance3(thumbTip, indexTip) / palmWidth

  const handedness = result.handedness[0]?.[0]

  const frame: HandFrame = {
    timestamp,
    landmarks,
    palmCenter,
    wrist,
    indexTip,
    thumbTip,
    pointer: {
      x: 1 - indexTip.x,
      y: indexTip.y,
    },
    pinchDistance,
    openness,
    fingerExtensions: {
      index: indexExtension,
      middle: middleExtension,
      ring: ringExtension,
      pinky: pinkyExtension,
    },
    handedness:
      handedness?.categoryName === 'Left' || handedness?.categoryName === 'Right'
        ? handedness.categoryName
        : 'Unknown',
    confidence: handedness?.score ?? 0.75,
  }

  return { frame, smoothedLandmarks: landmarks }
}

export const useHandTracking = (enabled = true): UseHandTrackingResult => {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const detectorRef = useRef<HandLandmarker | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const frameLoopRef = useRef<number | null>(null)
  const previousLandmarksRef = useRef<Vec3[] | null>(null)
  const lastDetectionTimeRef = useRef(0)

  const fpsWindowRef = useRef({
    firstTimestamp: 0,
    sampleCount: 0,
  })

  const [frame, setFrame] = useState<HandFrame | null>(null)
  const [status, setStatus] = useState<UseHandTrackingResult['status']>('loading')
  const [fps, setFps] = useState(0)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const stopResources = () => {
      if (frameLoopRef.current !== null) {
        cancelAnimationFrame(frameLoopRef.current)
      }
      frameLoopRef.current = null
      detectorRef.current?.close()
      detectorRef.current = null
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
      previousLandmarksRef.current = null
      lastDetectionTimeRef.current = 0
      fpsWindowRef.current = {
        firstTimestamp: 0,
        sampleCount: 0,
      }
    }

    if (!enabled) {
      stopResources()
      setFrame(null)
      setFps(0)
      setError(null)
      setStatus('ready')
      return stopResources
    }

    const updateFps = (timestamp: number) => {
      const window = fpsWindowRef.current
      if (!window.firstTimestamp) {
        window.firstTimestamp = timestamp
      }
      window.sampleCount += 1
      const elapsed = timestamp - window.firstTimestamp
      if (elapsed >= 1000) {
        setFps(Math.round((window.sampleCount * 1000) / elapsed))
        window.firstTimestamp = timestamp
        window.sampleCount = 0
      }
    }

    const startLoop = () => {
      const tick = (timestamp: number) => {
        if (cancelled) {
          return
        }

        const videoElement = videoRef.current
        const detector = detectorRef.current

        if (
          videoElement &&
          detector &&
          videoElement.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA
        ) {
          if (timestamp - lastDetectionTimeRef.current >= 1000 / TARGET_DETECTION_FPS) {
            lastDetectionTimeRef.current = timestamp
            const result = detector.detectForVideo(videoElement, timestamp)
            const derived = deriveFrame(
              result,
              timestamp,
              previousLandmarksRef.current,
            )
            previousLandmarksRef.current = derived.smoothedLandmarks
            setFrame(derived.frame)
            updateFps(timestamp)
          }
        }

        frameLoopRef.current = requestAnimationFrame(tick)
      }

      frameLoopRef.current = requestAnimationFrame(tick)
    }

    const setup = async () => {
      try {
        setStatus('loading')
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 960 },
            height: { ideal: 540 },
            facingMode: 'user',
          },
          audio: false,
        })

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }

        streamRef.current = stream

        if (!videoRef.current) {
          return
        }

        videoRef.current.srcObject = stream
        await videoRef.current.play()

        const vision = await FilesetResolver.forVisionTasks(WASM_BASE_PATH)
        const detector = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: MODEL_ASSET_PATH,
          },
          runningMode: 'VIDEO',
          numHands: 1,
          minHandDetectionConfidence: 0.65,
          minHandPresenceConfidence: 0.6,
          minTrackingConfidence: 0.65,
        })

        if (cancelled) {
          detector.close()
          return
        }

        detectorRef.current = detector
        setStatus('ready')
        startLoop()
        setStatus('running')
      } catch (setupError) {
        const fallback =
          setupError instanceof Error
            ? setupError.message
            : 'Unable to initialize hand tracking.'
        setError(fallback)
        setStatus('error')
      }
    }

    setup()

    return () => {
      cancelled = true
      stopResources()
    }
  }, [enabled])

  return {
    frame,
    status,
    fps,
    error,
    videoRef,
  }
}
