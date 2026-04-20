import { useEffect, useMemo, useState } from 'react'
import type { GestureSnapshot, InteractionState, WordNode } from '../types'

type HudOverlayProps = {
  interaction: InteractionState
  gestures: GestureSnapshot
  words: WordNode[]
  trackingFps: number
  trackingStatus: string
  trackingError: string | null
}

const formatModeLabel = (mode: InteractionState['detailMode']) =>
  mode === 'meaning' ? 'Meaning Stream' : mode === 'example' ? 'Example Stream' : 'Pronunciation Stream'

export const HudOverlay = ({
  interaction,
  gestures,
  words,
  trackingFps,
  trackingStatus,
  trackingError,
}: HudOverlayProps) => {
  const selectedWord = useMemo(
    () => words.find((word) => word.id === interaction.selectedWordId) ?? null,
    [interaction.selectedWordId, words],
  )

  const detailBody = useMemo(() => {
    if (!selectedWord) {
      return ''
    }

    if (interaction.detailMode === 'meaning') {
      return selectedWord.meaning
    }

    if (interaction.detailMode === 'example') {
      return selectedWord.example
    }

    return selectedWord.pronunciation
  }, [interaction.detailMode, selectedWord])

  const [typedDetail, setTypedDetail] = useState('')
  const isLaunchGatewayWord = Boolean(selectedWord?.launchUrl)
  const pinchStrengthPercent = Math.round(gestures.pinch.strength * 100)
  const openPalmStrengthPercent = Math.round(gestures.openPalm.strength * 100)

  useEffect(() => {
    setTypedDetail('')
    if (!detailBody) {
      return
    }

    let index = 0
    const interval = window.setInterval(() => {
      index += 1
      setTypedDetail(detailBody.slice(0, index))
      if (index >= detailBody.length) {
        window.clearInterval(interval)
      }
    }, 14)

    return () => window.clearInterval(interval)
  }, [detailBody])

  const transitionClass = interaction.modeTransitionDirection
    ? `transition-${interaction.modeTransitionDirection}`
    : ''

  return (
    <div className="hud-root">
      <header className="hud-topbar">
        <div className="hud-brand">
          <span className="dot" /> AI Vocabulary Hologram
        </div>
        <div className="hud-readout">
          <span>Tracking: {trackingStatus}</span>
          <span>Detect FPS: {trackingFps || '--'}</span>
          <span>Render: 60 FPS target</span>
        </div>
      </header>

      <div className="hud-headline">{interaction.headline}</div>

      {trackingError && <div className="hud-error">Camera error: {trackingError}</div>}

      {interaction.phase === 'detail' && selectedWord && (
        <section className={`detail-panel ${transitionClass}`}>
          <div className="panel-title">{formatModeLabel(interaction.detailMode)}</div>
          <h2>
            {selectedWord.word} <span>{selectedWord.pronunciation}</span>
          </h2>
          <p>{typedDetail}</p>
          {isLaunchGatewayWord && (
            <p className="gateway-tip">
              Gateway armed. Pinch once or hold open palm for 1.2s to open Cày Từ Vựng.
            </p>
          )}
          <div className="panel-footer">
            {!isLaunchGatewayWord && <span>Pinch: open quiz now</span>}
            {!isLaunchGatewayWord && <span>Swipe up: quiz mode</span>}
            {!isLaunchGatewayWord && <span>Hold open palm 1.2s: quiz mode</span>}
            {!isLaunchGatewayWord && <span>Auto quiz after 2.2s</span>}
            <span>Swipe left/right: switch panel</span>
            {isLaunchGatewayWord && <span>Pinch OR hold open palm 1.2s: open platform</span>}
          </div>
        </section>
      )}

      {interaction.phase === 'quiz' && selectedWord && (
        <section className="quiz-panel">
          <div className="panel-title">Gesture Quiz Protocol</div>
          <h3>Pick the correct meaning for: {selectedWord.word}</h3>
          <p>Aim a quiz node, then pinch or hold open palm for 1.2s to lock your answer.</p>
          <div className="quiz-options">
            {interaction.quiz.options.map((option, index) => {
              const isHovered = interaction.quiz.hoveredOptionId === option.id
              const isSelected = interaction.quiz.selectedOptionId === option.id
              const showCorrect =
                interaction.quiz.answerResult === 'wrong' && option.isCorrect
              const isWrongPick =
                isSelected && interaction.quiz.answerResult === 'wrong'

              const classes = [
                'quiz-option',
                isHovered ? 'hovered' : '',
                isSelected ? 'selected' : '',
                showCorrect ? 'correct' : '',
                isWrongPick ? 'wrong' : '',
              ]
                .filter(Boolean)
                .join(' ')

              return (
                <div key={option.id} className={classes}>
                  <span className="quiz-option-index">
                    {String.fromCharCode(65 + index)}
                  </span>
                  <span>{option.label}</span>
                </div>
              )
            })}
          </div>
          {interaction.quiz.answerResult === 'correct' && (
            <p className="quiz-result correct">Correct lock acquired.</p>
          )}
          {interaction.quiz.answerResult === 'wrong' && (
            <p className="quiz-result wrong">Incorrect lock. Correct node is now highlighted.</p>
          )}
        </section>
      )}

      {interaction.phase === 'orbit' && (
        <section className="orbit-tip">
          <p>Aim at an item in the menu lane.</p>
          <p>Swipe left/right to browse menu, then hold open palm for 3 seconds to select.</p>
        </section>
      )}

      {interaction.phase === 'summoning' && (
        <section className="summon-tip">
          <p>Hologram lattice is forming around your palm.</p>
        </section>
      )}

      {interaction.phase === 'finale' && interaction.finaleStep === 'revealed' && (
        <section className="finale-panel">
          <div className="panel-title">Knowledge Core Unlocked</div>
          <h3>Unlock the full experience</h3>
          <div className="site-preview">
            <div className="preview-header">Cày Từ Vựng Platform</div>
            <div className="preview-body">
              Adaptive lessons, spaced repetition, and real-time speaking drills.
            </div>
          </div>
          <a
            className="start-button"
            href="https://caytuvung.site"
            target="_blank"
            rel="noreferrer"
          >
            Vào Cày Từ Vựng
          </a>
        </section>
      )}

      <footer className="hud-footer">
        <span>Open Palm: summon</span>
        <span>Hold open palm 3s: select focused item</span>
        <span>Pinch: select / confirm</span>
        <span>Swipe orbit: next / prev item</span>
        <span>Swipe detail: mode switch</span>
        <span>Pinch power: {pinchStrengthPercent}%</span>
        <span>Palm power: {openPalmStrengthPercent}%</span>
        <span>Gesture stability: {(gestures.stability * 100).toFixed(0)}%</span>
      </footer>
    </div>
  )
}
