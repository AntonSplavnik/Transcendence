/**
 * Server-side Pong Game Engine
 * Handles all game physics and state
 */
export class PongGame {
  constructor(player1, player2) {
    // Game dimensions
    this.width = 800;
    this.height = 600;

    // Players
    this.player1 = {
      alias: player1,
      y: this.height / 2 - 50,
      score: 0,
      paddleHeight: 100,
      paddleWidth: 10,
      speed: 5
    };

    this.player2 = {
      alias: player2,
      y: this.height / 2 - 50,
      score: 0,
      paddleHeight: 100,
      paddleWidth: 10,
      speed: 5
    };

    // Ball
    this.ball = {
      x: this.width / 2,
      y: this.height / 2,
      radius: 8,
      speedX: 5,
      speedY: 3,
      maxSpeed: 12
    };

    this.gameState = 'waiting'; // waiting, playing, paused, finished
    this.winner = null;
    this.maxScore = 5;
    this.lastUpdate = Date.now();
  }

  // Move paddle
  movePaddle(player, direction) {
    const paddle = player === 1 ? this.player1 : this.player2;

    if (direction === 'up') {
      paddle.y = Math.max(0, paddle.y - paddle.speed);
    } else if (direction === 'down') {
      paddle.y = Math.min(this.height - paddle.paddleHeight, paddle.y + paddle.speed);
    }
  }

  // Update game state (called every frame)
  update() {
    if (this.gameState !== 'playing') return;

    const now = Date.now();
    const deltaTime = (now - this.lastUpdate) / 16.67; // Normalize to 60fps
    this.lastUpdate = now;

    // Update ball position
    this.ball.x += this.ball.speedX * deltaTime;
    this.ball.y += this.ball.speedY * deltaTime;

    // Ball collision with top/bottom walls
    if (this.ball.y - this.ball.radius <= 0 || this.ball.y + this.ball.radius >= this.height) {
      this.ball.speedY = -this.ball.speedY;
    }

    // Ball collision with player 1 paddle (left)
    if (
      this.ball.x - this.ball.radius <= this.player1.paddleWidth &&
      this.ball.y >= this.player1.y &&
      this.ball.y <= this.player1.y + this.player1.paddleHeight
    ) {
      this.ball.speedX = Math.abs(this.ball.speedX);
      // Add some variation based on where ball hits paddle
      const hitPos = (this.ball.y - this.player1.y) / this.player1.paddleHeight;
      this.ball.speedY = (hitPos - 0.5) * 10;
    }

    // Ball collision with player 2 paddle (right)
    if (
      this.ball.x + this.ball.radius >= this.width - this.player2.paddleWidth &&
      this.ball.y >= this.player2.y &&
      this.ball.y <= this.player2.y + this.player2.paddleHeight
    ) {
      this.ball.speedX = -Math.abs(this.ball.speedX);
      const hitPos = (this.ball.y - this.player2.y) / this.player2.paddleHeight;
      this.ball.speedY = (hitPos - 0.5) * 10;
    }

    // Score points
    if (this.ball.x - this.ball.radius <= 0) {
      // Player 2 scores
      this.player2.score++;
      this.resetBall();
    } else if (this.ball.x + this.ball.radius >= this.width) {
      // Player 1 scores
      this.player1.score++;
      this.resetBall();
    }

    // Check for winner
    if (this.player1.score >= this.maxScore) {
      this.gameState = 'finished';
      this.winner = this.player1.alias;
    } else if (this.player2.score >= this.maxScore) {
      this.gameState = 'finished';
      this.winner = this.player2.alias;
    }
  }

  resetBall() {
    this.ball.x = this.width / 2;
    this.ball.y = this.height / 2;
    this.ball.speedX = -this.ball.speedX;
    this.ball.speedY = Math.random() * 6 - 3;
  }

  start() {
    this.gameState = 'playing';
    this.lastUpdate = Date.now();
  }

  pause() {
    this.gameState = 'paused';
  }

  // Get current game state (to send to clients)
  getState() {
    return {
      gameState: this.gameState,
      player1: {
        alias: this.player1.alias,
        y: this.player1.y,
        score: this.player1.score
      },
      player2: {
        alias: this.player2.alias,
        y: this.player2.y,
        score: this.player2.score
      },
      ball: {
        x: this.ball.x,
        y: this.ball.y
      },
      winner: this.winner
    };
  }
}
