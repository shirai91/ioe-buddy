import '@fontsource/baloo-2/latin-800.css'
import '@fontsource/baloo-2/latin-ext-800.css'
import '@fontsource/baloo-2/vietnamese-800.css'
import '@fontsource/nunito/latin-600.css'
import '@fontsource/nunito/latin-700.css'
import '@fontsource/nunito/latin-800.css'
import '@fontsource/nunito/latin-ext-600.css'
import '@fontsource/nunito/latin-ext-700.css'
import '@fontsource/nunito/latin-ext-800.css'
import '@fontsource/nunito/vietnamese-600.css'
import '@fontsource/nunito/vietnamese-700.css'
import '@fontsource/nunito/vietnamese-800.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import BackendGate from './components/BackendGate.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BackendGate>
      <App />
    </BackendGate>
  </StrictMode>,
)
