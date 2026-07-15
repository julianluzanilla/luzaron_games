import './style.css'
import { bootstrapApp } from './app/bootstrap'
import { mountApp } from './app/app'

mountApp()

bootstrapApp().catch((error) => {
  console.error('Bootstrap failed:', error)
})

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch((error) => {
      console.error('Service Worker registration failed:', error)
    })
  })
}
