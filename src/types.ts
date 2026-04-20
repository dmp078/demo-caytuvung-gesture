export type Vec2 = {
  x: number
  y: number
}

export type Vec3 = {
  x: number
  y: number
  z: number
}

export type Handedness = 'Left' | 'Right' | 'Unknown'

export type FingerExtensions = {
  index: number
  middle: number
  ring: number
  pinky: number
}

export type HandFrame = {
  timestamp: number
  landmarks: Vec3[]
  palmCenter: Vec3
  wrist: Vec3
  indexTip: Vec3
  thumbTip: Vec3
  pointer: Vec2
  pinchDistance: number
  openness: number
  fingerExtensions: FingerExtensions
  handedness: Handedness
  confidence: number
}

export type GesturePhase = 'idle' | 'start' | 'hold' | 'end'

export type GestureState = {
  active: boolean
  phase: GesturePhase
  strength: number
}

export type SwipeDirection = 'left' | 'right' | 'up'

export type SwipeEvent = {
  id: number
  direction: SwipeDirection
  velocity: number
  timestamp: number
}

export type GestureSnapshot = {
  hasHand: boolean
  frame: HandFrame | null
  pointer: Vec2
  pointerVelocity: Vec2
  stability: number
  openPalm: GestureState
  pinch: GestureState
  point: GestureState
  swipeEvent: SwipeEvent | null
}

export type WordNode = {
  id: string
  word: string
  meaning: string
  example: string
  pronunciation: string
  icon: string
}

export type DetailMode = 'meaning' | 'example' | 'pronunciation'

export type DemoPhase =
  | 'awaiting_hand'
  | 'summoning'
  | 'orbit'
  | 'detail'
  | 'quiz'
  | 'finale'

export type FinaleStep = 'collapsing' | 'opening' | 'revealed'

export type QuizOption = {
  id: string
  label: string
  isCorrect: boolean
}

export type QuizState = {
  promptWordId: string | null
  options: QuizOption[]
  hoveredOptionId: string | null
  selectedOptionId: string | null
  answerResult: 'correct' | 'wrong' | null
}

export type InteractionState = {
  phase: DemoPhase
  detailMode: DetailMode
  selectedWordId: string | null
  hoveredWordId: string | null
  reticleWorld: Vec3
  anchorWorld: Vec3
  modeTransitionDirection: SwipeDirection | null
  interactionCount: number
  quiz: QuizState
  finaleStep: FinaleStep | null
  headline: string
}

export type UseHandTrackingResult = {
  frame: HandFrame | null
  status: 'loading' | 'ready' | 'running' | 'error'
  fps: number
  error: string | null
  videoRef: RefObject<HTMLVideoElement | null>
}
import type { RefObject } from 'react'
