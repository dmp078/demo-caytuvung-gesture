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
          <div className="panel-footer">
            <span>Pinch node: confirm</span>
            <span>Swipe left/right: switch panel</span>
            <span>Swipe up: quiz mode</span>
          </div>
        </section>
      )}

      {interaction.phase === 'quiz' && selectedWord && (
        <section className="quiz-panel">
          <div className="panel-title">Gesture Quiz Protocol</div>
          <h3>Pick the correct meaning for: {selectedWord.word}</h3>
          <p>Point to a node and pinch to lock your answer.</p>
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
          <p>Open palm to re-summon.</p>
          <p>Swipe left/right to browse the menu, then pinch or point-hold to open an item.</p>
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
            <div className="preview-header">Your Vocabulary Platform</div>
            <div className="preview-body">
              Adaptive lessons, spaced repetition, and real-time speaking drills.
            </div>
          </div>
          <a
            className="start-button"
            href="https://your-vocabulary-platform.example"
            target="_blank"
            rel="noreferrer"
          >
            Start Learning
          </a>
        </section>
      )}

      <footer className="hud-footer">
        <span>Open Palm: summon</span>
        <span>Pinch: select / confirm</span>
        <span>Swipe orbit: next / prev item</span>
        <span>Swipe detail: mode switch</span>
        <span>Point: hover quiz answer</span>
        <span>Gesture stability: {(gestures.stability * 100).toFixed(0)}%</span>
      </footer>
    </div>
  )
}
