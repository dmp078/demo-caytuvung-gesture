import { Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import type { ThreeEvent } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { AICoreSceneController, WordNode } from '../types'
import { clamp, lerp } from '../utils/math'
import {
  AI_CORE_BASE_Z,
  aiCoreConnectionPairs,
  aiCoreNodePosition,
} from './aiCoreLayout'

type AICoreSceneProps = {
  core: AICoreSceneController
  words: WordNode[]
}

const coreColor = new THREE.Color('#7be9ff')
const brightCoreColor = new THREE.Color('#c3f8ff')

const damp = (current: number, target: number, speed: number, delta: number) =>
  lerp(current, target, 1 - Math.exp(-speed * delta))

const NebulaParticles = () => {
  const pointsRef = useRef<THREE.Points>(null)
  const { positions, sizes } = useMemo(() => {
    const count = 520
    const positionArray = new Float32Array(count * 3)
    const sizeArray = new Float32Array(count)

    for (let index = 0; index < count; index += 1) {
      const radius = 2.3 + Math.random() * 2.7
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      positionArray[index * 3] = Math.sin(phi) * Math.cos(theta) * radius
      positionArray[index * 3 + 1] = Math.cos(phi) * radius * 0.55
      positionArray[index * 3 + 2] = AI_CORE_BASE_Z - 0.8 + Math.sin(theta * 2) * 1.7
      sizeArray[index] = 0.25 + Math.random() * 0.75
    }

    return {
      positions: positionArray,
      sizes: sizeArray,
    }
  }, [])

  useFrame((state) => {
    if (!pointsRef.current) {
      return
    }

    pointsRef.current.rotation.y = state.clock.elapsedTime * 0.05
    pointsRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.18) * 0.12
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-size" args={[sizes, 1]} />
      </bufferGeometry>
      <pointsMaterial
        color="#75dcff"
        size={0.028}
        sizeAttenuation
        transparent
        opacity={0.56}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

type ReactorProps = {
  core: AICoreSceneController
}

const Reactor = ({ core }: ReactorProps) => {
  const groupRef = useRef<THREE.Group>(null)
  const glowSphereRef = useRef<THREE.Mesh>(null)
  const leftShellRef = useRef<THREE.Mesh>(null)
  const rightShellRef = useRef<THREE.Mesh>(null)
  const ringPrimaryRef = useRef<THREE.Mesh>(null)
  const ringSecondaryRef = useRef<THREE.Mesh>(null)
  const scanRingRef = useRef<THREE.Mesh>(null)

  useFrame((state, delta) => {
    if (!groupRef.current) {
      return
    }

    const pulse = 1 + Math.sin(state.clock.elapsedTime * 4.6) * 0.08
    const engagementBoost = clamp(core.state.coreEngagement / 4, 0, 1.8)
    const phase = core.state.phase
    const isOpen = phase === 'opening' || phase === 'expansion' || phase === 'reveal'
    const collapse = core.state.revealStep === 'collapsing'
    const targetOpenAmount = collapse ? 0.34 : isOpen ? 1 : 0
    const targetScale = phase === 'boot' ? 0.24 : 1

    groupRef.current.scale.setScalar(
      damp(groupRef.current.scale.x, targetScale * pulse, 6, delta),
    )
    groupRef.current.rotation.y +=
      delta * (0.2 + engagementBoost * 0.3 + (phase === 'scan' ? 0.12 : 0))

    if (ringPrimaryRef.current) {
      ringPrimaryRef.current.rotation.y += delta * (0.85 + engagementBoost * 0.9)
      ringPrimaryRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.4) * 0.42
    }

    if (ringSecondaryRef.current) {
      ringSecondaryRef.current.rotation.y -= delta * (0.58 + engagementBoost * 0.75)
      ringSecondaryRef.current.rotation.z = Math.cos(state.clock.elapsedTime * 0.36) * 0.58
    }

    if (leftShellRef.current) {
      leftShellRef.current.position.x = damp(
        leftShellRef.current.position.x,
        -0.3 - targetOpenAmount * 0.4,
        7,
        delta,
      )
      leftShellRef.current.rotation.y = damp(
        leftShellRef.current.rotation.y,
        targetOpenAmount * 0.58,
        7,
        delta,
      )
    }

    if (rightShellRef.current) {
      rightShellRef.current.position.x = damp(
        rightShellRef.current.position.x,
        0.3 + targetOpenAmount * 0.4,
        7,
        delta,
      )
      rightShellRef.current.rotation.y = damp(
        rightShellRef.current.rotation.y,
        -targetOpenAmount * 0.58,
        7,
        delta,
      )
    }

    if (glowSphereRef.current) {
      const material = glowSphereRef.current.material as THREE.MeshStandardMaterial
      material.emissiveIntensity = damp(
        material.emissiveIntensity,
        2 + engagementBoost * 1.6 + (phase === 'scan' ? 0.8 : 0),
        8,
        delta,
      )
      glowSphereRef.current.scale.setScalar(
        damp(glowSphereRef.current.scale.x, 1 + engagementBoost * 0.05, 8, delta),
      )
    }

    if (scanRingRef.current) {
      const scanVisible = phase === 'scan' ? 1 : 0
      scanRingRef.current.scale.setScalar(
        damp(scanRingRef.current.scale.x, 1 + Math.sin(state.clock.elapsedTime * 2) * 0.08, 9, delta),
      )
      const material = scanRingRef.current.material as THREE.MeshBasicMaterial
      material.opacity = damp(material.opacity, scanVisible * 0.55, 8, delta)
      scanRingRef.current.rotation.z += delta * 1.6
    }
  })

  const handlePointerMove = (event: ThreeEvent<PointerEvent>) => {
    core.actions.registerPointerMove({
      x: event.clientX / window.innerWidth,
      y: event.clientY / window.innerHeight,
    })
  }

  return (
    <group ref={groupRef} position={[0, 0.04, AI_CORE_BASE_Z]}>
      <mesh
        onPointerMove={handlePointerMove}
        onPointerDown={() => core.actions.registerCoreEngagement('pointer')}
        onClick={(event) => {
          event.stopPropagation()
          core.actions.registerCoreEngagement('pointer')
          core.actions.requestCoreOpening()
        }}
      >
        <icosahedronGeometry args={[0.38, 2]} />
        <meshStandardMaterial
          color="#74e7ff"
          emissive="#35c4f0"
          emissiveIntensity={2.6}
          metalness={0.1}
          roughness={0.24}
          transparent
          opacity={0.62}
        />
      </mesh>

      <mesh ref={glowSphereRef}>
        <sphereGeometry args={[0.24, 28, 28]} />
        <meshStandardMaterial
          color={coreColor}
          emissive={brightCoreColor}
          emissiveIntensity={2.1}
          transparent
          opacity={0.92}
          roughness={0.14}
          metalness={0.12}
        />
      </mesh>

      <mesh ref={ringPrimaryRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.84, 0.016, 24, 180]} />
        <meshBasicMaterial
          color="#96f2ff"
          transparent
          opacity={0.58}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      <mesh ref={ringSecondaryRef} rotation={[Math.PI / 3.2, 0, 0]}>
        <torusGeometry args={[1.02, 0.01, 24, 200]} />
        <meshBasicMaterial
          color="#63d8ff"
          transparent
          opacity={0.34}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      <mesh ref={scanRingRef} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.52, 0.54, 120]} />
        <meshBasicMaterial
          color="#b8f9ff"
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      <mesh ref={leftShellRef} position={[-0.3, 0, 0]}>
        <boxGeometry args={[0.14, 0.74, 0.34]} />
        <meshStandardMaterial
          color="#8defff"
          emissive="#4bd5f5"
          emissiveIntensity={2}
          transparent
          opacity={0.62}
          metalness={0.2}
          roughness={0.22}
        />
      </mesh>

      <mesh ref={rightShellRef} position={[0.3, 0, 0]}>
        <boxGeometry args={[0.14, 0.74, 0.34]} />
        <meshStandardMaterial
          color="#8defff"
          emissive="#4bd5f5"
          emissiveIntensity={2}
          transparent
          opacity={0.62}
          metalness={0.2}
          roughness={0.22}
        />
      </mesh>
    </group>
  )
}

type NeuralLatticeProps = {
  core: AICoreSceneController
  totalWords: number
}

const NeuralLattice = ({ core, totalWords }: NeuralLatticeProps) => {
  const groupRef = useRef<THREE.Group>(null)
  const pointsRef = useRef<THREE.InstancedMesh>(null)

  const linePositions = useMemo(() => {
    const basePoints = Array.from({ length: totalWords }, (_, index) =>
      aiCoreNodePosition(index, totalWords, 0, 1, null),
    )
    const pairs = aiCoreConnectionPairs(totalWords)
    const values: number[] = []

    pairs.forEach(([left, right]) => {
      const first = basePoints[left]
      const second = basePoints[right]
      values.push(first.x, first.y, first.z, second.x, second.y, second.z)
    })

    for (const node of basePoints) {
      values.push(0, 0, AI_CORE_BASE_Z, node.x, node.y, node.z)
    }

    return new Float32Array(values)
  }, [totalWords])

  const randomOffsets = useMemo(
    () =>
      Array.from({ length: 64 }, () => ({
        x: (Math.random() - 0.5) * 2,
        y: (Math.random() - 0.5) * 1.4,
        z: (Math.random() - 0.5) * 1.2,
      })),
    [],
  )

  useFrame((state, delta) => {
    if (!groupRef.current || !pointsRef.current) {
      return
    }

    const phase = core.state.phase
    const shouldShow = phase === 'opening' || phase === 'expansion' || phase === 'reveal'
    const targetScale = shouldShow
      ? 0.3 + core.state.knowledgeProgress * 0.9
      : phase === 'scan'
        ? 0.08
        : 0.01

    groupRef.current.scale.setScalar(damp(groupRef.current.scale.x, targetScale, 7, delta))
    groupRef.current.rotation.y += delta * 0.16

    const matrix = new THREE.Matrix4()
    const phasePulse = 1 + Math.sin(state.clock.elapsedTime * 1.8) * 0.05
    randomOffsets.forEach((offset, index) => {
      matrix.makeTranslation(
        offset.x * phasePulse,
        offset.y * phasePulse,
        AI_CORE_BASE_Z + offset.z * phasePulse,
      )
      pointsRef.current!.setMatrixAt(index, matrix)
    })
    pointsRef.current.instanceMatrix.needsUpdate = true
  })

  return (
    <group ref={groupRef}>
      <lineSegments>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[linePositions, 3]} />
        </bufferGeometry>
        <lineBasicMaterial
          color="#7de7ff"
          transparent
          opacity={0.42}
          blending={THREE.AdditiveBlending}
        />
      </lineSegments>
      <instancedMesh ref={pointsRef} args={[undefined, undefined, randomOffsets.length]}>
        <sphereGeometry args={[0.014, 10, 10]} />
        <meshBasicMaterial
          color="#b4f8ff"
          transparent
          opacity={0.64}
          blending={THREE.AdditiveBlending}
        />
      </instancedMesh>
    </group>
  )
}

type WordNodesProps = {
  core: AICoreSceneController
  words: WordNode[]
}

const WordNodes = ({ core, words }: WordNodesProps) => {
  return (
    <>
      {words.map((word, index) => (
        <WordNodeOrb
          key={word.id}
          word={word}
          index={index}
          total={words.length}
          core={core}
        />
      ))}
    </>
  )
}

type WordNodeOrbProps = {
  word: WordNode
  index: number
  total: number
  core: AICoreSceneController
}

const WordNodeOrb = ({ word, index, total, core }: WordNodeOrbProps) => {
  const groupRef = useRef<THREE.Group>(null)
  const nodeMeshRef = useRef<THREE.Mesh>(null)

  useFrame((state, delta) => {
    if (!groupRef.current || !nodeMeshRef.current) {
      return
    }

    const phase = core.state.phase
    const inKnowledgeMode = phase === 'expansion' || phase === 'reveal'
    const openingVisible = phase === 'opening'
    const visibleTarget = inKnowledgeMode || openingVisible ? 1 : 0
    const expansion = inKnowledgeMode
      ? 0.55 + core.state.knowledgeProgress * 0.6
      : openingVisible
        ? 0.18
        : 0.01

    const target = aiCoreNodePosition(
      index,
      total,
      state.clock.elapsedTime,
      expansion,
      core.state.revealStep,
    )

    const isSelected = core.state.selectedNodeId === word.id
    const isHovered = core.state.hoveredNodeId === word.id
    const isExplored = core.state.exploredNodeIds.includes(word.id)

    groupRef.current.position.x = damp(groupRef.current.position.x, target.x, 9, delta)
    groupRef.current.position.y = damp(groupRef.current.position.y, target.y, 9, delta)
    groupRef.current.position.z = damp(groupRef.current.position.z, target.z, 9, delta)

    const targetScale = visibleTarget
      ? isSelected
        ? 1.32
        : isHovered
          ? 1.14
          : isExplored
            ? 1.02
            : 0.9
      : 0.001
    groupRef.current.scale.setScalar(damp(groupRef.current.scale.x, targetScale, 8, delta))

    const material = nodeMeshRef.current.material as THREE.MeshStandardMaterial
    const emissiveTarget = isSelected ? 3.5 : isHovered ? 3 : isExplored ? 2.35 : 1.6
    material.emissiveIntensity = damp(material.emissiveIntensity, emissiveTarget, 11, delta)
    material.opacity = damp(material.opacity, visibleTarget * (isSelected ? 1 : 0.86), 7, delta)
  })

  const isInteractable = core.state.phase === 'expansion' || core.state.phase === 'reveal'
  const showLabel =
    core.state.selectedNodeId === word.id || core.state.hoveredNodeId === word.id

  return (
    <group
      ref={groupRef}
      onPointerMove={(event) => {
        event.stopPropagation()
        core.actions.registerPointerMove({
          x: event.clientX / window.innerWidth,
          y: event.clientY / window.innerHeight,
        })
      }}
      onPointerOver={(event) => {
        event.stopPropagation()
        if (isInteractable) {
          core.actions.setHoveredNode(word.id)
        }
      }}
      onPointerOut={(event) => {
        event.stopPropagation()
        core.actions.setHoveredNode(null)
      }}
      onClick={(event) => {
        event.stopPropagation()
        if (isInteractable) {
          core.actions.selectNode(word.id)
        }
      }}
    >
      <mesh ref={nodeMeshRef}>
        <sphereGeometry args={[0.12, 24, 24]} />
        <meshStandardMaterial
          color="#86ebff"
          emissive="#53d6f7"
          emissiveIntensity={2}
          transparent
          opacity={0.9}
          metalness={0.12}
          roughness={0.26}
        />
      </mesh>
      <Text
        position={[0, 0, 0.18]}
        fontSize={0.09}
        color="#d9fbff"
        anchorX="center"
        anchorY="middle"
      >
        {word.icon}
      </Text>
      {showLabel && (
        <Text
          position={[0, -0.24, 0]}
          fontSize={0.068}
          color="#b5f1ff"
          anchorX="center"
          anchorY="middle"
        >
          {word.word}
        </Text>
      )}
    </group>
  )
}

type RevealCubeProps = {
  core: AICoreSceneController
}

const RevealCube = ({ core }: RevealCubeProps) => {
  const groupRef = useRef<THREE.Group>(null)
  const leftPanelRef = useRef<THREE.Mesh>(null)
  const rightPanelRef = useRef<THREE.Mesh>(null)

  useFrame((state, delta) => {
    if (!groupRef.current || !leftPanelRef.current || !rightPanelRef.current) {
      return
    }

    const showCube = core.state.phase === 'reveal'
    const targetScale = showCube ? 1 : 0.001
    groupRef.current.scale.setScalar(damp(groupRef.current.scale.x, targetScale, 9, delta))
    groupRef.current.position.y = damp(
      groupRef.current.position.y,
      showCube ? 0.08 + Math.sin(state.clock.elapsedTime * 1.2) * 0.03 : -2,
      8,
      delta,
    )
    groupRef.current.position.z = damp(groupRef.current.position.z, AI_CORE_BASE_Z + 0.75, 8, delta)

    const openAmount =
      core.state.revealStep === 'unfolding' || core.state.revealStep === 'ready' ? 1 : 0
    leftPanelRef.current.rotation.y = damp(
      leftPanelRef.current.rotation.y,
      openAmount * Math.PI * 0.56,
      7,
      delta,
    )
    rightPanelRef.current.rotation.y = damp(
      rightPanelRef.current.rotation.y,
      -openAmount * Math.PI * 0.56,
      7,
      delta,
    )
  })

  return (
    <group ref={groupRef}>
      <mesh>
        <boxGeometry args={[0.64, 0.64, 0.64]} />
        <meshStandardMaterial
          color="#9ef1ff"
          emissive="#42cef2"
          emissiveIntensity={2.6}
          metalness={0.2}
          roughness={0.2}
          transparent
          opacity={0.84}
        />
      </mesh>
      <mesh ref={leftPanelRef} position={[-0.34, 0, 0]}>
        <boxGeometry args={[0.07, 0.6, 0.58]} />
        <meshStandardMaterial color="#beffff" emissive="#7de9ff" emissiveIntensity={2.2} />
      </mesh>
      <mesh ref={rightPanelRef} position={[0.34, 0, 0]}>
        <boxGeometry args={[0.07, 0.6, 0.58]} />
        <meshStandardMaterial color="#beffff" emissive="#7de9ff" emissiveIntensity={2.2} />
      </mesh>
      <mesh>
        <planeGeometry args={[0.36, 0.36]} />
        <meshBasicMaterial
          color="#d7fbff"
          transparent
          opacity={core.state.ctaUnlocked ? 0.78 : 0.2}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  )
}

type ReticleProps = {
  core: AICoreSceneController
}

const Reticle = ({ core }: ReticleProps) => {
  const groupRef = useRef<THREE.Group>(null)

  useFrame((_, delta) => {
    if (!groupRef.current) {
      return
    }

    const pointer = core.state.pointer
    const targetX = (pointer.x - 0.5) * 3.6
    const targetY = (0.5 - pointer.y) * 2.3
    const speed = Math.hypot(core.state.pointerVelocity.x, core.state.pointerVelocity.y)
    const targetScale = 1 + clamp(speed * 0.025, 0, 0.35)

    groupRef.current.position.x = damp(groupRef.current.position.x, targetX, 12, delta)
    groupRef.current.position.y = damp(groupRef.current.position.y, targetY, 12, delta)
    groupRef.current.position.z = damp(groupRef.current.position.z, AI_CORE_BASE_Z + 0.7, 12, delta)
    groupRef.current.scale.setScalar(damp(groupRef.current.scale.x, targetScale, 10, delta))
  })

  return (
    <group ref={groupRef}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.09, 0.0055, 16, 72]} />
        <meshBasicMaterial
          color="#bbf7ff"
          transparent
          opacity={0.44}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.012, 12, 12]} />
        <meshBasicMaterial
          color="#e4ffff"
          transparent
          opacity={0.8}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  )
}

const AtmosphericRings = () => {
  const groupRef = useRef<THREE.Group>(null)

  useFrame((state) => {
    if (!groupRef.current) {
      return
    }
    groupRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.2) * 0.08
    groupRef.current.rotation.y = state.clock.elapsedTime * 0.04
  })

  return (
    <group ref={groupRef}>
      <mesh position={[0, 0, AI_CORE_BASE_Z - 2.4]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.8, 2.84, 180]} />
        <meshBasicMaterial
          color="#2c8eb4"
          transparent
          opacity={0.32}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <mesh position={[0, 0, AI_CORE_BASE_Z - 2.7]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[3.9, 3.95, 220]} />
        <meshBasicMaterial
          color="#2d6e96"
          transparent
          opacity={0.2}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  )
}

export const AICoreScene = ({ core, words }: AICoreSceneProps) => {
  useFrame((state, delta) => {
    const selected = Boolean(core.state.selectedNodeId)
    const phase = core.state.phase
    const pointer = core.state.pointer
    const targetX = (pointer.x - 0.5) * 0.58
    const targetY = (0.5 - pointer.y) * 0.26 + 0.04
    const targetZ = phase === 'reveal' ? 2.5 : selected ? 2.78 : 3.16

    state.camera.position.x = damp(state.camera.position.x, targetX, 4.6, delta)
    state.camera.position.y = damp(state.camera.position.y, targetY, 4.6, delta)
    state.camera.position.z = damp(state.camera.position.z, targetZ, 4.6, delta)
    state.camera.lookAt(0, 0.02, AI_CORE_BASE_Z + 0.25)
  })

  return (
    <>
      <color attach="background" args={['#02060f']} />
      <fog attach="fog" args={['#02060f', 5.4, 15]} />

      <ambientLight intensity={0.18} color="#7bdfff" />
      <pointLight position={[0, 1.8, -1.8]} intensity={15.5} color="#72dcff" distance={9.5} />
      <pointLight position={[0, -1.5, AI_CORE_BASE_Z - 0.6]} intensity={8.8} color="#237fba" distance={7.2} />
      <pointLight position={[1.6, 0.4, AI_CORE_BASE_Z + 0.6]} intensity={6.2} color="#76d3ff" distance={6.1} />

      <AtmosphericRings />
      <NebulaParticles />
      <Reactor core={core} />
      <NeuralLattice core={core} totalWords={words.length} />
      <WordNodes core={core} words={words} />
      <RevealCube core={core} />
      <Reticle core={core} />
    </>
  )
}
