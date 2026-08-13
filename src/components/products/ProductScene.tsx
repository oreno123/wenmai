import type { ReactNode } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import Mug from './Mug'
import PhoneCase from './PhoneCase'
import Plate from './Plate'
import Scarf from './Scarf'

type ProductId = 'mug' | 'case' | 'plate' | 'scarf'

interface ProductComponentProps {
  texture: HTMLCanvasElement | null
}

const PRODUCT_COMPONENTS: Record<ProductId, (props: ProductComponentProps) => ReactNode> = {
  mug: Mug as unknown as (props: ProductComponentProps) => ReactNode,
  case: PhoneCase as unknown as (props: ProductComponentProps) => ReactNode,
  plate: Plate as unknown as (props: ProductComponentProps) => ReactNode,
  scarf: Scarf as unknown as (props: ProductComponentProps) => ReactNode,
}

function Lights() {
  return (
    <>
      <ambientLight intensity={0.3} />
      <spotLight
        position={[5, 5, 5]}
        angle={0.6}
        penumbra={1}
        intensity={1.5}
        color="#F2D58A"
      />
      <spotLight
        position={[-3, 3, -3]}
        angle={0.5}
        penumbra={1}
        intensity={0.8}
        color="#D4AF6A"
      />
    </>
  )
}

interface ProductSceneProps {
  texture: HTMLCanvasElement | null
  activeProduct: ProductId
}

export default function ProductScene({ texture, activeProduct }: ProductSceneProps) {
  const ProductComponent = PRODUCT_COMPONENTS[activeProduct] || Mug

  return (
    <Canvas
      camera={{ position: [0, 1, 4], fov: 45 }}
      style={{ width: '100%', height: '100%' }}
    >
      <color attach="background" args={['#120A0C']} />
      <Lights />
      <ProductComponent texture={texture} />
      <OrbitControls
        enablePan={false}
        enableZoom={true}
        minDistance={2}
        maxDistance={8}
        autoRotate
        autoRotateSpeed={1}
      />
    </Canvas>
  )
}
