import React, { Suspense, useCallback, useMemo, useRef } from 'react'
import { Canvas } from 'react-three-fiber'
import { useSpring, a, useChain } from '@react-spring/three'
import { useGesture } from 'react-use-gesture'
import { Loader, useTexture, Reflector } from '@react-three/drei'
import useCopyClipboard from 'react-use-clipboard'
import { Footer } from '@pmndrs/branding'
import { MAX_INDEX, NUM, useWheel } from './store'
import Model from './Colors'
import Screen from './Screen'

function easeInOutExpo(x) {
  return x === 0 ? 0 : x === 1 ? 1 : x < 0.5 ? Math.pow(2, 20 * x - 10) / 2 : (2 - Math.pow(2, -20 * x + 10)) / 2
}

function PalettesWheel() {
  const springRotY = useRef()
  const springPosX = useRef()
  const wheelOpen = useWheel((s) => s.wheelOpen)
  const wheelIndex = useWheel((s) => s.wheelIndex)
  const _weel = (2 * Math.PI * wheelIndex) / NUM
  const [positions, colors, alpha] = useMemo(() => {
    const _wheelIndex = wheelIndex - NUM / 2
    let colors = new Array(NUM)
      .fill()
      .map((_, i) => Math.abs((_wheelIndex + i > 0 ? _wheelIndex + i : MAX_INDEX + _wheelIndex + i) % MAX_INDEX))
    let alpha = new Array(NUM).fill().map((_, i) => easeInOutExpo(1 - (2 * Math.abs(i - NUM / 2)) / NUM))
    for (let i = 0; i < Math.abs(wheelIndex % NUM); i += 1) {
      const a = alpha.pop()
      const el = colors.pop()
      colors = [el, ...colors]
      alpha = [a, ...alpha]
    }

    const positions = new Array(NUM)
      .fill()
      .map((_, index) => [0, -2 * Math.sin((2 * Math.PI * index) / NUM), -2 * Math.cos((2 * Math.PI * index) / NUM)])
    return [positions, colors, alpha]
  }, [wheelIndex])

  const { rotY } = useSpring({
    ref: springRotY,
    rotY: wheelOpen ? Math.PI / 4 : Math.PI / 2
  })
  const { posX, posZ } = useSpring({
    ref: springPosX,
    posX: wheelOpen ? 2 : -3,
    posZ: wheelOpen ? -4 : -1.9
  })
  const { rotX } = useSpring({
    rotX: _weel
  })
  useChain(!wheelOpen ? [springRotY, springPosX] : [springPosX, springRotY], [0, 1])

  return (
    <a.group position-x={posX} position-z={posZ} rotation-y={rotY}>
      <a.group rotation-x={rotX}>
        {positions.map((pos, index) => (
          <Screen
            key={`0${index}`}
            position={pos}
            wheelIndex={colors[index]}
            rotation-x={-(2 * Math.PI * index) / NUM}
            opacity={alpha[index]}
          />
        ))}
      </a.group>
    </a.group>
  )
}

function Floor() {
  const [floor, normal] = useTexture(['/roughness_floor.jpeg', '/normal_floor.jpeg'])
  return (
    <Reflector
      receiveShadow
      resolution={512}
      args={[30, 30]}
      mirror={0.5}
      mixBlur={8}
      mixStrength={5}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[3, -2.53, -1]}
      blur={[1000, 100]}
      minDepthThreshold={0.5}
      maxDepthThreshold={2}
      depthScale={2}>
      {(Material, props) => (
        <Material
          color="#333"
          metalness={0}
          roughnessMap={floor}
          normalMap={normal}
          normalScale={[0.1, 0.1]}
          envMapIntensity={0}
          {...props}
        />
      )}
    </Reflector>
  )
}

export default function App() {
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
  const tempWheel = useRef(0)
  const wheelOpen = useWheel((s) => s.wheelOpen)
  const increaseWheelIndex = useWheel((s) => s.increaseWheelIndex)
  const decreaseWheelIndex = useWheel((s) => s.decreaseWheelIndex)
  const [isCopied, setCopied] = useCopyClipboard(window.location.href, {
    successDuration: 2000
  })

  const handleClick = useCallback(
    (e) => {
      e.stopPropagation()
      setCopied()
    },
    [setCopied]
  )
  const bind = useGesture(
    {
      onWheel: ({ xy: [, y] }) => {
        const scroll = parseInt(y / 50, 10)
        if (scroll > tempWheel.current) {
          decreaseWheelIndex()
          tempWheel.current = scroll
        }
        if (scroll < tempWheel.current) {
          increaseWheelIndex()
          tempWheel.current = scroll
        }
      },
      ...(isMobile && {
        onDrag: ({ xy: [, y] }) => {
          const scroll = parseInt(y / 50, 10)
          if (scroll > tempWheel.current) {
            increaseWheelIndex()
            tempWheel.current = scroll
          }
          if (scroll < tempWheel.current) {
            decreaseWheelIndex()
            tempWheel.current = scroll
          }
        }
      })
    },
    { axis: 'y', dragDelay: 2000 }
  )

  return (
    <div {...(wheelOpen && bind())} style={{ height: '100%' }}>
      <Canvas concurrent shadowMap pixelRatio={[1, 1.5]} camera={{ fov: 20, far: 100, position: [0, -10, 50], zoom: isMobile ? 1 : 1.5 }}>
        <color attach="background" args={['#101010']} />
        <fog attach="fog" args={['#101010', 50, 60]} />
        <group rotation={[Math.PI / 8, -Math.PI / 3.2, 0]} position-x={0}>
          <Suspense fallback={null}>
            <PalettesWheel />
            <Model position={[-2.5, -2.5, 0]} scale={[1.8, 1.8, 1.8]} />
            <Floor />
          </Suspense>
        </group>
        <ambientLight intensity={4} />
        <spotLight castShadow intensity={2} position={[10, 0, 10]} penumbra={1} angle={0.3} distance={30} />
        <directionalLight position={[-5, 10, -10]} intensity={0} />
      </Canvas>
      <Loader />
      <Footer
        date="1. February"
        year="2021"
        link1={<a onClick={handleClick}>Share your composition</a>}
        link2={isCopied && <div>Link copied in clipboard!</div>}
      />
    </div>
  )
}
