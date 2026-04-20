import { useMemo } from 'react'
import type { AICoreSceneController, GestureSnapshot, WordNode } from '../../types'
import { clamp } from '../../utils/math'
import { useAICoreAnimationController } from './useAICoreAnimationController'
import { useAICoreInteractionController } from './useAICoreInteractionController'
import { useAICoreRevealTransition } from './useAICoreRevealTransition'

type UseAICoreSceneControllerArgs = {
  gestures: GestureSnapshot
  words: WordNode[]
  enabled: boolean
}

export const useAICoreSceneController = ({
  gestures,
  words,
  enabled,
}: UseAICoreSceneControllerArgs): AICoreSceneController => {
  const interaction = useAICoreInteractionController({ gestures, words, enabled })
  const animation = useAICoreAnimationController({
    enabled,
    openingRequestCount: interaction.state.openingRequestCount,
    revealRequestCount: interaction.state.revealRequestCount,
  })
  const reveal = useAICoreRevealTransition({
    enabled,
    phase: animation.phase,
  })

  const guardedActions: AICoreSceneController['actions'] = useMemo(() => {
    const canEngageCore =
      animation.phase === 'formation' ||
      animation.phase === 'scan' ||
      animation.phase === 'interaction'
    const canOpenCore =
      animation.phase === 'scan' || animation.phase === 'interaction'
    const canInspectNodes =
      animation.phase === 'expansion' || animation.phase === 'reveal'

    return {
      registerPointerMove: interaction.actions.registerPointerMove,
      registerCoreEngagement: (source = 'pointer') => {
        if (canEngageCore) {
          interaction.actions.registerCoreEngagement(source)
        }
      },
      requestCoreOpening: () => {
        if (canOpenCore) {
          interaction.actions.requestCoreOpening()
        }
      },
      setHoveredNode: (nodeId) => {
        if (canInspectNodes) {
          interaction.actions.setHoveredNode(nodeId)
        } else {
          interaction.actions.setHoveredNode(null)
        }
      },
      selectNode: (nodeId) => {
        if (canInspectNodes) {
          interaction.actions.selectNode(nodeId)
        }
      },
      requestReveal: () => {
        if (animation.phase === 'expansion') {
          interaction.actions.requestReveal()
        }
      },
      clearSelectedNode: interaction.actions.clearSelectedNode,
    }
  }, [animation.phase, interaction.actions])

  return {
    state: {
      ...interaction.state,
      ...animation,
      revealStep: reveal.step,
      ctaUnlocked: reveal.ctaUnlocked,
      knowledgeProgress: clamp(
        words.length ? interaction.state.exploredNodeIds.length / words.length : 0,
        0,
        1,
      ),
    },
    actions: guardedActions,
  }
}
