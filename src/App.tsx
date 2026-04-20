import { VOCABULARY_WORDS } from './data/vocabulary'
import { useAICoreSceneController } from './modules/aiCore/useAICoreSceneController'
import { useGestureEngine } from './modules/gestureEngine/useGestureEngine'
import { useHandTracking } from './modules/handTracking/useHandTracking'
import { useInteractionController } from './modules/interaction/useInteractionController'
import { useExperienceModeManager } from './modules/modeManager/useExperienceModeManager'
import { VisualSystem } from './visual/VisualSystem'

const App = () => {
  const modeManager = useExperienceModeManager()
  const handTracking = useHandTracking(
    modeManager.activeMode === 'vocabulary_hologram',
  )
  const gestures = useGestureEngine(handTracking.frame)
  const interaction = useInteractionController(gestures, VOCABULARY_WORDS)
  const aiCore = useAICoreSceneController({
    gestures,
    words: VOCABULARY_WORDS,
    enabled: modeManager.activeMode === 'ai_core_cognitive_upgrade',
  })

  return (
    <VisualSystem
      activeMode={modeManager.activeMode}
      onModeChange={modeManager.setMode}
      interaction={interaction}
      aiCore={aiCore}
      gestures={gestures}
      words={VOCABULARY_WORDS}
      trackingFps={handTracking.fps}
      trackingStatus={handTracking.status}
      trackingError={handTracking.error}
      videoRef={handTracking.videoRef}
    />
  )
}

export default App
