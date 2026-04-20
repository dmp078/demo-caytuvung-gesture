import { Canvas } from '@react-three/fiber'
import type { RefObject } from 'react'
import type { GestureSnapshot, InteractionState, WordNode } from '../types'
import { HologramScene } from './HologramScene'
import { HudOverlay } from './HudOverlay'

type VisualSystemProps = {
  interaction: InteractionState
  gestures: GestureSnapshot
  words: WordNode[]
  trackingFps: number
  trackingStatus: string
  trackingError: string | null
  videoRef: RefObject<HTMLVideoElement | null>
}

export const VisualSystem = ({
  interaction,
  gestures,
  words,
  trackingFps,
  trackingStatus,
  trackingError,
  videoRef,
}: VisualSystemProps) => (
  <div className="app-shell">
    <Canvas
      camera={{ position: [0, 0, 3.3], fov: 44, near: 0.1, far: 40 }}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      dpr={[1, 1.5]}
      performance={{ min: 0.7 }}
    >
      <HologramScene interaction={interaction} gestures={gestures} words={words} />
    </Canvas>

    <HudOverlay
      interaction={interaction}
      gestures={gestures}
      words={words}
      trackingFps={trackingFps}
      trackingStatus={trackingStatus}
      trackingError={trackingError}
    />

    <video ref={videoRef} className="camera-feed" autoPlay muted playsInline />
    <div className="scanlines" />
    <div className="vignette" />
  </div>
)
