import { EXPERIENCE_MODES } from '../data/experienceModes'
import type { ExperienceModeId } from '../types'

type ModeSwitcherProps = {
  activeMode: ExperienceModeId
  onModeChange: (mode: ExperienceModeId) => void
}

export const ModeSwitcher = ({ activeMode, onModeChange }: ModeSwitcherProps) => (
  <div className="mode-switcher">
    <div className="mode-switcher-title">Showcase Modes</div>
    <div className="mode-switcher-list">
      {EXPERIENCE_MODES.map((mode) => {
        const selected = mode.id === activeMode
        return (
          <button
            key={mode.id}
            type="button"
            className={`mode-switcher-item ${selected ? 'active' : ''}`}
            onClick={() => onModeChange(mode.id)}
          >
            <span className="mode-dot" style={{ background: mode.accent }} />
            <span className="mode-copy">
              <strong>{mode.title}</strong>
              <span>{mode.subtitle}</span>
            </span>
          </button>
        )
      })}
    </div>
  </div>
)
