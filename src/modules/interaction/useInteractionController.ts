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
const SUMMON_DURATION_MS = 900
const QUIZ_FEEDBACK_DURATION_MS = 1300
const FINALE_COLLAPSE_MS = 1500
const FINALE_OPEN_MS = 1200
const DIRECT_WORD_SELECT_DWELL_MS = 280
const DIRECT_QUIZ_SELECT_DWELL_MS = 320
const DIRECT_SELECT_COOLDOWN_MS = 420

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
  orbit: 'Swipe left/right to browse menu, pinch to open',
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
const centerBiasTarget = (pointerX: number, pointerY: number) =>
  pointerToWorld(
    0.5 + (pointerX - 0.5) * 0.18,
    0.5 + (pointerY - 0.5) * 0.18,
  )

export const useInteractionController = (
  gestures: GestureSnapshot,
  words: WordNode[],
): InteractionState => {
  const [state, setState] = useState<InteractionState>({
    phase: 'awaiting_hand',
    detailMode: 'meaning',
    orbitFocusIndex: 0,
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
  const hoveredWordSinceRef = useRef(0)
  const hoveredQuizSinceRef = useRef(0)
  const lastDirectSelectAtRef = useRef(0)
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
    const anchorTarget = centerBiasTarget(gestures.pointer.x, gestures.pointer.y)
    anchorRef.current = lerpVec3(anchorRef.current, anchorTarget, gestures.hasHand ? 0.12 : 0.06)

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
        if (gestures.swipeEvent?.direction === 'left') {
          next.orbitFocusIndex = (previous.orbitFocusIndex + 1 + words.length) % words.length
          next.interactionCount += 1
        } else if (gestures.swipeEvent?.direction === 'right') {
          next.orbitFocusIndex = (previous.orbitFocusIndex - 1 + words.length) % words.length
          next.interactionCount += 1
        } else {
          next.orbitFocusIndex = previous.orbitFocusIndex
        }

        const elapsedSeconds = now / 1000
        const hoveredWord = words
          .map((word, index) => ({
            id: word.id,
            distance: distance3(
              next.reticleWorld,
              orbitNodePosition(
                index,
                words.length,
                elapsedSeconds,
                next.anchorWorld,
                next.orbitFocusIndex,
              ),
            ),
          }))
          .sort((left, right) => left.distance - right.distance)[0]

        const hoveredWordId = hoveredWord && hoveredWord.distance < 0.58 ? hoveredWord.id : null
        if (hoveredWordId !== previous.hoveredWordId) {
          hoveredWordSinceRef.current = now
        }
        next.hoveredWordId = hoveredWordId

        const canDirectSelect =
          gestures.point.active &&
          hoveredWordId &&
          now - hoveredWordSinceRef.current >= DIRECT_WORD_SELECT_DWELL_MS &&
          now - lastDirectSelectAtRef.current >= DIRECT_SELECT_COOLDOWN_MS

        if (
          ((gestures.pinch.phase === 'start' ||
            (gestures.pinch.active && gestures.pinch.strength > 0.68)) ||
            canDirectSelect) &&
          hoveredWordId
        ) {
          next.selectedWordId = hoveredWordId
          const selectedIndex = words.findIndex((word) => word.id === hoveredWordId)
          if (selectedIndex >= 0) {
            next.orbitFocusIndex = selectedIndex
          }
          next.phase = 'detail'
          next.detailMode = 'meaning'
          next.interactionCount += 1
          milestonesRef.current.selectedWord = true
          lastDirectSelectAtRef.current = now
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

        const hoveredQuizOptionId =
          hoveredOption && hoveredOption.distance < 0.7 ? hoveredOption.id : null
        if (hoveredQuizOptionId !== next.quiz.hoveredOptionId) {
          hoveredQuizSinceRef.current = now
        }

        next.quiz = {
          ...next.quiz,
          hoveredOptionId: hoveredQuizOptionId,
        }

        const canDirectQuizSelect =
          gestures.point.active &&
          hoveredQuizOptionId &&
          now - hoveredQuizSinceRef.current >= DIRECT_QUIZ_SELECT_DWELL_MS &&
          now - lastDirectSelectAtRef.current >= DIRECT_SELECT_COOLDOWN_MS

        if (
          ((gestures.pinch.phase === 'start' ||
            (gestures.pinch.active && gestures.pinch.strength > 0.72)) ||
            canDirectQuizSelect) &&
          hoveredQuizOptionId &&
          !next.quiz.selectedOptionId
        ) {
          const selected = next.quiz.options.find((option) => option.id === hoveredQuizOptionId)

          if (selected) {
            quizAnsweredAtRef.current = now
            milestonesRef.current.quizAnswered = true
            next.interactionCount += 1
            next.quiz = {
              ...next.quiz,
              selectedOptionId: selected.id,
              answerResult: selected.isCorrect ? 'correct' : 'wrong',
            }
            lastDirectSelectAtRef.current = now
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
