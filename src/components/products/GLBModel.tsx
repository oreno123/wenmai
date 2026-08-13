import { Suspense, Component, useEffect, useRef } from 'react'
import type { ReactNode, ErrorInfo } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'

interface LocalErrorBoundaryProps {
  children: ReactNode
  fallback: ReactNode
}
interface LocalErrorBoundaryState {
  hasError: boolean
}

class ErrorBoundary extends Component<LocalErrorBoundaryProps, LocalErrorBoundaryState> {
  state: LocalErrorBoundaryState = { hasError: false }
  static getDerivedStateFromError(): LocalErrorBoundaryState { return { hasError: true } }
  componentDidCatch(): void { this.setState({ hasError: true }) }
  override render(): ReactNode {
    return this.state.hasError ? this.props.fallback : this.props.children
  }
}

type FilterName = 'sides' | 'top'

// Filter: only show texture on faces matching the normal direction
// sides → horizontal normals (mug body), top → upward normals (plate surface)
const FILTERS: Record<FilterName, string> = {
  sides: '1.0 - abs(vLN.y)',
  top: 'vLN.y',
}

function applyFilter(mat: THREE.MeshStandardMaterial, filterName: FilterName): void {
  const expr = FILTERS[filterName]
  mat.onBeforeCompile = (shader) => {
    // Inject object-space normal into vertex shader
    shader.vertexShader = 'varying vec3 vLN;\n' + shader.vertexShader
    shader.vertexShader = shader.vertexShader.replace(
      '#include <defaultnormal_vertex>',
      '#include <defaultnormal_vertex>\nvLN = normalize(objectNormal);'
    )
    // In fragment shader: after texture is applied, mask based on normal
    shader.fragmentShader = 'varying vec3 vLN;\n' + shader.fragmentShader
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <emissivemap_fragment>',
      `float filterMask = smoothstep(0.1, 0.5, ${expr});
      vec3 filterBase = vec3(0.94, 0.92, 0.88);
      diffuseColor.rgb = mix(filterBase, diffuseColor.rgb, filterMask);
      #include <emissivemap_fragment>`
    )
  }
}

function normalize(obj: THREE.Object3D, rotation?: [number, number, number]): void {
  if (rotation) {
    obj.rotation.set(rotation[0], rotation[1], rotation[2])
    obj.updateMatrixWorld(true)
  }
  const box = new THREE.Box3().setFromObject(obj)
  const size = new THREE.Vector3()
  const center = new THREE.Vector3()
  box.getSize(size)
  box.getCenter(center)
  const maxDim = Math.max(size.x, size.y, size.z)
  if (maxDim === 0) return
  const s = 2.5 / maxDim
  obj.scale.setScalar(s)
  obj.position.set(-center.x * s, -center.y * s + size.y * s * 0.1, -center.z * s)
}

interface GLBSceneProps {
  url: string
  texture: THREE.CanvasTexture | null
  rotation?: [number, number, number]
  filter?: FilterName
}

function GLBScene({ url, texture, rotation, filter }: GLBSceneProps) {
  const { scene } = useGLTF(url)
  const ref = useRef<THREE.Object3D>(null)
  if (!ref.current) {
    ref.current = scene.clone(true)
    normalize(ref.current, rotation)
  }

  useEffect(() => {
    const root = ref.current
    if (!root) return
    root.traverse(c => {
      const mesh = c as THREE.Mesh
      if (!mesh.isMesh) return
      const mat = new THREE.MeshStandardMaterial({
        map: texture ?? undefined,
        color: '#ffffff',
        metalness: 0.15,
        roughness: 0.7,
      })
      if (filter) applyFilter(mat, filter)
      mesh.material = mat
    })
  }, [texture, filter])

  return <primitive object={ref.current} />
}

interface GLBModelProps {
  url: string
  texture: THREE.CanvasTexture | null
  fallback: ReactNode
  rotation?: [number, number, number]
  filter?: FilterName
}

export default function GLBModel({ url, texture, fallback, rotation, filter }: GLBModelProps) {
  return (
    <ErrorBoundary fallback={fallback}>
      <Suspense fallback={fallback}>
        <GLBScene url={url} texture={texture} rotation={rotation} filter={filter} />
      </Suspense>
    </ErrorBoundary>
  )
}
