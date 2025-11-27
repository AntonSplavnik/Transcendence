import { BrowserRouter, Routes, Route } from 'react-router-dom'
import GameScene from './scenes/GameScene'

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <Routes>
          <Route path="/" element={<div>🏠 Home / Login</div>} />
          <Route path="/lobby" element={<div>🎮 Lobby</div>} />
          <Route path="/game" element={<GameScene />} />
          <Route path="/profile" element={<div>👤 Profile</div>} />
          <Route path="/stats" element={<div>📊 Stats</div>} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}

export default App
