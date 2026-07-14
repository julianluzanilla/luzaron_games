import './style.css'
import { mountApp } from './app/app'

mountApp()

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch((error) => {
      console.error('Service Worker registration failed:', error)
    })
  })
}
