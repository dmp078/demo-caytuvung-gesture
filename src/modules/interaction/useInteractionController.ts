import { useEffect, useRef, useState } from 'react'
import type {
  GestureSnapshot,
  InteractionState,
  QuizOption,
  QuizState,
  WordNode,
} from '../../types'
import { distance3, lerpVec3 } from '../../utils/math'
import { orbitNodePosition, pointerToWorld, quizNodePositions } from '../../visual/layout'

const MODE_TRANSITION_DURATION_MS = 520
const SUMMON_DURATION_MS = 1500
const QUIZ_FEEDBACK_DURATION_MS = 1300
const FINALE_COLLAPSE_MS = 1500
const FINALE_OPEN_MS = 1200

const createEmptyQuiz = (): QuizState => ({
  promptWordId: null,
  options: [],
  hoveredOptionId: null,
  selectedOptionId: null,
  answerResult: null,
})

const shuffle = <T,>(items: T[]): T[] => {
  const array = [...items]
  for (let index = array.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1))
    ;[array[index], array[randomIndex]] = [array[randomIndex], array[index]]
  }
  return array
}

const createQuizForWord = (words: WordNode[], promptWordId: string): QuizState => {
  const promptWord = words.find((word) => word.id === promptWordId)
  if (!promptWord) {
    return createEmptyQuiz()
  }

  const distractors = shuffle(words.filter((word) => word.id !== promptWordId)).slice(0, 3)
  const options: QuizOption[] = shuffle([
    {
      id: `answer-${promptWord.id}`,
      label: promptWord.meaning,
      isCorrect: true,
    },
    ...distractors.map((word) => ({
      id: `answer-${word.id}`,
      label: word.meaning,
      isCorrect: false,
    })),
  ])

  return {
    promptWordId,
    options,
    hoveredOptionId: null,
    selectedOptionId: null,
    answerResult: null,
  }
}

const headlineByPhase: Record<InteractionState['phase'], string> = {
  awaiting_hand: 'Raise your hand to initialize the hologram',
  summoning: 'Energy core calibrating',
  orbit: 'Pinch a node to inspect vocabulary',
  detail: 'Swipe left/right/up to switch training modes',
  quiz: 'Point to an answer and pinch to confirm',
  finale: 'Knowledge core synchronized',
}

type Milestones = {
  summoned: boolean
  selectedWord: boolean
  swipedMode: boolean
  quizAnswered: boolean
}

const allMilestonesCompleted = (milestones: Milestones) =>
  milestones.summoned &&
  milestones.selectedWord &&
  milestones.swipedMode &&
  milestones.quizAnswered

const defaultWorld = pointerToWorld(0.5, 0.5)

export const useInteractionController = (
  gestures: GestureSnapshot,
  words: WordNode[],
): InteractionState => {
  const [state, setState] = useState<InteractionState>({
    phase: 'awaiting_hand',
    detailMode: 'meaning',
    selectedWordId: null,
    hoveredWordId: null,
    reticleWorld: defaultWorld,
    anchorWorld: defaultWorld,
    modeTransitionDirection: null,
    interactionCount: 0,
    quiz: createEmptyQuiz(),
    finaleStep: null,
    headline: headlineByPhase.awaiting_hand,
  })

  const summonStartedAtRef = useRef(0)
  const quizAnsweredAtRef = useRef(0)
  const finaleStartedAtRef = useRef(0)
  const milestonesRef = useRef<Milestones>({
    summoned: false,
    selectedWord: false,
    swipedMode: false,
    quizAnswered: false,
  })
  const anchorRef = useRef(defaultWorld)

  useEffect(() => {
    const frame = gestures.frame
    const now = frame?.timestamp ?? performance.now()

    const reticleTarget = pointerToWorld(gestures.pointer.x, gestures.pointer.y)
    anchorRef.current = lerpVec3(anchorRef.current, reticleTarget, gestures.hasHand ? 0.18 : 0.08)

    setState((previous) => {
      const next = {
        ...previous,
        reticleWorld: reticleTarget,
        anchorWorld: anchorRef.current,
        hoveredWordId: previous.hoveredWordId,
        headline: headlineByPhase[previous.phase],
      }

      if (previous.modeTransitionDirection && now % MODE_TRANSITION_DURATION_MS < 34) {
        next.modeTransitionDirection = null
      }

      if (previous.phase === 'finale') {
        const finaleElapsed = now - finaleStartedAtRef.current
        next.finaleStep =
          finaleElapsed < FINALE_COLLAPSE_MS
            ? 'collapsing'
            : finaleElapsed < FINALE_COLLAPSE_MS + FINALE_OPEN_MS
              ? 'opening'
              : 'revealed'
        next.headline = headlineByPhase.finale
        return next
      }

      if (
        gestures.openPalm.phase === 'start' &&
        (previous.phase === 'awaiting_hand' || previous.phase === 'orbit')
      ) {
        summonStartedAtRef.current = now
        milestonesRef.current.summoned = true
        next.phase = 'summoning'
        next.interactionCount += 1
      }

      if (previous.phase === 'summoning' || next.phase === 'summoning') {
        if (now - summonStartedAtRef.current >= SUMMON_DURATION_MS) {
          next.phase = 'orbit'
        }
      }

      if (next.phase === 'orbit') {
        const elapsedSeconds = now / 1000
        const hoveredWord = words
          .map((word, index) => ({
            id: word.id,
            distance: distance3(
              next.reticleWorld,
              orbitNodePosition(index, words.length, elapsedSeconds, next.anchorWorld),
            ),
          }))
          .sort((left, right) => left.distance - right.distance)[0]

        next.hoveredWordId = hoveredWord && hoveredWord.distance < 0.44 ? hoveredWord.id : null

        if (gestures.pinch.phase === 'start' && next.hoveredWordId) {
          next.selectedWordId = next.hoveredWordId
          next.phase = 'detail'
          next.detailMode = 'meaning'
          next.interactionCount += 1
          milestonesRef.current.selectedWord = true
        }
      }

      if (next.phase === 'detail') {
        if (gestures.swipeEvent) {
          if (gestures.swipeEvent.direction === 'left') {
            next.detailMode = 'meaning'
            next.modeTransitionDirection = 'left'
          }

          if (gestures.swipeEvent.direction === 'right') {
            next.detailMode = 'example'
            next.modeTransitionDirection = 'right'
          }

          if (gestures.swipeEvent.direction === 'up' && next.selectedWordId) {
            next.phase = 'quiz'
            next.modeTransitionDirection = 'up'
            next.quiz = createQuizForWord(words, next.selectedWordId)
          }

          next.interactionCount += 1
          milestonesRef.current.swipedMode = true
        }
      }

      if (next.phase === 'quiz') {
        const positions = quizNodePositions(next.anchorWorld)
        const hoveredOption = next.quiz.options
          .map((option, index) => ({
            id: option.id,
            distance: distance3(next.reticleWorld, positions[index]),
          }))
          .sort((left, right) => left.distance - right.distance)[0]

        if (gestures.point.active || gestures.pinch.active) {
          next.quiz = {
            ...next.quiz,
            hoveredOptionId:
              hoveredOption && hoveredOption.distance < 0.56 ? hoveredOption.id : null,
          }
        }

        if (
          gestures.pinch.phase === 'start' &&
          next.quiz.hoveredOptionId &&
          !next.quiz.selectedOptionId
        ) {
          const selected = next.quiz.options.find(
            (option) => option.id === next.quiz.hoveredOptionId,
          )

          if (selected) {
            quizAnsweredAtRef.current = now
            milestonesRef.current.quizAnswered = true
            next.interactionCount += 1
            next.quiz = {
              ...next.quiz,
              selectedOptionId: selected.id,
              answerResult: selected.isCorrect ? 'correct' : 'wrong',
            }
          }
        }

        if (
          next.quiz.selectedOptionId &&
          now - quizAnsweredAtRef.current >= QUIZ_FEEDBACK_DURATION_MS
        ) {
          next.phase = 'detail'
          next.detailMode = 'example'
          next.quiz = createEmptyQuiz()
        }

        if (gestures.swipeEvent?.direction === 'left' || gestures.swipeEvent?.direction === 'right') {
          next.phase = 'detail'
          next.quiz = createEmptyQuiz()
          next.modeTransitionDirection = gestures.swipeEvent.direction
        }
      }

      if (allMilestonesCompleted(milestonesRef.current) && next.interactionCount >= 6) {
        finaleStartedAtRef.current = now
        next.phase = 'finale'
        next.finaleStep = 'collapsing'
      }

      next.headline = headlineByPhase[next.phase]
      return next
    })
  }, [gestures, words])

  return state
}
