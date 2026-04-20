import { Text } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { GestureSnapshot, InteractionState, QuizOption, Vec3, WordNode } from '../types'
import { lerp } from '../utils/math'
import { CORE_BASE_Z, orbitMenuOffset, orbitNodePosition, quizNodePositions } from './layout'

type HologramSceneProps = {
  interaction: InteractionState
  gestures: GestureSnapshot
  words: WordNode[]
  transparentBackground?: boolean
}

const holoColor = new THREE.Color('#65e7ff')
const brightColor = new THREE.Color('#aaf7ff')
const dimColor = new THREE.Color('#1f6f8f')
const finaleCorePosition = new THREE.Vector3(0, 0, -1.95)

const damp = (current: number, target: number, speed: number, delta: number) =>
  lerp(current, target, 1 - Math.exp(-speed * delta))

const copyVec3 = (vector: Vec3) => new THREE.Vector3(vector.x, vector.y, vector.z)

const ParticleField = () => {
  const pointsRef = useRef<THREE.Points>(null)
  const { positions, alphas } = useMemo(() => {
    const count = 320
    const positionsBuffer = new Float32Array(count * 3)
    const alphaBuffer = new Float32Array(count)

    for (let index = 0; index < count; index += 1) {
      const radius = 3 + Math.random() * 2.4
      const theta = Math.random() * Math.PI * 2
      const y = (Math.random() - 0.5) * 2.6

      positionsBuffer[index * 3] = Math.cos(theta) * radius
      positionsBuffer[index * 3 + 1] = y
      positionsBuffer[index * 3 + 2] = -4 + Math.sin(theta * 2) * 1.8
      alphaBuffer[index] = 0.2 + Math.random() * 0.8
    }

    return { positions: positionsBuffer, alphas: alphaBuffer }
  }, [])

  useFrame((state) => {
    if (!pointsRef.current) {
      return
    }

    pointsRef.current.rotation.y = state.clock.elapsedTime * 0.045
    pointsRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.23) * 0.08
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-alpha" args={[alphas, 1]} />
      </bufferGeometry>
      <pointsMaterial
        color="#5ddfff"
        size={0.03}
        sizeAttenuation
        transparent
        opacity={0.52}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}

type ReticleProps = {
  target: Vec3
  pinchStrength: number
  hasHand: boolean
  stability: number
}

const Reticle = ({ target, pinchStrength, hasHand, stability }: ReticleProps) => {
  const groupRef = useRef<THREE.Group>(null)

  useFrame((state, delta) => {
    if (!groupRef.current) {
      return
    }

    const targetPosition = copyVec3(target)
    groupRef.current.position.x = damp(groupRef.current.position.x, targetPosition.x, 9, delta)
    groupRef.current.position.y = damp(groupRef.current.position.y, targetPosition.y, 9, delta)
    groupRef.current.position.z = damp(groupRef.current.position.z, targetPosition.z, 9, delta)

    const pulse = 1 + Math.sin(state.clock.elapsedTime * 6.2) * 0.04
    const focusScale = 1 + pinchStrength * 0.22
    groupRef.current.scale.setScalar(damp(groupRef.current.scale.x, pulse * focusScale, 12, delta))
  })

  const opacity = hasHand ? 0.35 + stability * 0.45 : 0.15

  return (
    <group ref={groupRef}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.12, 0.007, 16, 80]} />
        <meshBasicMaterial
          color={holoColor}
          transparent
          opacity={opacity}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.2, 0.004, 16, 80]} />
        <meshBasicMaterial
          color={brightColor}
          transparent
          opacity={opacity * 0.55}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.015, 16, 16]} />
        <meshBasicMaterial
          color="#e0fdff"
          transparent
          opacity={opacity * 0.9}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  )
}

type CoreFieldProps = {
  interaction: InteractionState
}

const CoreField = ({ interaction }: CoreFieldProps) => {
  const groupRef = useRef<THREE.Group>(null)
  const pulseRef = useRef<THREE.Mesh>(null)

  useFrame((state, delta) => {
    if (!groupRef.current) {
      return
    }

    const anchor = interaction.anchorWorld
    const target = new THREE.Vector3(anchor.x * 0.85, anchor.y * 0.8, CORE_BASE_Z)

    if (interaction.phase === 'finale') {
      target.copy(finaleCorePosition)
    }

    groupRef.current.position.x = damp(groupRef.current.position.x, target.x, 7, delta)
    groupRef.current.position.y = damp(groupRef.current.position.y, target.y, 7, delta)
    groupRef.current.position.z = damp(groupRef.current.position.z, target.z, 7, delta)

    const summonBoost = interaction.phase === 'summoning' ? 1.35 : 1
    const rhythm = 0.78 + Math.sin(state.clock.elapsedTime * 3.4) * 0.12
    groupRef.current.scale.setScalar(damp(groupRef.current.scale.x, rhythm * summonBoost, 8, delta))

    if (pulseRef.current) {
      pulseRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 5.6) * 0.11)
    }
  })

  const visible = interaction.phase !== 'awaiting_hand'

  if (!visible) {
    return null
  }

  return (
    <group ref={groupRef}>
      <mesh>
        <icosahedronGeometry args={[0.18, 2]} />
        <meshStandardMaterial
          color="#69e7ff"
          emissive="#2bc6ff"
          emissiveIntensity={1.7}
          metalness={0.1}
          roughness={0.25}
          transparent
          opacity={0.86}
        />
      </mesh>
      <mesh ref={pulseRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.4, 0.01, 12, 72]} />
        <meshBasicMaterial
          color="#84edff"
          transparent
          opacity={0.45}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.62, 0.006, 12, 96]} />
        <meshBasicMaterial
          color="#36d9ff"
          transparent
          opacity={0.25}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  )
}

type OrbitWordProps = {
  index: number
  total: number
  word: WordNode
  interaction: InteractionState
}

const OrbitWord = ({ index, total, word, interaction }: OrbitWordProps) => {
  const groupRef = useRef<THREE.Group>(null)
  const sphereRef = useRef<THREE.Mesh>(null)

  useFrame((state, delta) => {
    if (!groupRef.current) {
      return
    }

    const menuOffset = orbitMenuOffset(index, total, interaction.orbitFocusIndex)
    const orbit = orbitNodePosition(
      index,
      total,
      state.clock.elapsedTime,
      interaction.anchorWorld,
      interaction.orbitFocusIndex,
    )
    let targetPosition = orbit
    let targetScale = Math.max(0.64, 1.12 - Math.abs(menuOffset) * 0.16)

    const isSelected = interaction.selectedWordId === word.id

    if (interaction.phase === 'detail' || interaction.phase === 'quiz') {
      if (isSelected) {
        targetPosition = { x: 0, y: 0.18, z: -1.7 }
        targetScale = 1.65
      } else {
        targetPosition = { x: orbit.x, y: orbit.y, z: orbit.z - 1.2 }
        targetScale = 0.58
      }
    }

    if (interaction.phase === 'finale') {
      targetPosition = { x: 0, y: 0, z: -2 }
      targetScale = 0.3
    }

    groupRef.current.position.x = damp(groupRef.current.position.x, targetPosition.x, 8, delta)
    groupRef.current.position.y = damp(groupRef.current.position.y, targetPosition.y, 8, delta)
    groupRef.current.position.z = damp(groupRef.current.position.z, targetPosition.z, 8, delta)
    groupRef.current.scale.setScalar(damp(groupRef.current.scale.x, targetScale, 8, delta))

    if (sphereRef.current) {
      const material = sphereRef.current.material as THREE.MeshStandardMaterial
      const hovered = interaction.hoveredWordId === word.id
      const boost = hovered ? 2.8 : isSelected ? 3.4 : 1.5 + Math.max(0, 0.7 - Math.abs(menuOffset) * 0.18)
      material.emissiveIntensity = damp(material.emissiveIntensity, boost, 10, delta)
      material.opacity = damp(
        material.opacity,
        isSelected ? 1 : Math.max(0.45, 0.92 - Math.abs(menuOffset) * 0.12),
        7,
        delta,
      )
    }
  })

  const isVisible =
    interaction.phase === 'orbit' || interaction.phase === 'detail' || interaction.phase === 'quiz' || interaction.phase === 'finale'

  if (!isVisible) {
    return null
  }

  const menuOffset = orbitMenuOffset(index, total, interaction.orbitFocusIndex)
  const shouldShowLabel =
    Math.abs(menuOffset) <= 2 || interaction.hoveredWordId === word.id || interaction.selectedWordId === word.id

  return (
    <group ref={groupRef}>
      <mesh ref={sphereRef}>
        <sphereGeometry args={[0.12, 24, 24]} />
        <meshStandardMaterial
          color={interaction.hoveredWordId === word.id ? '#95f6ff' : '#4fd6ff'}
          emissive={interaction.hoveredWordId === word.id ? '#72ecff' : '#2eaed2'}
          emissiveIntensity={2.1}
          metalness={0.2}
          roughness={0.28}
          transparent
          opacity={0.9}
        />
      </mesh>
      <Text
        position={[0, 0, 0.16]}
        fontSize={0.09}
        color="#c6f8ff"
        anchorX="center"
        anchorY="middle"
      >
        {word.icon}
      </Text>
      <Text
        position={[0, -0.23, 0.05]}
        fontSize={0.065}
        color="#88eaff"
        anchorX="center"
        anchorY="middle"
        maxWidth={1.2}
      >
        {shouldShowLabel ? word.word : ''}
      </Text>
    </group>
  )
}

type QuizNodeProps = {
  option: QuizOption
  index: number
  interaction: InteractionState
}

const QuizNode = ({ option, index, interaction }: QuizNodeProps) => {
  const groupRef = useRef<THREE.Group>(null)
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame((_, delta) => {
    if (!groupRef.current) {
      return
    }

    const positions = quizNodePositions(interaction.anchorWorld)
    const target =
      interaction.phase === 'quiz' && positions[index]
        ? positions[index]
        : ({ x: 0, y: -2, z: -4 } as Vec3)

    groupRef.current.position.x = damp(groupRef.current.position.x, target.x, 10, delta)
    groupRef.current.position.y = damp(groupRef.current.position.y, target.y, 10, delta)
    groupRef.current.position.z = damp(groupRef.current.position.z, target.z, 10, delta)

    const isHovered = interaction.quiz.hoveredOptionId === option.id
    const isSelected = interaction.quiz.selectedOptionId === option.id
    const shouldHighlightCorrect =
      interaction.quiz.selectedOptionId &&
      interaction.quiz.answerResult === 'wrong' &&
      option.isCorrect

    const baseScale = isSelected ? 1.14 : isHovered ? 1.06 : 1
    groupRef.current.scale.setScalar(damp(groupRef.current.scale.x, baseScale, 12, delta))

    if (meshRef.current) {
      const material = meshRef.current.material as THREE.MeshStandardMaterial
      const color = shouldHighlightCorrect
        ? '#7dffcf'
        : isSelected && interaction.quiz.answerResult === 'wrong'
          ? '#ff7f96'
          : '#4cd4ff'

      material.color.set(color)
      material.emissive.set(color)
      material.emissiveIntensity = damp(
        material.emissiveIntensity,
        isHovered || isSelected || shouldHighlightCorrect ? 2.8 : 1.8,
        10,
        delta,
      )
    }
  })

  const shortened = option.label.length > 58 ? `${option.label.slice(0, 58)}…` : option.label

  return (
    <group ref={groupRef}>
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[0.2, 1]} />
        <meshStandardMaterial
          color="#4cd4ff"
          emissive="#34b7e3"
          emissiveIntensity={2}
          transparent
          opacity={0.9}
        />
      </mesh>
      <Text
        position={[0, -0.4, 0]}
        fontSize={0.08}
        maxWidth={1.45}
        color="#bdf8ff"
        anchorX="center"
        anchorY="middle"
      >
        {shortened}
      </Text>
    </group>
  )
}

type FinaleCubeProps = {
  interaction: InteractionState
}

const FinaleCube = ({ interaction }: FinaleCubeProps) => {
  const groupRef = useRef<THREE.Group>(null)
  const leftPanelRef = useRef<THREE.Mesh>(null)
  const rightPanelRef = useRef<THREE.Mesh>(null)

  useFrame((state, delta) => {
    if (!groupRef.current) {
      return
    }

    const isVisible = interaction.phase === 'finale'
    const targetY = isVisible ? 0.12 + Math.sin(state.clock.elapsedTime * 1.2) * 0.04 : -2.2

    groupRef.current.position.x = damp(groupRef.current.position.x, 0, 8, delta)
    groupRef.current.position.y = damp(groupRef.current.position.y, targetY, 8, delta)
    groupRef.current.position.z = damp(groupRef.current.position.z, -1.95, 8, delta)

    const targetScale = isVisible ? 1 : 0.4
    groupRef.current.scale.setScalar(damp(groupRef.current.scale.x, targetScale, 10, delta))

    const openAmount = interaction.finaleStep === 'opening' || interaction.finaleStep === 'revealed' ? 1 : 0
    if (leftPanelRef.current) {
      leftPanelRef.current.rotation.y = damp(
        leftPanelRef.current.rotation.y,
        openAmount * Math.PI * 0.48,
        10,
        delta,
      )
    }
    if (rightPanelRef.current) {
      rightPanelRef.current.rotation.y = damp(
        rightPanelRef.current.rotation.y,
        -openAmount * Math.PI * 0.48,
        10,
        delta,
      )
    }
  })

  if (interaction.phase !== 'finale') {
    return null
  }

  return (
    <group ref={groupRef}>
      <mesh>
        <boxGeometry args={[0.54, 0.54, 0.54]} />
        <meshStandardMaterial
          color="#6ce9ff"
          emissive="#2cc0e8"
          emissiveIntensity={2.2}
          transparent
          opacity={0.84}
          metalness={0.2}
          roughness={0.26}
        />
      </mesh>
      <mesh ref={leftPanelRef} position={[-0.29, 0, 0]}>
        <boxGeometry args={[0.06, 0.52, 0.52]} />
        <meshStandardMaterial color="#8ef2ff" emissive="#48d8f4" emissiveIntensity={2} />
      </mesh>
      <mesh ref={rightPanelRef} position={[0.29, 0, 0]}>
        <boxGeometry args={[0.06, 0.52, 0.52]} />
        <meshStandardMaterial color="#8ef2ff" emissive="#48d8f4" emissiveIntensity={2} />
      </mesh>
    </group>
  )
}

const GridAura = () => {
  const groupRef = useRef<THREE.Group>(null)

  useFrame((state) => {
    if (!groupRef.current) {
      return
    }

    groupRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.18) * 0.04
  })

  return (
    <group ref={groupRef}>
      <mesh position={[0, 0, -4.8]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.2, 2.27, 128]} />
        <meshBasicMaterial
          color={dimColor}
          transparent
          opacity={0.32}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <mesh position={[0, 0, -5]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[3.2, 3.24, 160]} />
        <meshBasicMaterial
          color="#2fa8d4"
          transparent
          opacity={0.18}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  )
}

export const HologramScene = ({
  interaction,
  gestures,
  words,
  transparentBackground = false,
}: HologramSceneProps) => {
  const showQuiz = interaction.phase === 'quiz'

  return (
    <>
      {!transparentBackground && <color attach="background" args={['#020912']} />}
      <fog attach="fog" args={['#020912', 6, 14]} />

      <ambientLight intensity={0.22} color="#74d8ff" />
      <pointLight position={[0, 1.8, -1.2]} intensity={16} color="#67d8ff" distance={8} />
      <pointLight position={[0, -1.2, -2.8]} intensity={7} color="#2a8cb4" distance={6} />

      <GridAura />
      <ParticleField />

      <CoreField interaction={interaction} />

      {words.map((word, index) => (
        <OrbitWord
          key={word.id}
          index={index}
          total={words.length}
          word={word}
          interaction={interaction}
        />
      ))}

      {showQuiz &&
        interaction.quiz.options.map((option, index) => (
          <QuizNode
            key={option.id}
            option={option}
            index={index}
            interaction={interaction}
          />
        ))}

      <FinaleCube interaction={interaction} />

      <Reticle
        target={interaction.reticleWorld}
        pinchStrength={gestures.pinch.strength}
        hasHand={gestures.hasHand}
        stability={gestures.stability}
      />
    </>
  )
}
