import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { RoomProvider } from './context/RoomContext'   // ⬅️ add this import

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RoomProvider>   {/* ⬅️ wrap App so context is available */}
      <App />
    </RoomProvider>
  </React.StrictMode>,
)
