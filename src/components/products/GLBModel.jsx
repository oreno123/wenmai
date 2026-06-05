import { Suspense, Component, useEffect, useRef } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'

class ErrorBoundary extends Component {
  state = { hasError: false }
  static getDerivedStateFromError() { return { hasError: true } }
  componentDidCatch() { this.setState({ hasError: true }) }
  render() {
    return this.state.hasError ? this.props.fallback : this.props.children
  }
}

// Filter: only show texture on faces matching the normal direction
// sides → horizontal normals (mug body), top → upward normals (plate surface)
const FILTERS = {
  sides: '1.0 - abs(vLN.y)',
  top: 'vLN.y',
}

function applyFilter(mat, filterName) {
  const expr = FILTERS[filterName]
  if (!expr) return
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

function normalize(obj, rotation) {
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

function GLBScene({ url, texture, rotation, filter }) {
  const { scene } = useGLTF(url)
  const ref = useRef(null)
  if (!ref.current) {
    ref.current = scene.clone(true)
    normalize(ref.current, rotation)
  }

  useEffect(() => {
    const root = ref.current
    root.traverse(c => {
      if (!c.isMesh) return
      const mat = new THREE.MeshStandardMaterial({
        map: texture,
        color: '#ffffff',
        metalness: 0.15,
        roughness: 0.7,
      })
      if (filter) applyFilter(mat, filter)
      c.material = mat
    })
  }, [texture, filter])

  return <primitive object={ref.current} />
}

export default function GLBModel({ url, texture, fallback, rotation, filter }) {
  return (
    <ErrorBoundary fallback={fallback}>
      <Suspense fallback={fallback}>
        <GLBScene url={url} texture={texture} rotation={rotation} filter={filter} />
      </Suspense>
    </ErrorBoundary>
  )
}
