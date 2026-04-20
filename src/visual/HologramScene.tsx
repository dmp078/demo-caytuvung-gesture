import { Text, useTexture } from '@react-three/drei'
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
  const nearRef = useRef<THREE.Points>(null)
  const farRef = useRef<THREE.Points>(null)
  const { nearPositions, nearAlphas, farPositions, farAlphas } = useMemo(() => {
    const nearCount = 560
    const farCount = 340
    const nearPositionBuffer = new Float32Array(nearCount * 3)
    const nearAlphaBuffer = new Float32Array(nearCount)
    const farPositionBuffer = new Float32Array(farCount * 3)
    const farAlphaBuffer = new Float32Array(farCount)

    for (let index = 0; index < nearCount; index += 1) {
      const radius = 2.8 + Math.random() * 2.9
      const theta = Math.random() * Math.PI * 2
      const y = (Math.random() - 0.5) * 3.2

      nearPositionBuffer[index * 3] = Math.cos(theta) * radius
      nearPositionBuffer[index * 3 + 1] = y
      nearPositionBuffer[index * 3 + 2] = -3.9 + Math.sin(theta * 2.3) * 2.2
      nearAlphaBuffer[index] = 0.2 + Math.random() * 0.8
    }

    for (let index = 0; index < farCount; index += 1) {
      const radius = 4.8 + Math.random() * 3.2
      const theta = Math.random() * Math.PI * 2
      const y = (Math.random() - 0.5) * 4.6

      farPositionBuffer[index * 3] = Math.cos(theta) * radius
      farPositionBuffer[index * 3 + 1] = y
      farPositionBuffer[index * 3 + 2] = -6.7 + Math.sin(theta * 1.7) * 2.6
      farAlphaBuffer[index] = 0.18 + Math.random() * 0.58
    }

    return {
      nearPositions: nearPositionBuffer,
      nearAlphas: nearAlphaBuffer,
      farPositions: farPositionBuffer,
      farAlphas: farAlphaBuffer,
    }
  }, [])

  useFrame((state) => {
    if (nearRef.current) {
      nearRef.current.rotation.y = state.clock.elapsedTime * 0.052
      nearRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.26) * 0.08
    }

    if (farRef.current) {
      farRef.current.rotation.y = -state.clock.elapsedTime * 0.018
      farRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.11) * 0.04
    }
  })

  return (
    <group>
      <points ref={farRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[farPositions, 3]} />
          <bufferAttribute attach="attributes-alpha" args={[farAlphas, 1]} />
        </bufferGeometry>
        <pointsMaterial
          color="#448fda"
          size={0.03}
          sizeAttenuation
          transparent
          opacity={0.4}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
      <points ref={nearRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[nearPositions, 3]} />
          <bufferAttribute attach="attributes-alpha" args={[nearAlphas, 1]} />
        </bufferGeometry>
        <pointsMaterial
          color="#73e9ff"
          size={0.048}
          sizeAttenuation
          transparent
          opacity={0.64}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </group>
  )
}

const GalaxyAura = () => {
  const groupRef = useRef<THREE.Group>(null)
  const swirlRef = useRef<THREE.Mesh>(null)
  const innerRingRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (!groupRef.current) {
      return
    }

    groupRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.16) * 0.07
    groupRef.current.rotation.y = state.clock.elapsedTime * 0.025

    if (swirlRef.current) {
      swirlRef.current.rotation.z = -state.clock.elapsedTime * 0.08
      swirlRef.current.scale.setScalar(1 + Math.sin(state.clock.elapsedTime * 0.7) * 0.05)
    }

    if (innerRingRef.current) {
      innerRingRef.current.rotation.z = state.clock.elapsedTime * 0.04
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 1.1) * 0.04
      innerRingRef.current.scale.setScalar(pulse)
    }
  })

  return (
    <group ref={groupRef}>
      <mesh ref={swirlRef} position={[-1.6, 1.3, -5.6]} rotation={[0.1, 0.3, 0.4]}>
        <planeGeometry args={[3.8, 2.2]} />
        <meshBasicMaterial
          color="#2e6aa6"
          transparent
          opacity={0.18}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[2.1, -1.2, -5.8]} rotation={[-0.1, -0.34, -0.2]}>
        <planeGeometry args={[4.6, 2.4]} />
        <meshBasicMaterial
          color="#1f4f86"
          transparent
          opacity={0.14}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[0.2, 0, -6.2]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[2.4, 2.48, 160]} />
        <meshBasicMaterial
          color="#4eb4ff"
          transparent
          opacity={0.24}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[0.2, 0, -6.35]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[3.45, 3.5, 180]} />
        <meshBasicMaterial
          color="#2e78bf"
          transparent
          opacity={0.16}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <mesh ref={innerRingRef} position={[0.15, 0.08, -4.9]} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.18, 1.25, 144]} />
        <meshBasicMaterial
          color="#83e8ff"
          transparent
          opacity={0.23}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <mesh position={[-2.45, -0.9, -5.9]} rotation={[0.2, 0.35, 0.3]}>
        <planeGeometry args={[2.9, 1.9]} />
        <meshBasicMaterial
          color="#2b5f9f"
          transparent
          opacity={0.11}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
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
        <icosahedronGeometry args={[0.24, 2]} />
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
        <torusGeometry args={[0.52, 0.012, 12, 72]} />
        <meshBasicMaterial
          color="#84edff"
          transparent
          opacity={0.45}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.78, 0.007, 12, 96]} />
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
    let targetScale = Math.max(1.02, 1.86 - Math.abs(menuOffset) * 0.16)

    const isSelected = interaction.selectedWordId === word.id

    if (interaction.phase === 'detail') {
      if (isSelected) {
        targetPosition = { x: 0, y: 0.18, z: -1.7 }
        targetScale = 2.34
      } else {
        targetPosition = { x: orbit.x, y: orbit.y, z: orbit.z - 1.2 }
        targetScale = 0.86
      }
    }

    if (interaction.phase === 'quiz') {
      if (isSelected) {
        targetPosition = { x: 0, y: 0.94, z: -2.12 }
        targetScale = 1.12
      } else {
        targetPosition = { x: orbit.x * 0.88, y: orbit.y + 0.24, z: orbit.z - 1.85 }
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
        <sphereGeometry args={[0.24, 28, 28]} />
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
      <WordGlyph word={word} />
      <Text
        position={[0, -0.46, 0.05]}
        fontSize={0.11}
        color="#88eaff"
        anchorX="center"
        anchorY="middle"
        maxWidth={2.4}
      >
        {shouldShowLabel ? word.word : ''}
      </Text>
    </group>
  )
}

type WordGlyphProps = {
  word: WordNode
}

const WordGlyph = ({ word }: WordGlyphProps) => {
  if (word.iconImageSrc) {
    return <WordLogo src={word.iconImageSrc} />
  }

  return (
    <Text
      position={[0, 0, 0.16]}
      fontSize={0.16}
      color="#c6f8ff"
      anchorX="center"
      anchorY="middle"
    >
      {word.icon}
    </Text>
  )
}

type WordLogoProps = {
  src: string
}

const WordLogo = ({ src }: WordLogoProps) => {
  const texture = useTexture(src)

  return (
    <mesh position={[0, 0, 0.17]}>
      <planeGeometry args={[0.38, 0.38]} />
      <meshBasicMaterial
        map={texture}
        transparent
        opacity={0.95}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
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

    const baseScale = isSelected ? 1.3 : isHovered ? 1.18 : 1
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

  const shortened = option.label.length > 46 ? `${option.label.slice(0, 46)}…` : option.label

  return (
    <group ref={groupRef}>
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[0.32, 1]} />
        <meshStandardMaterial
          color="#4cd4ff"
          emissive="#34b7e3"
          emissiveIntensity={2}
          transparent
          opacity={0.9}
        />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.03]}>
        <torusGeometry args={[0.46, 0.013, 12, 80]} />
        <meshBasicMaterial
          color="#8aedff"
          transparent
          opacity={0.34}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      <Text
        position={[0, -0.62, 0]}
        fontSize={0.12}
        maxWidth={2.35}
        color="#bdf8ff"
        anchorX="center"
        anchorY="middle"
      >
        {shortened}
      </Text>
    </group>
  )
}

type PlatformGatewayEffectProps = {
  active: boolean
}

const PlatformGatewayEffect = ({ active }: PlatformGatewayEffectProps) => {
  const groupRef = useRef<THREE.Group>(null)
  const beamRef = useRef<THREE.Mesh>(null)
  const innerRingRef = useRef<THREE.Mesh>(null)
  const outerRingRef = useRef<THREE.Mesh>(null)
  const sparkleRef = useRef<THREE.Points>(null)

  const sparkles = useMemo(() => {
    const count = 210
    const positions = new Float32Array(count * 3)

    for (let index = 0; index < count; index += 1) {
      const radius = 0.72 + Math.random() * 0.82
      const theta = Math.random() * Math.PI * 2
      const y = (Math.random() - 0.5) * 1.3

      positions[index * 3] = Math.cos(theta) * radius
      positions[index * 3 + 1] = y
      positions[index * 3 + 2] = Math.sin(theta * 1.55) * 0.26
    }

    return positions
  }, [])

  useFrame((state, delta) => {
    if (!groupRef.current) {
      return
    }

    const visibility = active ? 1 : 0
    const targetScale = Math.max(0.001, visibility)

    groupRef.current.position.x = damp(groupRef.current.position.x, 0, 8, delta)
    groupRef.current.position.y = damp(groupRef.current.position.y, active ? 0.23 : -0.4, 8, delta)
    groupRef.current.position.z = damp(groupRef.current.position.z, -1.68, 8, delta)
    groupRef.current.scale.setScalar(damp(groupRef.current.scale.x, targetScale, 8, delta))

    if (beamRef.current) {
      const beamMaterial = beamRef.current.material as THREE.MeshBasicMaterial
      beamMaterial.opacity = damp(beamMaterial.opacity, active ? 0.28 : 0, 7, delta)
    }

    if (innerRingRef.current) {
      innerRingRef.current.rotation.z = state.clock.elapsedTime * 0.75
      const innerMaterial = innerRingRef.current.material as THREE.MeshBasicMaterial
      innerMaterial.opacity = damp(innerMaterial.opacity, active ? 0.62 : 0, 8, delta)
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 2.5) * 0.08
      innerRingRef.current.scale.setScalar(pulse)
    }

    if (outerRingRef.current) {
      outerRingRef.current.rotation.z = -state.clock.elapsedTime * 0.52
      const outerMaterial = outerRingRef.current.material as THREE.MeshBasicMaterial
      outerMaterial.opacity = damp(outerMaterial.opacity, active ? 0.34 : 0, 8, delta)
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 1.7 + Math.PI * 0.45) * 0.06
      outerRingRef.current.scale.setScalar(pulse)
    }

    if (sparkleRef.current) {
      sparkleRef.current.rotation.y = state.clock.elapsedTime * 0.22
      sparkleRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.35) * 0.06
      const sparkleMaterial = sparkleRef.current.material as THREE.PointsMaterial
      sparkleMaterial.opacity = damp(sparkleMaterial.opacity, active ? 0.9 : 0, 7, delta)
    }
  })

  return (
    <group ref={groupRef} scale={[0.001, 0.001, 0.001]}>
      <mesh ref={beamRef} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.42, 0.84, 1.7, 38, 1, true]} />
        <meshBasicMaterial
          color="#61ddff"
          transparent
          opacity={0}
          side={THREE.DoubleSide}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <mesh ref={innerRingRef} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.08]}>
        <torusGeometry args={[0.98, 0.03, 18, 132]} />
        <meshBasicMaterial
          color="#89f1ff"
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <mesh ref={outerRingRef} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.06]}>
        <torusGeometry args={[1.24, 0.018, 16, 148]} />
        <meshBasicMaterial
          color="#41c4ff"
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <points ref={sparkleRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[sparkles, 3]} />
        </bufferGeometry>
        <pointsMaterial
          color="#b5f7ff"
          size={0.034}
          sizeAttenuation
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
      <Text
        position={[0, -1.08, 0.16]}
        fontSize={0.115}
        color="#ddf9ff"
        anchorX="center"
        anchorY="middle"
      >
        CAY TU VUNG GATEWAY
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
  const selectedWord = words.find((word) => word.id === interaction.selectedWordId) ?? null
  const showPlatformGatewayEffect =
    interaction.phase === 'detail' && Boolean(selectedWord?.launchUrl)

  return (
    <>
      {!transparentBackground && <color attach="background" args={['#020912']} />}
      <fog attach="fog" args={['#020912', 6, 14]} />

      <ambientLight intensity={0.22} color="#74d8ff" />
      <pointLight position={[0, 1.8, -1.2]} intensity={16} color="#67d8ff" distance={8} />
      <pointLight position={[0, -1.2, -2.8]} intensity={7} color="#2a8cb4" distance={6} />

      <GridAura />
      <GalaxyAura />
      <ParticleField />

      <CoreField interaction={interaction} />
      <PlatformGatewayEffect active={showPlatformGatewayEffect} />

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
