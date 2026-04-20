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
const OPEN_PALM_SELECT_HOLD_MS = 3000
const OPEN_PALM_SELECT_COOLDOWN_MS = 650
const QUIZ_OPEN_PALM_HOLD_MS = 1200
const QUIZ_SELECT_COOLDOWN_MS = 800
const DETAIL_TO_QUIZ_HOLD_MS = 1200
const DETAIL_TO_QUIZ_AUTO_MS = 2200
const QUIZ_HOVER_DISTANCE = 1.05
const PLATFORM_LAUNCH_HOLD_MS = 1200
const PLATFORM_LAUNCH_COOLDOWN_MS = 1400

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
  orbit: 'Swipe left/right to browse menu. Hold open palm for 3s to select.',
  detail: 'Swipe left/right/up, pinch, or hold open palm to enter quiz.',
  quiz: 'Hover an answer, then pinch or hold open palm to confirm.',
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
  const openPalmSelectSinceRef = useRef(0)
  const lastOpenPalmSelectAtRef = useRef(0)
  const detailQuizHoldSinceRef = useRef(0)
  const quizHoverSinceRef = useRef(0)
  const lastQuizSelectAtRef = useRef(0)
  const autoQuizReadyRef = useRef(false)
  const detailStartedAtRef = useRef(0)
  const platformLaunchHoldSinceRef = useRef(0)
  const lastPlatformLaunchAtRef = useRef(0)
  const pendingLaunchUrlRef = useRef<string | null>(null)
  const successAlertShownRef = useRef(false)
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
        previous.phase === 'awaiting_hand'
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

        const hoveredWordId = hoveredWord && hoveredWord.distance < 0.78 ? hoveredWord.id : null
        next.hoveredWordId = hoveredWordId

        const focusedWordId = words[next.orbitFocusIndex]?.id ?? null
        const selectionCandidateId = hoveredWordId ?? focusedWordId
        const openPalmHoldActive =
          gestures.openPalm.active && gestures.openPalm.strength > 0.46

        if (openPalmHoldActive) {
          if (openPalmSelectSinceRef.current === 0) {
            openPalmSelectSinceRef.current = now
          }
        } else {
          openPalmSelectSinceRef.current = 0
        }

        const canOpenPalmSelect =
          Boolean(selectionCandidateId) &&
          openPalmHoldActive &&
          openPalmSelectSinceRef.current > 0 &&
          now - openPalmSelectSinceRef.current >= OPEN_PALM_SELECT_HOLD_MS &&
          now - lastOpenPalmSelectAtRef.current >= OPEN_PALM_SELECT_COOLDOWN_MS

        if (
          ((gestures.pinch.phase === 'start' ||
            (gestures.pinch.active && gestures.pinch.strength > 0.68)) ||
            canOpenPalmSelect) &&
          selectionCandidateId
        ) {
          next.selectedWordId = selectionCandidateId
          const selectedIndex = words.findIndex((word) => word.id === selectionCandidateId)
          if (selectedIndex >= 0) {
            next.orbitFocusIndex = selectedIndex
          }
          next.phase = 'detail'
          next.detailMode = 'meaning'
          next.interactionCount += 1
          milestonesRef.current.selectedWord = true
          openPalmSelectSinceRef.current = 0
          lastOpenPalmSelectAtRef.current = now
          autoQuizReadyRef.current = true
          detailStartedAtRef.current = now
        }
      }

      if (next.phase === 'detail') {
        const detailOpenPalmActive =
          gestures.openPalm.active && gestures.openPalm.strength > 0.46

        if (detailOpenPalmActive) {
          if (detailQuizHoldSinceRef.current === 0) {
            detailQuizHoldSinceRef.current = now
          }
        } else {
          detailQuizHoldSinceRef.current = 0
        }

        const shouldOpenQuizByHold =
          detailOpenPalmActive &&
          detailQuizHoldSinceRef.current > 0 &&
          now - detailQuizHoldSinceRef.current >= DETAIL_TO_QUIZ_HOLD_MS
        const shouldOpenQuizByPinch = gestures.pinch.phase === 'start'
        const selectedWord = next.selectedWordId
          ? words.find((word) => word.id === next.selectedWordId)
          : null
        const isLaunchGatewayWord = Boolean(selectedWord?.launchUrl)
        const launchOpenPalmActive =
          isLaunchGatewayWord && gestures.openPalm.active && gestures.openPalm.strength > 0.5

        if (launchOpenPalmActive) {
          if (platformLaunchHoldSinceRef.current === 0) {
            platformLaunchHoldSinceRef.current = now
          }
        } else {
          platformLaunchHoldSinceRef.current = 0
        }

        const shouldLaunchByHold =
          isLaunchGatewayWord &&
          launchOpenPalmActive &&
          platformLaunchHoldSinceRef.current > 0 &&
          now - platformLaunchHoldSinceRef.current >= PLATFORM_LAUNCH_HOLD_MS &&
          now - lastPlatformLaunchAtRef.current >= PLATFORM_LAUNCH_COOLDOWN_MS

        const shouldLaunchByPinch =
          isLaunchGatewayWord &&
          gestures.pinch.phase === 'start' &&
          now - lastPlatformLaunchAtRef.current >= PLATFORM_LAUNCH_COOLDOWN_MS

        const shouldAutoOpenQuiz =
          autoQuizReadyRef.current &&
          detailStartedAtRef.current > 0 &&
          now - detailStartedAtRef.current >= DETAIL_TO_QUIZ_AUTO_MS &&
          Boolean(next.selectedWordId) &&
          !selectedWord?.launchUrl

        if (gestures.swipeEvent) {
          if (gestures.swipeEvent.direction === 'left') {
            next.detailMode = 'meaning'
            next.modeTransitionDirection = 'left'
          }

          if (gestures.swipeEvent.direction === 'right') {
            next.detailMode = 'example'
            next.modeTransitionDirection = 'right'
          }

          if (gestures.swipeEvent.direction === 'up' && next.selectedWordId && !selectedWord?.launchUrl) {
            next.phase = 'quiz'
            next.modeTransitionDirection = 'up'
            next.quiz = createQuizForWord(words, next.selectedWordId)
            detailQuizHoldSinceRef.current = 0
          }

          next.interactionCount += 1
          milestonesRef.current.swipedMode = true
        }

        if (next.phase === 'detail' && (shouldLaunchByHold || shouldLaunchByPinch) && selectedWord?.launchUrl) {
          pendingLaunchUrlRef.current = selectedWord.launchUrl
          lastPlatformLaunchAtRef.current = now
          platformLaunchHoldSinceRef.current = 0
          next.interactionCount += 1
        }

        if (
          next.phase === 'detail' &&
          shouldOpenQuizByHold &&
          next.selectedWordId &&
          !selectedWord?.launchUrl
        ) {
          next.phase = 'quiz'
          next.modeTransitionDirection = 'up'
          next.quiz = createQuizForWord(words, next.selectedWordId)
          next.interactionCount += 1
          detailQuizHoldSinceRef.current = 0
          autoQuizReadyRef.current = false
        }

        if (
          next.phase === 'detail' &&
          shouldOpenQuizByPinch &&
          next.selectedWordId &&
          !selectedWord?.launchUrl
        ) {
          next.phase = 'quiz'
          next.modeTransitionDirection = 'up'
          next.quiz = createQuizForWord(words, next.selectedWordId)
          next.interactionCount += 1
          detailQuizHoldSinceRef.current = 0
          autoQuizReadyRef.current = false
        }

        if (next.phase === 'detail' && shouldAutoOpenQuiz && next.selectedWordId) {
          next.phase = 'quiz'
          next.modeTransitionDirection = 'up'
          next.quiz = createQuizForWord(words, next.selectedWordId)
          next.interactionCount += 1
          autoQuizReadyRef.current = false
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
          hoveredOption && hoveredOption.distance < QUIZ_HOVER_DISTANCE ? hoveredOption.id : null
        if (hoveredQuizOptionId !== next.quiz.hoveredOptionId) {
          quizHoverSinceRef.current = now
        }

        next.quiz = {
          ...next.quiz,
          hoveredOptionId: hoveredQuizOptionId,
        }

        const openPalmQuizActive =
          gestures.openPalm.active && gestures.openPalm.strength > 0.46
        const canOpenPalmQuizSelect =
          Boolean(hoveredQuizOptionId) &&
          openPalmQuizActive &&
          now - quizHoverSinceRef.current >= QUIZ_OPEN_PALM_HOLD_MS &&
          now - lastQuizSelectAtRef.current >= QUIZ_SELECT_COOLDOWN_MS

        if (
          ((gestures.pinch.phase === 'start' ||
            (gestures.pinch.active && gestures.pinch.strength > 0.72)) ||
            canOpenPalmQuizSelect) &&
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
            lastQuizSelectAtRef.current = now
          }
        }

        if (
          next.quiz.selectedOptionId &&
          now - quizAnsweredAtRef.current >= QUIZ_FEEDBACK_DURATION_MS
        ) {
          next.phase = 'detail'
          next.detailMode = 'example'
          next.quiz = createEmptyQuiz()
          autoQuizReadyRef.current = false
        }

        if (gestures.swipeEvent?.direction === 'left' || gestures.swipeEvent?.direction === 'right') {
          next.phase = 'detail'
          next.quiz = createEmptyQuiz()
          next.modeTransitionDirection = gestures.swipeEvent.direction
          autoQuizReadyRef.current = false
        }
      }

      if (allMilestonesCompleted(milestonesRef.current) && next.interactionCount >= 6) {
        finaleStartedAtRef.current = now
        next.phase = 'finale'
        next.finaleStep = 'collapsing'
      }

      next.headline = headlineByPhase[next.phase]
      if (next.phase === 'detail') {
        const detailWord = next.selectedWordId
          ? words.find((word) => word.id === next.selectedWordId)
          : null
        if (detailWord?.launchUrl) {
          next.headline = 'CAY TU VUNG gateway ready. Pinch or hold open palm to launch.'
        }
      }
      return next
    })
  }, [gestures, words])

  useEffect(() => {
    if (
      state.phase === 'awaiting_hand' ||
      state.phase === 'summoning' ||
      state.phase === 'orbit'
    ) {
      detailQuizHoldSinceRef.current = 0
      autoQuizReadyRef.current = false
      detailStartedAtRef.current = 0
      platformLaunchHoldSinceRef.current = 0
    }
  }, [state.phase])

  useEffect(() => {
    if (!pendingLaunchUrlRef.current) {
      return
    }

    const launchUrl = pendingLaunchUrlRef.current
    pendingLaunchUrlRef.current = null
    window.open(launchUrl, '_blank', 'noopener,noreferrer')
  }, [state.interactionCount])

  useEffect(() => {
    if (state.phase !== 'quiz' || state.quiz.answerResult !== 'correct') {
      successAlertShownRef.current = false
      return
    }

    if (successAlertShownRef.current) {
      return
    }

    successAlertShownRef.current = true
    window.alert(
      'Bạn đã chinh phục được giải ngân hà, muốn chinh phục thêm? Hãy vào Cày Từ Vựng!',
    )
  }, [state.phase, state.quiz.answerResult])

  return state
}
