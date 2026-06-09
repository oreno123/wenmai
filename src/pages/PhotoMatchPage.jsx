import { useState, useCallback, useRef } from 'react'
import { useNavigate } from '../components/common/Router'
import { useApp } from '../store/AppState'
import { PATTERN_LIBRARY, getPatternById, getPatternImage, getRarityLabel } from '../store/patternData'
import { extractHistogramFromFile, findTopMatches, buildLibraryHistograms } from '../utils/imageComparison'
import PatternImage from '../components/common/PatternImage'

export default function PhotoMatchPage() {
  const navigate = useNavigate()
  const { addToLibrary, data } = useApp()
  const fileRef = useRef(null)
  const [matchState, setMatchState] = useState('idle')
  const [previewUrl, setPreviewUrl] = useState(null)
  const [matches, setMatches] = useState([])
  const [error, setError] = useState(null)

  const handleFile = useCallback(async (file) => {
    if (!file || !file.type.startsWith('image/')) return

    setError(null)
    setPreviewUrl(URL.createObjectURL(file))
    setMatchState('loading')

    try {
      const userHist = await extractHistogramFromFile(file)
      const patterns = PATTERN_LIBRARY.filter(p => p.image)
      const libHists = await buildLibraryHistograms(patterns)
      const topMatches = findTopMatches(userHist, libHists, 3)
      setMatches(topMatches)
      setMatchState('results')
    } catch (e) {
      setError('图片分析失败，请换一张试试')
      setMatchState('idle')
    }
  }, [])

  const handleFileInput = useCallback((e) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) handleFile(file)
  }, [handleFile])

  const handleAddToLibrary = useCallback((patternId) => {
    addToLibrary(patternId)
  }, [addToLibrary])

  const handleReset = useCallback(() => {
    setMatchState('idle')
    setPreviewUrl(null)
    setMatches([])
    setError(null)
    if (fileRef.current) fileRef.current.value = ''
  }, [])

  return (
    <div style={{ padding: '16px', paddingBottom: '80px', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={() => navigate('/home')} style={{
          background: 'none', border: 'none', color: '#D4AF6A', fontSize: 16,
          cursor: 'pointer', fontFamily: 'inherit', padding: 0,
        }}>
          ← 返回
        </button>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: '#F2D58A', letterSpacing: 1 }}>
          拍照识别
        </h1>
      </div>

      {/* Upload Area */}
      {matchState === 'idle' && (
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          style={{
            border: '2px dashed rgba(201,162,60,0.3)',
            borderRadius: 16,
            padding: '48px 24px',
            textAlign: 'center',
            background: 'rgba(201,162,60,0.03)',
            cursor: 'pointer',
          }}
          onClick={() => fileRef.current?.click()}
        >
          <div style={{ fontSize: 48, marginBottom: 12 }}>📷</div>
          <div style={{ fontSize: 15, color: '#F5F1E8', fontWeight: 600, marginBottom: 8 }}>
            上传纹样图片
          </div>
          <div style={{ fontSize: 12, color: '#6A6A6A' }}>
            点击选择或拖拽图片到此处
          </div>
          <div style={{ fontSize: 11, color: '#4A4A4A', marginTop: 8 }}>
            支持 JPG / PNG / WebP
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={handleFileInput}
            style={{ display: 'none' }}
          />
        </div>
      )}

      {/* Loading */}
      {matchState === 'loading' && (
        <div style={{ textAlign: 'center', padding: '40px 0' }}>
          {previewUrl && (
            <img src={previewUrl} alt="上传图片" style={{
              maxWidth: '100%', maxHeight: 200, borderRadius: 12,
              objectFit: 'contain', marginBottom: 20,
              border: '1px solid rgba(201,162,60,0.15)',
            }} />
          )}
          <div style={{ color: '#D4AF6A', fontSize: 15, letterSpacing: 2 }}>
            正在匹配纹样...
          </div>
        </div>
      )}

      {/* Results */}
      {matchState === 'results' && (
        <div>
          {/* User image */}
          <div style={{
            textAlign: 'center', marginBottom: 24,
            padding: 16, background: 'rgba(201,162,60,0.03)',
            borderRadius: 12, border: '1px solid rgba(201,162,60,0.1)',
          }}>
            <div style={{ fontSize: 12, color: '#6A6A6A', marginBottom: 8 }}>你上传的图片</div>
            <img src={previewUrl} alt="上传图片" style={{
              maxWidth: '100%', maxHeight: 180, borderRadius: 8, objectFit: 'contain',
            }} />
          </div>

          {/* Matches */}
          <div style={{ fontSize: 14, color: '#F5F1E8', fontWeight: 600, marginBottom: 12, letterSpacing: 1 }}>
            最相似的纹样
          </div>

          {matches.map((match, idx) => {
            const pattern = getPatternById(match.patternId)
            if (!pattern) return null
            const owned = data.library.includes(pattern.id)
            const scorePercent = Math.round(match.score * 100)

            return (
              <div key={match.patternId} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: 12, marginBottom: 8,
                background: idx === 0 ? 'rgba(201,162,60,0.08)' : 'rgba(255,255,255,0.02)',
                borderRadius: 12,
                border: `1px solid ${idx === 0 ? 'rgba(201,162,60,0.2)' : 'rgba(255,255,255,0.05)'}`,
              }}>
                {/* Rank */}
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: idx === 0 ? 'rgba(201,162,60,0.2)' : 'rgba(255,255,255,0.05)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 700, color: idx === 0 ? '#F2D58A' : '#6A6A6A',
                  flexShrink: 0,
                }}>
                  {idx + 1}
                </div>

                {/* Pattern image */}
                <div style={{
                  width: 48, height: 48, borderRadius: 8, overflow: 'hidden',
                  background: 'rgba(0,0,0,0.3)', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <PatternImage src={getPatternImage(pattern)} alt={pattern.name} fallbackSize={24} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: '#F5F1E8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {pattern.name}
                  </div>
                  <div style={{ fontSize: 11, color: '#6A6A6A', marginTop: 2 }}>
                    <span className={`rarity-badge rarity-${pattern.rarity}`} style={{ fontSize: 10, padding: '1px 6px' }}>
                      {getRarityLabel(pattern.rarity)}
                    </span>
                    <span style={{ marginLeft: 6 }}>{pattern.type}</span>
                  </div>
                </div>

                {/* Score */}
                <div style={{ textAlign: 'center', flexShrink: 0 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, color: idx === 0 ? '#F2D58A' : '#D4AF6A' }}>
                    {scorePercent}%
                  </div>
                  <div style={{ fontSize: 9, color: '#4A4A4A' }}>相似度</div>
                </div>
              </div>
            )
          })}

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'center' }}>
            <button onClick={handleReset} style={{
              padding: '10px 24px', borderRadius: 10, fontSize: 13,
              background: 'rgba(255,255,255,0.04)', color: '#D4AF6A',
              border: '1px solid rgba(255,255,255,0.08)',
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
              换一张
            </button>
          </div>

          {error && (
            <div style={{ textAlign: 'center', color: '#E85D5D', fontSize: 13, marginTop: 12 }}>
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
