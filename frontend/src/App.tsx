import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import GameScene from './game/scenes/GameScene'

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <Routes>
          <Route path="/" element={
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              justifyContent: 'center', 
              height: '100vh',
              gap: '20px'
            }}>
              <h1> Home / Login</h1>
              <Link to="/game">
                <button style={{
                  padding: '15px 30px',
                  fontSize: '18px',
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}>
                  Play ROGUE_42
                </button>
              </Link>
            </div>
          } />
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
