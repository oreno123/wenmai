// src/pages/demo/SeriesDemoPage.tsx
// Internal visual verification page for the 12 series themes.
// Plan 3 will register the route /demo/series/:id.
// Visit /demo/series/qinghua, /demo/series/cloud, etc. to check each skin.

import { useParams } from 'react-router-dom'
import { SeriesSkin, Button, Card, PatternImage } from '../../design-system'
import SplittingText from '../../design-system/visual/SplittingText'
import { SERIES_THEMES } from '../../design-system/series/themes'

export default function SeriesDemoPage() {
  const { id = 'neutral' } = useParams<{ id: string }>()
  const theme = SERIES_THEMES[id] ?? SERIES_THEMES.neutral

  return (
    <SeriesSkin series={id} intensity="full" style={{ minHeight: '100vh' }}>
      <div style={{ padding: 24, position: 'relative', zIndex: 3 }}>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'var(--text-display, 48px)',
            margin: 0,
            color: 'var(--series-text)',
          }}
        >
          <SplittingText text={theme.name} />
        </h1>
        <p
          style={{
            color: 'var(--color-text-secondary)',
            marginTop: 8,
            fontSize: 14,
          }}
        >
          series id: <code>{theme.id}</code> · primary <code>{theme.primary}</code>
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 16,
            marginTop: 32,
          }}
        >
          <Card header={<div>Sample Card</div>}>
            <PatternImage
              src={`/patterns/${id}-sample.webp`}
              alt="sample"
              size="lg"
              fallback={<div>sample missing</div>}
            />
          </Card>

          <Card header={<div>Buttons</div>}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
            </div>
          </Card>

          <Card header={<div>Theme dump</div>}>
            <pre
              style={{
                color: 'var(--color-text-secondary)',
                fontSize: 12,
                margin: 0,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}
            >
              {JSON.stringify(theme, null, 2)}
            </pre>
          </Card>
        </div>
      </div>
    </SeriesSkin>
  )
}
