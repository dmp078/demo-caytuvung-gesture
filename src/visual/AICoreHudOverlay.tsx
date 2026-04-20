import { useMemo } from 'react'
import type {
  AICoreSceneController,
  GestureSnapshot,
  WordNode,
} from '../types'

type AICoreHudOverlayProps = {
  core: AICoreSceneController
  words: WordNode[]
  gestures: GestureSnapshot
  trackingFps: number
  trackingStatus: string
  trackingError: string | null
  onEnterPlatform: () => void
}

const phaseDescription = {
  boot: 'Boot sequence preparing reactor shell.',
  formation: 'Energy shell assembly and orbit ring calibration.',
  scan: 'Symbolic environment scan and cognitive handshake.',
  interaction: 'Focus the core, click or pinch to engage.',
  opening: 'Mechanical layer separation in progress.',
  expansion: 'Explore vocabulary nodes to expand memory pathways.',
  reveal: 'Upgrade gateway forging your final platform reveal.',
}

export const AICoreHudOverlay = ({
  core,
  words,
  gestures,
  trackingFps,
  trackingStatus,
  trackingError,
  onEnterPlatform,
}: AICoreHudOverlayProps) => {
  const selectedWord = useMemo(
    () => words.find((word) => word.id === core.state.selectedNodeId) ?? null,
    [core.state.selectedNodeId, words],
  )

  const exploredCount = core.state.exploredNodeIds.length

  return (
    <div className="hud-root core-mode">
      <header className="hud-topbar">
        <div className="hud-brand">
          <span className="dot" /> AI Core: Cognitive Upgrade System
        </div>
        <div className="hud-readout">
          <span>Tracking: {trackingStatus}</span>
          <span>Detect FPS: {trackingFps || '--'}</span>
          <span>Core Link: {(core.state.knowledgeProgress * 100).toFixed(0)}%</span>
        </div>
      </header>

      <div className="hud-headline">{core.state.headline}</div>
      <div className="core-subline">{core.state.systemLine}</div>

      {trackingError && <div className="hud-error">Camera error: {trackingError}</div>}

      {core.state.phase !== 'reveal' && (
        <section className="core-status-panel">
          <div className="panel-title">System Status</div>
          <h3>{phaseDescription[core.state.phase]}</h3>
          <div className="core-metrics">
            <span>Core engagements: {core.state.coreEngagement}</span>
            <span>Knowledge nodes explored: {exploredCount}</span>
            <span>Gesture stability: {(gestures.stability * 100).toFixed(0)}%</span>
          </div>
          {core.state.phase === 'interaction' && (
            <div className="core-inline-actions">
              <button
                type="button"
                className="hud-pill-button"
                onClick={() => core.actions.requestCoreOpening()}
              >
                OPEN CORE CHAMBER
              </button>
            </div>
          )}
          {core.state.phase === 'expansion' && (
            <div className="core-inline-actions">
              <button
                type="button"
                className="hud-pill-button"
                onClick={() => core.actions.requestReveal()}
              >
                SYNCHRONIZE TO REVEAL
              </button>
            </div>
          )}
        </section>
      )}

      {selectedWord && (core.state.phase === 'expansion' || core.state.phase === 'reveal') && (
        <section className="core-node-panel">
          <div className="panel-title">Vocabulary Node</div>
          <h3>
            {selectedWord.word} <span>{selectedWord.pronunciation}</span>
          </h3>
          <p>{selectedWord.meaning}</p>
          <p className="node-example">Example: {selectedWord.example}</p>
          <div className="core-inline-actions">
            <button
              type="button"
              className="hud-pill-button secondary"
              onClick={() => core.actions.clearSelectedNode()}
            >
              CLOSE NODE
            </button>
          </div>
        </section>
      )}

      {core.state.phase === 'reveal' && core.state.ctaUnlocked && (
        <section className="core-reveal-panel">
          <div className="panel-title">Platform Gateway</div>
          <h3>The full vocabulary intelligence platform is now unlocked.</h3>
          <div className="site-preview">
            <div className="preview-header">Neural Learning Platform</div>
            <div className="preview-body">
              Adaptive lessons, real-time speaking drills, and cinematic vocabulary interactions.
            </div>
          </div>
          <div className="core-inline-actions">
            <button type="button" className="hud-pill-button" onClick={onEnterPlatform}>
              ENTER PLATFORM
            </button>
            <button type="button" className="hud-pill-button secondary" onClick={onEnterPlatform}>
              START LEARNING
            </button>
          </div>
        </section>
      )}

      <footer className="hud-footer">
        <span>Click core: engage</span>
        <span>Pinch (optional): engage</span>
        <span>Select node: inspect knowledge</span>
        <span>System online: {trackingStatus === 'running' ? 'yes' : 'partial'}</span>
      </footer>
    </div>
  )
}
