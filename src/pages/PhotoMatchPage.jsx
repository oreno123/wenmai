import { useState, useCallback, useRef } from 'react'
import { useNavigate } from '../components/common/Router'
import { useApp } from '../store/AppState'
import { PATTERN_LIBRARY, getPatternById, getPatternImage, getRarityLabel } from '../store/patternData'
import { extractHashFromFileWithCrop, findTopMatches, buildLibraryHashes } from '../utils/imageComparison'
import PatternImage from '../components/common/PatternImage'

function similarityLabel(score) {
  if (score >= 0.85) return { label: '很像', color: '#F2D58A' }
  if (score >= 0.65) return { label: '相似', color: '#D4AF6A' }
  if (score >= 0.45) return { label: '略像', color: '#8a7a4a' }
  return { label: '参考', color: '#5a5a5a' }
}

export default function PhotoMatchPage() {
  const navigate = useNavigate()
  const { data } = useApp()
  const fileRef = useRef(null)
  const imgRef = useRef(null)

  // 'idle' → 'crop' (let user draw box) → 'loading' → 'results'
  const [matchState, setMatchState] = useState('idle')
  const [previewUrl, setPreviewUrl] = useState(null)
  const [pendingFile, setPendingFile] = useState(null)
  const [matches, setMatches] = useState([])
  const [error, setError] = useState(null)

  // Crop rect in CSS pixels, relative to the displayed <img> element
  const [cropRect, setCropRect] = useState(null) // { x, y, w, h }
  const drawStartRef = useRef(null)
  const [imgInfo, setImgInfo] = useState(null) // { naturalW, naturalH, displayW, displayH }

  const handleFile = useCallback((file) => {
    if (!file || !file.type.startsWith('image/')) return
    setError(null)
    setCropRect(null)
    setMatches([])
    setPendingFile(file)
    setPreviewUrl(URL.createObjectURL(file))
    setMatchState('crop')
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

  const handleImgLoad = useCallback((e) => {
    const img = e.target
    setImgInfo({
      naturalW: img.naturalWidth,
      naturalH: img.naturalHeight,
      displayW: img.clientWidth,
      displayH: img.clientHeight,
    })
  }, [])

  // Pointer events on the crop overlay
  const pointFromEvent = useCallback((e) => {
    const img = imgRef.current
    if (!img) return null
    const rect = img.getBoundingClientRect()
    return {
      x: Math.max(0, Math.min(e.clientX - rect.left, rect.width)),
      y: Math.max(0, Math.min(e.clientY - rect.top, rect.height)),
    }
  }, [])

  const onPointerDown = useCallback((e) => {
    e.currentTarget.setPointerCapture?.(e.pointerId)
    const p = pointFromEvent(e)
    if (!p) return
    drawStartRef.current = p
    setCropRect({ x: p.x, y: p.y, w: 0, h: 0 })
  }, [pointFromEvent])

  const onPointerMove = useCallback((e) => {
    if (!drawStartRef.current) return
    const p = pointFromEvent(e)
    if (!p) return
    const s = drawStartRef.current
    setCropRect({
      x: Math.min(s.x, p.x),
      y: Math.min(s.y, p.y),
      w: Math.abs(p.x - s.x),
      h: Math.abs(p.y - s.y),
    })
  }, [pointFromEvent])

  const onPointerUp = useCallback(() => {
    drawStartRef.current = null
  }, [])

  const runIdentify = useCallback(async (useCrop) => {
    if (!pendingFile || !imgInfo) return
    setMatchState('loading')
    try {
      let crop = null
      if (useCrop && cropRect && cropRect.w > 8 && cropRect.h > 8) {
        const sx = imgInfo.naturalW / imgInfo.displayW
        const sy = imgInfo.naturalH / imgInfo.displayH
        crop = {
          x: cropRect.x * sx,
          y: cropRect.y * sy,
          w: cropRect.w * sx,
          h: cropRect.h * sy,
        }
      }
      const userHash = await extractHashFromFileWithCrop(pendingFile, crop)
      const patterns = PATTERN_LIBRARY.filter(p => p.image)
      const libHashes = await buildLibraryHashes(patterns)
      const topMatches = findTopMatches(userHash, libHashes, 3)
      setMatches(topMatches)
      setMatchState('results')
    } catch (e) {
      setError('图片分析失败，请换一张试试')
      setMatchState('crop')
    }
  }, [pendingFile, imgInfo, cropRect])

  const handleReset = useCallback(() => {
    setMatchState('idle')
    setPreviewUrl(null)
    setPendingFile(null)
    setMatches([])
    setError(null)
    setCropRect(null)
    setImgInfo(null)
    if (fileRef.current) fileRef.current.value = ''
  }, [])

  const cropIsValid = cropRect && cropRect.w > 8 && cropRect.h > 8

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
          找相似
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
            上传图片找相似纹样
          </div>
          <div style={{ fontSize: 12, color: '#6A6A6A' }}>
            从纹样库里找最像的 3 张给你参考
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

      {/* Crop stage: show image + draw box + two buttons */}
      {matchState === 'crop' && (
        <div>
          <div style={{
            fontSize: 12, color: '#8a7a4a', marginBottom: 8, letterSpacing: 1,
          }}>
            在图上拖框圈出纹样主体找相似，或不框直接整图搜
          </div>

          <div style={{
            textAlign: 'center', marginBottom: 16,
            background: 'rgba(201,162,60,0.03)',
            borderRadius: 12, padding: 12,
            border: '1px solid rgba(201,162,60,0.1)',
          }}>
            <div style={{ position: 'relative', display: 'inline-block', lineHeight: 0 }}>
              <img
                ref={imgRef}
                src={previewUrl}
                alt="上传图片"
                onLoad={handleImgLoad}
                draggable={false}
                style={{
                  maxWidth: '100%', maxHeight: 320, borderRadius: 8,
                  objectFit: 'contain', userSelect: 'none', display: 'block',
                }}
              />
              {imgInfo && (
                <div
                  style={{
                    position: 'absolute', left: 0, top: 0,
                    width: imgInfo.displayW, height: imgInfo.displayH,
                    cursor: 'crosshair', touchAction: 'none',
                  }}
                  onPointerDown={onPointerDown}
                  onPointerMove={onPointerMove}
                  onPointerUp={onPointerUp}
                >
                  {cropRect && cropRect.w > 0 && cropRect.h > 0 && (
                    <>
                      {/* Dim everything outside the crop */}
                      <div style={{
                        position: 'absolute', inset: 0,
                        background: 'rgba(0,0,0,0.55)', pointerEvents: 'none',
                        clipPath: `polygon(0 0, 0 100%, ${cropRect.x}px 100%, ${cropRect.x}px ${cropRect.y}px, ${cropRect.x + cropRect.w}px ${cropRect.y}px, ${cropRect.x + cropRect.w}px ${cropRect.y + cropRect.h}px, ${cropRect.x}px ${cropRect.y + cropRect.h}px, ${cropRect.x}px 100%, 100% 100%, 100% 0)`,
                      }} />
                      <div style={{
                        position: 'absolute',
                        left: cropRect.x, top: cropRect.y,
                        width: cropRect.w, height: cropRect.h,
                        border: '2px solid #D4AF6A',
                        boxShadow: '0 0 0 1px rgba(0,0,0,0.5), 0 0 12px rgba(212,175,106,0.4)',
                        pointerEvents: 'none',
                      }} />
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button
              onClick={() => runIdentify(true)}
              disabled={!cropIsValid}
              style={{
                padding: '10px 20px', borderRadius: 10, fontSize: 13,
                background: cropIsValid ? 'linear-gradient(135deg, #D4AF6A, #B8860B)' : 'rgba(255,255,255,0.04)',
                color: cropIsValid ? '#1a1a1a' : '#5a5a5a',
                border: '1px solid rgba(212,175,106,0.3)',
                cursor: cropIsValid ? 'pointer' : 'not-allowed',
                fontFamily: 'inherit', fontWeight: 600,
              }}
            >
              ✓ 框选识别
            </button>
            <button
              onClick={() => runIdentify(false)}
              style={{
                padding: '10px 20px', borderRadius: 10, fontSize: 13,
                background: 'rgba(255,255,255,0.04)', color: '#D4AF6A',
                border: '1px solid rgba(255,255,255,0.08)',
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              整图识别
            </button>
            <button onClick={handleReset} style={{
              padding: '10px 20px', borderRadius: 10, fontSize: 13,
              background: 'transparent', color: '#6A6A6A',
              border: '1px solid rgba(255,255,255,0.05)',
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
              换一张
            </button>
          </div>
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
            最像的纹样
          </div>

          {matches.map((match, idx) => {
            const pattern = getPatternById(match.patternId)
            if (!pattern) return null
            const { label, color } = similarityLabel(match.score)

            return (
              <div key={match.patternId} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: 12, marginBottom: 8,
                background: idx === 0 ? 'rgba(201,162,60,0.08)' : 'rgba(255,255,255,0.02)',
                borderRadius: 12,
                border: `1px solid ${idx === 0 ? 'rgba(201,162,60,0.2)' : 'rgba(255,255,255,0.05)'}`,
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: idx === 0 ? 'rgba(201,162,60,0.2)' : 'rgba(255,255,255,0.05)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 700, color: idx === 0 ? '#F2D58A' : '#6A6A6A',
                  flexShrink: 0,
                }}>
                  {idx + 1}
                </div>

                <div style={{
                  width: 48, height: 48, borderRadius: 8, overflow: 'hidden',
                  background: 'rgba(0,0,0,0.3)', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <PatternImage src={getPatternImage(pattern)} alt={pattern.name} fallbackSize={24} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                </div>

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

                <div style={{
                  fontSize: 12, fontWeight: 600, color,
                  padding: '3px 8px', borderRadius: 8,
                  background: 'rgba(0,0,0,0.3)',
                  flexShrink: 0,
                }}>
                  {label}
                </div>
              </div>
            )
          })}

          <div style={{
            fontSize: 11, color: '#5a5a5a', textAlign: 'center',
            marginTop: 12, fontStyle: 'italic',
          }}>
            本地特征匹配，结果仅供参考 · 想精确识别同一张图请上传库内原图
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 10, marginTop: 20, justifyContent: 'center' }}>
            <button onClick={() => setMatchState('crop')} style={{
              padding: '10px 24px', borderRadius: 10, fontSize: 13,
              background: 'rgba(255,255,255,0.04)', color: '#D4AF6A',
              border: '1px solid rgba(255,255,255,0.08)',
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
              重新框选
            </button>
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
