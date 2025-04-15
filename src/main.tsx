import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Preload critical routes to improve perceived performance
// This tells the browser to start fetching these chunks early
const preloadRoutes = () => {
  // Only preload in production to avoid unnecessary network requests during development
  if (import.meta.env.MODE === 'production') {
    // Preload core routes that are likely to be needed immediately
    import('./pages/HomePage.tsx')

    // After a short delay, preload auth-related routes that might be needed soon
    setTimeout(() => {
      import('./pages/LoginPage.tsx')
      import('./pages/RegisterPage.tsx')
    }, 1000)
  }
}

// Start preloading after the main app has rendered
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Initialize preloading
preloadRoutes()
