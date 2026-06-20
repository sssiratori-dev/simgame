const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const game = {
  width: canvas.width,
  height: canvas.height,
  lastTime: 0,
  player: { x: 380, y: 280, w: 40, h: 40, speed: 260 },
  ball: { x: 160, y: 120, r: 18, dx: 140, dy: 180 },
  keys: { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false },
};

function reset() {
  game.player.x = 380;
  game.player.y = 280;
  game.ball.x = 160;
  game.ball.y = 120;
  game.ball.dx = 140;
  game.ball.dy = 180;
}

function update(dt) {
  const player = game.player;
  const speed = player.speed * dt;

  if (game.keys.ArrowUp) player.y -= speed;
  if (game.keys.ArrowDown) player.y += speed;
  if (game.keys.ArrowLeft) player.x -= speed;
  if (game.keys.ArrowRight) player.x += speed;

  player.x = Math.max(0, Math.min(game.width - player.w, player.x));
  player.y = Math.max(0, Math.min(game.height - player.h, player.y));

  const ball = game.ball;
  ball.x += ball.dx * dt;
  ball.y += ball.dy * dt;

  if (ball.x - ball.r < 0) {
    ball.x = ball.r;
    ball.dx *= -1;
  } else if (ball.x + ball.r > game.width) {
    ball.x = game.width - ball.r;
    ball.dx *= -1;
  }

  if (ball.y - ball.r < 0) {
    ball.y = ball.r;
    ball.dy *= -1;
  } else if (ball.y + ball.r > game.height) {
    ball.y = game.height - ball.r;
    ball.dy *= -1;
  }

  const closestX = Math.max(player.x, Math.min(ball.x, player.x + player.w));
  const closestY = Math.max(player.y, Math.min(ball.y, player.y + player.h));
  const dx = ball.x - closestX;
  const dy = ball.y - closestY;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance < ball.r) {
    const overlap = ball.r - distance;
    if (distance !== 0) {
      ball.x += (dx / distance) * overlap;
      ball.y += (dy / distance) * overlap;
    }
    if (Math.abs(dx) > Math.abs(dy)) {
      ball.dx *= -1;
    } else {
      ball.dy *= -1;
    }
  }
}

function draw() {
  ctx.clearRect(0, 0, game.width, game.height);

  ctx.fillStyle = '#111';
  ctx.fillRect(0, 0, game.width, game.height);

  ctx.strokeStyle = '#444';
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, game.width, game.height);

  ctx.fillStyle = '#0bf';
  ctx.fillRect(game.player.x, game.player.y, game.player.w, game.player.h);

  ctx.fillStyle = '#f60';
  ctx.beginPath();
  ctx.arc(game.ball.x, game.ball.y, game.ball.r, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#fff';
  ctx.font = '18px sans-serif';
  ctx.fillText('2D コードサンプル: プレイヤー + ボール', 16, 26);
}

function gameLoop(timestamp) {
  const dt = (timestamp - game.lastTime) / 1000 || 0;
  game.lastTime = timestamp;

  update(dt);
  draw();

  requestAnimationFrame(gameLoop);
}

window.addEventListener('keydown', (event) => {
  if (event.code === 'Space') {
    reset();
    return;
  }
  if (event.code in game.keys) {
    game.keys[event.code] = true;
    event.preventDefault();
  }
});

window.addEventListener('keyup', (event) => {
  if (event.code in game.keys) {
    game.keys[event.code] = false;
    event.preventDefault();
  }
});

reset();
requestAnimationFrame(gameLoop);
