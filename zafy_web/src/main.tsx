import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// Pas de menu « Enregistrer / Copier l'image » (clic droit) ni de glisser-déposer sur les images
const isImage = (target: EventTarget | null) => target instanceof Element && target.closest('img, svg') !== null
document.addEventListener('contextmenu', (e) => {
  if (isImage(e.target)) e.preventDefault()
})
document.addEventListener('dragstart', (e) => {
  if (isImage(e.target)) e.preventDefault()
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
