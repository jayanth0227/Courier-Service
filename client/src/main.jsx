import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { initSecurityProtection } from './utils/securityProtection'

// Initialize anti-inspection and right-click protection
initSecurityProtection();

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

