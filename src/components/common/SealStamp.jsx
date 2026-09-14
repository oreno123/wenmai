import { useId } from 'react'
import { motion } from 'framer-motion'

/* 手工钤印：不规则篆刻边框 + feTurbulence 印泥噪点。
   variant 'solid' = 阴文（红底米字）｜'hollow' = 阳文空心剪影（红字红框）
   vertical = 竖排文字；stamp = 落章动效（scale 1.15 回弹 + 轻微旋抖） */
export default function SealStamp({
  text,
  variant = 'solid',
  vertical = true,
  stamp = false,
  fontSize = 11,
  color = '#F5F1E8',
  red = '#BC1F28',
  style = {},
}) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const solid = variant === 'solid'
  const ink = red

  const body = (
    <div style={{
      position: 'relative',
      display: 'inline-flex',
      alignItems: 'center', justifyContent: 'center',
      writingMode: vertical ? 'vertical-rl' : 'horizontal-tb',
      padding: vertical ? '10px 7px' : '7px 10px',
      fontFamily: "'Noto Serif SC', serif",
      fontWeight: 600,
      fontSize,
      letterSpacing: '0.22em', textIndent: '0.22em',
      color: solid ? color : ink,
      lineHeight: 1.15,
      // 印文不严格居中：手工钤印本就略偏
      transform: 'translate(0.5px, -0.5px)',
      ...style,
    }}>
      {/* 篆刻边框：四角不对齐 + 边线微弯 */}
      <svg viewBox="0 0 100 100" preserveAspectRatio="none"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
        <defs>
          <filter id={`n${uid}`} x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="0.55" numOctaves="2" seed="7" result="n" />
            <feColorMatrix in="n" type="matrix"
              values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.55 0" result="a" />
            {/* SourceGraphic(红) 为色源，噪声 alpha 做遮罩 → 红底斑驳印泥 */}
            <feComposite in="SourceGraphic" in2="a" operator="in" />
          </filter>
        </defs>
        {/* 印底（阴文）：实心红 + 噪点蚀边 */}
        {solid && (
          <path
            d="M7,5 C34,3.5 68,4 94,6 C96.5,32 96,64 94.5,94 C62,96.5 30,95.5 5,94 C3.5,62 4.5,32 7,5 Z"
            fill={ink}
            filter={`url(#n${uid})`}
          />
        )}
        {/* 边框：无论阴文阳文都有篆刻框线 */}
        <path
          d="M7,5 C34,3.5 68,4 94,6 C96.5,32 96,64 94.5,94 C62,96.5 30,95.5 5,94 C3.5,62 4.5,32 7,5 Z"
          fill="none" stroke={ink} strokeWidth={solid ? 2 : 2.6}
          filter={`url(#n${uid})`}
        />
      </svg>
      <span style={{ position: 'relative' }}>{text}</span>
    </div>
  )

  if (!stamp) return body
  return (
    <motion.div
      initial={{ scale: 1.15, rotate: 3, opacity: 0 }}
      animate={{ scale: 1, rotate: 0, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 600, damping: 24, mass: 0.6 }}
      style={{ display: 'inline-flex' }}
    >
      {body}
    </motion.div>
  )
}
