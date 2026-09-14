import { useMemo } from 'react'
import { useNavigate } from '../components/common/Router'
import { useApp } from '../store/AppState'
import { getPatternById, getPatternImage, getRarityLabel, getSeriesInfo } from '../store/patternData'
import { PATTERN_DESCRIPTIONS } from '../data/patternDescriptions'
import { getArtifactsForPattern, ARTIFACT_DIR } from '../data/artifactMap'
import PatternImage from '../components/common/PatternImage'
import SealStamp from '../components/common/SealStamp'

const GOLD_MAIN = '#D4AF6A'
const GOLD_BRIGHT = '#F2D58A'
const TEXT_PRIMARY = '#F5F1E8'
const TEXT_SECONDARY = 'var(--color-text-secondary)'

/* 章节小标：编号 + 题 + 渐隐线 */
function Part({ no, title, children }) {
  return (
    <div style={{ marginTop: 48 }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        fontSize: 11, color: '#8A6A30', letterSpacing: '0.35em',
      }}>
        <span>{no}</span>
        <span>{title}</span>
        <span style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, rgba(212,175,106,0.35), transparent)' }} />
      </div>
      {children}
    </div>
  )
}

export default function PatternDetailPage() {
  const navigate = useNavigate()
  const { data } = useApp()

  // Parse pattern ID from hash: #/pattern/cloud-1 -> "cloud-1"
  const patternId = useMemo(() => {
    const hash = window.location.hash.slice(1) // remove #
    const match = hash.match(/^\/pattern\/(.+)$/)
    return match ? match[1] : null
  }, [])

  const pattern = patternId ? getPatternById(patternId) : undefined
  const description = patternId ? PATTERN_DESCRIPTIONS[patternId] : undefined
  const seriesInfo = pattern ? getSeriesInfo(pattern.series) : undefined
  const imgSrc = pattern ? getPatternImage(pattern) : ''
  const isOwned = pattern ? data.library.includes(pattern.id) : false
  const artifacts = patternId ? getArtifactsForPattern(patternId) : []
  const bgArtifact = artifacts[0]

  // ── Not found state ──
  if (!pattern) {
    return (
      <div style={{ padding: '16px', paddingBottom: '80px', minHeight: '100vh' }}>
        <button
          onClick={() => navigate('/library')}
          style={{
            background: 'none', border: 'none', color: GOLD_MAIN,
            fontSize: '14px', cursor: 'pointer', padding: '8px 0',
            fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '4px',
          }}
        >
          <span style={{ fontSize: '16px' }}>&#8592;</span> 返回图鉴
        </button>
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', minHeight: '60vh', color: '#4A4A4A',
        }}>
          <span style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.3 }}>&#9788;</span>
          <span style={{ fontSize: '16px', color: TEXT_SECONDARY }}>纹样未找到</span>
        </div>
      </div>
    )
  }

  const dynastyLine = [description?.dynasty, description?.period].filter(Boolean).join(' · ')
  const caption = [...new Set([pattern.type, ...pattern.tags.slice(0, 2)])].join(' · ')

  return (
    <div className="wm-vignette" style={{ position: 'relative', minHeight: '100vh', paddingBottom: '80px' }}>

      {/* ── 全屏文物开场 ── */}
      <div style={{ position: 'relative', height: 420, overflow: 'hidden' }}>
        {bgArtifact ? (
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: `url(${ARTIFACT_DIR}${bgArtifact.img})`,
            backgroundSize: 'cover', backgroundPosition: 'center',
            filter: 'saturate(0.85) brightness(0.9)',
          }} />
        ) : (
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: `url(${imgSrc})`,
            backgroundSize: '280px', backgroundRepeat: 'repeat',
            opacity: 0.05, filter: 'saturate(0.8)',
          }} />
        )}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(180deg, rgba(10,9,7,0.3) 0%, rgba(12,11,9,0.08) 40%, #0F0F10 100%)',
        }} />

        {/* 返回 */}
        <button
          onClick={() => navigate('/library')}
          style={{
            position: 'absolute', top: 14, left: 14, zIndex: 2,
            background: 'rgba(10,9,7,0.55)', border: 'none', color: GOLD_MAIN,
            fontSize: 13, cursor: 'pointer', padding: '7px 14px',
            fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: '4px',
            borderRadius: 16, backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
          }}
        >
          <span style={{ fontSize: '15px' }}>&#8592;</span> 图鉴
        </button>

        {/* 竖排大题（「·」保持端正姿态不随竖排旋转） */}
        <div style={{
          position: 'absolute', top: 34, right: 24, zIndex: 1,
          writingMode: 'vertical-rl', fontSize: 32, fontWeight: 700,
          letterSpacing: '0.34em', color: GOLD_BRIGHT, maxHeight: 360,
          textShadow: '0 2px 18px rgba(0,0,0,0.85)',
        }}>
          {[...pattern.name].map((ch, i) =>
            ch === '·' ? <span key={i} className="wm-vdot">·</span> : ch)}
        </div>

        {bgArtifact && (
          <div style={{
            position: 'absolute', bottom: 16, left: 16, zIndex: 1,
            fontSize: 10, color: 'rgba(245,241,232,0.78)', letterSpacing: '0.15em',
            background: 'rgba(10,9,7,0.55)', padding: '4px 10px', borderRadius: 10,
            backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
          }}>
            原型 · {bgArtifact.name}
          </div>
        )}
      </div>

      <div style={{ padding: '0 24px 30px', position: 'relative' }}>
        {/* ── 题名块 ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginTop: 24 }}>
          <div>
            <h2 style={{ fontSize: 42, fontWeight: 900, letterSpacing: '0.12em', color: TEXT_PRIMARY, lineHeight: 1.25 }}>
              {pattern.name}
            </h2>
            {/* 史实字段一行（品级已拆去图卡角标）；年代连字符统一全角 */}
            <div style={{ marginTop: 16, fontSize: 12, color: GOLD_MAIN, letterSpacing: '0.22em' }}>
              {(dynastyLine || pattern.type).replace(/(\d)\s*-\s*(\d)/g, '$1—$2')}
            </div>
          </div>
          {/* 系列红章（手工钤印质感） */}
          <div style={{ marginTop: 8, flexShrink: 0 }}>
            <SealStamp text={seriesInfo?.name || '纹脉'} fontSize={11} />
          </div>
        </div>

        {/* ── 纹样本体 ── */}
        <div style={{
          marginTop: 32, aspectRatio: '1.05', borderRadius: 3,
          background: 'radial-gradient(ellipse at 50% 42%, #1A1710, #0D0B08)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
          border: '1px solid rgba(212,175,106,0.16)',
        }}>
          <div style={{ position: 'absolute', inset: 12, border: '1px solid rgba(212,175,106,0.12)', pointerEvents: 'none' }} />
          <PatternImage
            src={imgSrc}
            alt={pattern.name}
            fallbackSize={48}
            style={{
              maxWidth: '78%', maxHeight: '78%', objectFit: 'contain',
              filter: pattern.rarity === 'ssr'
                ? 'drop-shadow(0 8px 34px rgba(201,162,60,0.35))'
                : 'drop-shadow(0 8px 34px rgba(0,0,0,0.7))',
            }}
          />
          {/* 品级角标：游戏化字段独立于史实行 */}
          <div style={{
            position: 'absolute', top: 12, left: 12,
            fontSize: 10, color: GOLD_BRIGHT, letterSpacing: '0.2em',
            background: 'rgba(15,15,16,0.7)', border: '1px solid rgba(212,175,106,0.35)',
            padding: '3px 10px', borderRadius: 10,
          }}>{getRarityLabel(pattern.rarity)}</div>
          {/* 收藏钤印：未藏=空心剪影，已藏=落章动效实心 */}
          <div style={{ position: 'absolute', top: 10, right: 12 }}>
            {isOwned
              ? <SealStamp text="已藏" variant="solid" fontSize={10} stamp />
              : <SealStamp text="未藏" variant="hollow" fontSize={10} />}
          </div>
        </div>
        <div style={{ textAlign: 'center', fontSize: 11, color: TEXT_SECONDARY, letterSpacing: '0.2em', marginTop: 16 }}>
          {caption}
        </div>

        {/* ── 壹 · 来历（首字下沉）── */}
        {description?.history && (
          <Part no="壹" title="来 历">
            <p className="wm-drop" style={{
              marginTop: 16, fontSize: 14.5, lineHeight: 2.3, color: '#C6C0B4',
              textAlign: 'justify', letterSpacing: '0.03em',
            }}>
              {description.history}
            </p>
          </Part>
        )}

        {/* ── 寓意金句（居中）── */}
        {description?.significance && (
          <div style={{ margin: '48px 12px 0', textAlign: 'center', position: 'relative', padding: '32px 10px' }}>
            <div style={{
              position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
              width: 60, height: 1, background: 'linear-gradient(90deg, transparent, #D4AF6A, transparent)',
            }} />
            <div style={{
              fontSize: 18, lineHeight: 2.1, color: GOLD_BRIGHT,
              letterSpacing: '0.12em', fontWeight: 600,
            }}>
              {description.significance}
            </div>
            <div style={{ marginTop: 16, fontSize: 11, color: '#8A6A30', letterSpacing: '0.3em' }}>— 它 的 寓 意</div>
            <div style={{
              position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)',
              width: 60, height: 1, background: 'linear-gradient(90deg, transparent, #D4AF6A, transparent)',
            }} />
          </div>
        )}

        {/* ── 贰 · 所在 ── */}
        {description?.usage && (
          <Part no="贰" title="所 在">
            <p style={{
              marginTop: 16, fontSize: 14.5, lineHeight: 2.3, color: '#C6C0B4',
              textAlign: 'justify', letterSpacing: '0.03em',
            }}>
              {description.usage}
            </p>
          </Part>
        )}

        {/* ── 掌故 ── */}
        {description?.funFact && (
          <div style={{
            marginTop: 48, padding: '24px 20px', borderRadius: 4,
            background: 'rgba(212,175,106,0.05)', border: '1px solid rgba(212,175,106,0.16)',
            position: 'relative',
          }}>
            <span style={{
              position: 'absolute', top: -9, left: 16, background: '#0F0F10',
              padding: '0 10px', fontSize: 11, color: GOLD_MAIN, letterSpacing: '0.3em',
            }}>掌 故</span>
            <p style={{ fontSize: 13, lineHeight: 2.1, color: '#B8B2A6' }}>
              {description.funFact}
            </p>
          </div>
        )}

        {/* ── 标签 ── */}
        {pattern.tags && pattern.tags.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center', marginTop: 40 }}>
            {pattern.tags.map(tag => (
              <span key={tag} style={{
                fontSize: 11,
                padding: '3px 10px', borderRadius: 12,
                background: 'rgba(212,175,106,0.08)',
                border: '1px solid rgba(212,175,106,0.12)',
                color: GOLD_MAIN,
                whiteSpace: 'nowrap',
              }}>
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* ── 收束 CTA ── */}
        <div style={{ marginTop: 48, textAlign: 'center', paddingTop: 32, borderTop: '1px solid rgba(212,175,106,0.14)' }}>
          <div style={{ fontSize: 15, color: GOLD_BRIGHT, letterSpacing: '0.2em', lineHeight: 2 }}>
            {isOwned ? '这道纹样，是某个古人的呼吸' : '这道纹样，还在等你收下'}
          </div>
          <div style={{ fontSize: 11, fontStyle: 'italic', color: '#8A6A30', marginTop: 8, fontFamily: 'Georgia, serif' }}>
            {isOwned ? 'A craftsman\'s breath, thousands of years ago' : 'Collect it, then keep it alive'}
          </div>
          <button
            onClick={() => navigate(isOwned ? '/puzzle' : '/gacha')}
            style={{
              marginTop: 24, background: 'transparent', border: '1px solid rgba(212,175,106,0.5)',
              color: GOLD_BRIGHT, fontFamily: 'inherit', fontSize: 13,
              letterSpacing: '0.4em', textIndent: '0.4em', padding: '12px 42px', borderRadius: 3, cursor: 'pointer',
            }}
          >
            {isOwned ? '接 续 这 条 纹 脉' : '去 抽 卡 收 它'}
          </button>
        </div>
      </div>
    </div>
  )
}
