import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './app/App'

const rootEl = document.getElementById('root')!

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
