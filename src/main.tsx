import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { installFetchInstrumentation } from './utils/instrumentFetch'
import './index.css'

installFetchInstrumentation()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
