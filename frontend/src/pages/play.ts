export function PlayPage(): string {
  return `
    <div class="container play-page">
      <h1>Play Pong</h1>

      <div class="game-container">
        <canvas id="pong-canvas" width="800" height="600"></canvas>
      </div>

      <div class="game-controls">
        <div class="control-info">
          <h3>Controls</h3>
          <p><strong>Player 1:</strong> W (up) / S (down)</p>
          <p><strong>Player 2:</strong> ↑ (up) / ↓ (down)</p>
        </div>

        <button id="start-game-btn" class="btn btn-primary">Start Game</button>
        <button id="reset-game-btn" class="btn">Reset</button>
      </div>

      <div class="score-board">
        <div class="score">
          <h3>Player 1</h3>
          <span id="player1-score">0</span>
        </div>
        <div class="score">
          <h3>Player 2</h3>
          <span id="player2-score">0</span>
        </div>
      </div>
    </div>
  `;
}
