"use client"

import { Canvas, useFrame } from "@react-three/fiber"
import { useRef, useMemo } from "react"
import * as THREE from "three"

function AmbientSphere({ mouse }: { mouse: React.RefObject<{ x: number; y: number }> }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const materialRef = useRef<THREE.ShaderMaterial>(null)

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uColor1: { value: new THREE.Color("#3b82f6") },
      uColor2: { value: new THREE.Color("#06b6d4") },
      uColor3: { value: new THREE.Color("#8b5cf6") },
    }),
    []
  )

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime
      if (mouse.current) {
        materialRef.current.uniforms.uMouse.value.lerp(
          new THREE.Vector2(mouse.current.x * 0.5, mouse.current.y * 0.5),
          0.05
        )
      }
    }
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.002
      meshRef.current.rotation.x += 0.001
    }
  })

  const vertexShader = `
    varying vec2 vUv;
    varying vec3 vPosition;
    varying vec3 vNormal;
    uniform float uTime;
    uniform vec2 uMouse;
    
    void main() {
      vUv = uv;
      vPosition = position;
      vNormal = normal;
      
      vec3 pos = position;
      float displacement = sin(pos.x * 3.0 + uTime) * 0.1 +
                          sin(pos.y * 2.0 + uTime * 0.8) * 0.1 +
                          sin(pos.z * 4.0 + uTime * 1.2) * 0.05;
      displacement += uMouse.x * 0.1 + uMouse.y * 0.1;
      pos += normal * displacement;
      
      gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    }
  `

  const fragmentShader = `
    varying vec2 vUv;
    varying vec3 vPosition;
    varying vec3 vNormal;
    uniform float uTime;
    uniform vec2 uMouse;
    uniform vec3 uColor1;
    uniform vec3 uColor2;
    uniform vec3 uColor3;
    
    void main() {
      float fresnel = pow(1.0 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
      
      vec3 color = mix(uColor1, uColor2, vUv.y + sin(uTime * 0.5) * 0.2);
      color = mix(color, uColor3, fresnel * 0.6);
      
      float glow = fresnel * 0.8;
      color += glow * uColor2;
      
      float alpha = 0.6 + fresnel * 0.4;
      
      gl_FragColor = vec4(color, alpha);
    }
  `

  return (
    <mesh ref={meshRef}>
      <icosahedronGeometry args={[2.5, 64]} />
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}

function ParticleField() {
  const points = useRef<THREE.Points>(null)
  
  const particleCount = 500
  const positions = useMemo(() => {
    const pos = new Float32Array(particleCount * 3)
    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(2 * Math.random() - 1)
      const r = 3 + Math.random() * 2
      
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      pos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      pos[i * 3 + 2] = r * Math.cos(phi)
    }
    return pos
  }, [])

  useFrame((state) => {
    if (points.current) {
      points.current.rotation.y = state.clock.elapsedTime * 0.05
      points.current.rotation.x = state.clock.elapsedTime * 0.02
    }
  })

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.02}
        color="#06b6d4"
        transparent
        opacity={0.6}
        sizeAttenuation
      />
    </points>
  )
}

export function HeroSphere() {
  const mouseRef = useRef({ x: 0, y: 0 })

  const handleMouseMove = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect()
    mouseRef.current = {
      x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
      y: -((e.clientY - rect.top) / rect.height) * 2 + 1,
    }
  }

  return (
    <div 
      className="absolute inset-0 z-0"
      onMouseMove={handleMouseMove}
    >
      <Canvas
        camera={{ position: [0, 0, 6], fov: 60 }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} color="#3b82f6" />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#06b6d4" />
        <AmbientSphere mouse={mouseRef} />
        <ParticleField />
      </Canvas>
    </div>
  )
}
