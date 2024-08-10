import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css'

createRoot(document.getElementById('clinicalcoach_ui_container')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
