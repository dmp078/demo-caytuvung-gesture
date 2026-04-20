import { Canvas } from '@react-three/fiber'
import type { RefObject } from 'react'
import type {
  AICoreSceneController,
  ExperienceModeId,
  GestureSnapshot,
  InteractionState,
  WordNode,
} from '../types'
import { AICoreHudOverlay } from './AICoreHudOverlay'
import { AICoreScene } from './AICoreScene'
import { HologramScene } from './HologramScene'
import { HudOverlay } from './HudOverlay'
import { ModeSwitcher } from './ModeSwitcher'

type VisualSystemProps = {
  activeMode: ExperienceModeId
  onModeChange: (mode: ExperienceModeId) => void
  interaction: InteractionState
  aiCore: AICoreSceneController
  gestures: GestureSnapshot
  words: WordNode[]
  trackingFps: number
  trackingStatus: string
  trackingError: string | null
  videoRef: RefObject<HTMLVideoElement | null>
}

export const VisualSystem = ({
  activeMode,
  onModeChange,
  interaction,
  aiCore,
  gestures,
  words,
  trackingFps,
  trackingStatus,
  trackingError,
  videoRef,
}: VisualSystemProps) => (
  <div className={`app-shell ${activeMode === 'ai_core_cognitive_upgrade' ? 'mode-core' : 'mode-hologram'}`}>
    <Canvas
      camera={{ position: [0, 0, 3.3], fov: 44, near: 0.1, far: 40 }}
      gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      dpr={[1, 1.5]}
      performance={{ min: 0.7 }}
    >
      {activeMode === 'vocabulary_hologram' ? (
        <HologramScene interaction={interaction} gestures={gestures} words={words} />
      ) : (
        <AICoreScene core={aiCore} words={words} />
      )}
    </Canvas>

    <ModeSwitcher activeMode={activeMode} onModeChange={onModeChange} />

    {activeMode === 'vocabulary_hologram' ? (
      <HudOverlay
        interaction={interaction}
        gestures={gestures}
        words={words}
        trackingFps={trackingFps}
        trackingStatus={trackingStatus}
        trackingError={trackingError}
      />
    ) : (
      <AICoreHudOverlay
        core={aiCore}
        words={words}
        gestures={gestures}
        trackingFps={trackingFps}
        trackingStatus={trackingStatus}
        trackingError={trackingError}
        onEnterPlatform={() => onModeChange('vocabulary_hologram')}
      />
    )}

    <video
      ref={videoRef}
      className={`camera-feed ${activeMode === 'ai_core_cognitive_upgrade' ? 'hidden' : ''}`}
      autoPlay
      muted
      playsInline
    />
    <div className="scanlines" />
    <div className="vignette" />
  </div>
)
