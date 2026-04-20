import { VOCABULARY_WORDS } from './data/vocabulary'
import { useGestureEngine } from './modules/gestureEngine/useGestureEngine'
import { useHandTracking } from './modules/handTracking/useHandTracking'
import { useInteractionController } from './modules/interaction/useInteractionController'
import { VisualSystem } from './visual/VisualSystem'

const App = () => {
  const handTracking = useHandTracking()
  const gestures = useGestureEngine(handTracking.frame)
  const interaction = useInteractionController(gestures, VOCABULARY_WORDS)

  return (
    <VisualSystem
      interaction={interaction}
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
