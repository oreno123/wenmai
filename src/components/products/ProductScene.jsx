import { Canvas } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import Mug from './Mug'
import PhoneCase from './PhoneCase'
import Plate from './Plate'
import Scarf from './Scarf'

const PRODUCT_COMPONENTS = { mug: Mug, case: PhoneCase, plate: Plate, scarf: Scarf }

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

export default function ProductScene({ texture, activeProduct }) {
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