export function HomePage(): string {
  return `
    <div class="container home-page">
      <h1>Welcome to Transcendence</h1>
      <p class="subtitle">The ultimate Pong experience</p>

      <div class="home-grid">
        <div class="card">
          <h2>🎮 Play Now</h2>
          <p>Jump into a quick match</p>
          <a href="#" data-route="play" class="btn">Play</a>
        </div>

        <div class="card">
          <h2>🏆 Tournaments</h2>
          <p>Compete in tournaments</p>
          <a href="#" data-route="tournament" class="btn">View Tournaments</a>
        </div>

        <div class="card">
          <h2>📊 Stats</h2>
          <p>View your statistics</p>
          <button class="btn" disabled>Coming Soon</button>
        </div>
      </div>

      <div class="features">
        <h3>Features</h3>
        <ul>
          <li>✅ Real-time multiplayer gameplay</li>
          <li>✅ Tournament system</li>
          <li>✅ Server-side game logic</li>
          <li>✅ User authentication</li>
          <li>🚧 Match history (coming soon)</li>
          <li>🚧 Leaderboards (coming soon)</li>
        </ul>
      </div>
    </div>
  `;
}
