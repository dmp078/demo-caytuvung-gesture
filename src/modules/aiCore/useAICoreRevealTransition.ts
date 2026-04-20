import { useEffect, useState } from 'react'
import type { AICorePhase, AICoreRevealStep } from '../../types'

const COLLAPSE_MS = 1500
const UNFOLD_MS = 1400

type UseAICoreRevealTransitionArgs = {
  phase: AICorePhase
  enabled: boolean
}

export const useAICoreRevealTransition = ({
  phase,
  enabled,
}: UseAICoreRevealTransitionArgs) => {
  const [step, setStep] = useState<AICoreRevealStep | null>(null)

  useEffect(() => {
    if (!enabled) {
      setStep(null)
      return
    }

    if (phase !== 'reveal') {
      setStep(null)
      return
    }

    setStep('collapsing')
    const unfoldTimeout = window.setTimeout(() => setStep('unfolding'), COLLAPSE_MS)
    const readyTimeout = window.setTimeout(
      () => setStep('ready'),
      COLLAPSE_MS + UNFOLD_MS,
    )

    return () => {
      window.clearTimeout(unfoldTimeout)
      window.clearTimeout(readyTimeout)
    }
  }, [enabled, phase])

  return {
    step,
    ctaUnlocked: step === 'ready',
  }
}
