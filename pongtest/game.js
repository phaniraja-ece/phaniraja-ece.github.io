const canvas = document.getElementById('pongCanvas');
const ctx = canvas.getContext('2d');

// Game settings
const PADDLE_WIDTH = 12;
const PADDLE_HEIGHT = 90;
const BALL_RADIUS = 12;
const CANVAS_WIDTH = canvas.width;
const CANVAS_HEIGHT = canvas.height;

// Paddles
let leftPaddle = {
    x: 20,
    y: (CANVAS_HEIGHT - PADDLE_HEIGHT) / 2,
    width: PADDLE_WIDTH,
    height: PADDLE_HEIGHT,
    speed: 8
};

let rightPaddle = {
    x: CANVAS_WIDTH - 20 - PADDLE_WIDTH,
    y: (CANVAS_HEIGHT - PADDLE_HEIGHT) / 2,
    width: PADDLE_WIDTH,
    height: PADDLE_HEIGHT,
    speed: 5
};

// Ball
let ball = {
    x: CANVAS_WIDTH / 2,
    y: CANVAS_HEIGHT / 2,
    vx: 6 * (Math.random() > 0.5 ? 1 : -1),
    vy: 4 * (Math.random() > 0.5 ? 1 : -1),
    radius: BALL_RADIUS
};

// Mouse control
canvas.addEventListener('mousemove', function(e) {
    // Get mouse position relative to canvas
    const rect = canvas.getBoundingClientRect();
    const mouseY = e.clientY - rect.top;
    // Center paddle on mouse Y
    leftPaddle.y = mouseY - leftPaddle.height / 2;
    // Clamp within canvas
    if (leftPaddle.y < 0) leftPaddle.y = 0;
    if (leftPaddle.y + leftPaddle.height > CANVAS_HEIGHT)
        leftPaddle.y = CANVAS_HEIGHT - leftPaddle.height;
});

// AI for right paddle
function moveRightPaddle() {
    // Simple AI: move towards ball's y position
    let center = rightPaddle.y + rightPaddle.height / 2;
    if (ball.y < center - 8) {
        rightPaddle.y -= rightPaddle.speed;
    } else if (ball.y > center + 8) {
        rightPaddle.y += rightPaddle.speed;
    }
    // Clamp within canvas
    if (rightPaddle.y < 0) rightPaddle.y = 0;
    if (rightPaddle.y + rightPaddle.height > CANVAS_HEIGHT)
        rightPaddle.y = CANVAS_HEIGHT - rightPaddle.height;
}

// Collision detection
function checkPaddleCollision(paddle) {
    // Closest point on paddle to ball
    let closestY = Math.max(paddle.y, Math.min(ball.y, paddle.y + paddle.height));
    let closestX = Math.max(paddle.x, Math.min(ball.x, paddle.x + paddle.width));
    let dx = ball.x - closestX;
    let dy = ball.y - closestY;
    return (dx * dx + dy * dy) < (ball.radius * ball.radius);
}

// Game loop
function draw() {
    // Clear canvas
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw middle line
    ctx.strokeStyle = "#444";
    ctx.setLineDash([10, 15]);
    ctx.beginPath();
    ctx.moveTo(CANVAS_WIDTH / 2, 0);
    ctx.lineTo(CANVAS_WIDTH / 2, CANVAS_HEIGHT);
    ctx.stroke();
    ctx.setLineDash([]);

    // Draw paddles
    ctx.fillStyle = "#00ccff";
    ctx.fillRect(leftPaddle.x, leftPaddle.y, leftPaddle.width, leftPaddle.height);
    ctx.fillStyle = "#ff6600";
    ctx.fillRect(rightPaddle.x, rightPaddle.y, rightPaddle.width, rightPaddle.height);

    // Draw ball
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = "#fff";
    ctx.fill();

    // Update ball position
    ball.x += ball.vx;
    ball.y += ball.vy;

    // Ball collision with top/bottom
    if (ball.y - ball.radius < 0) {
        ball.y = ball.radius;
        ball.vy *= -1;
    }
    if (ball.y + ball.radius > CANVAS_HEIGHT) {
        ball.y = CANVAS_HEIGHT - ball.radius;
        ball.vy *= -1;
    }

    // Ball collision with paddles
    if (checkPaddleCollision(leftPaddle)) {
        ball.x = leftPaddle.x + leftPaddle.width + ball.radius;
        ball.vx *= -1.07; // Slightly speed up
        // Add some "spin" based on where it hit the paddle
        let hitPos = (ball.y - (leftPaddle.y + leftPaddle.height / 2)) / (leftPaddle.height / 2);
        ball.vy += hitPos * 4;
    } else if (checkPaddleCollision(rightPaddle)) {
        ball.x = rightPaddle.x - ball.radius;
        ball.vx *= -1.07;
        let hitPos = (ball.y - (rightPaddle.y + rightPaddle.height / 2)) / (rightPaddle.height / 2);
        ball.vy += hitPos * 4;
    }

    // Ball out of bounds: reset
    if (ball.x - ball.radius < 0 || ball.x + ball.radius > CANVAS_WIDTH) {
        // Reset ball to center
        ball.x = CANVAS_WIDTH / 2;
        ball.y = CANVAS_HEIGHT / 2;
        ball.vx = 6 * (Math.random() > 0.5 ? 1 : -1);
        ball.vy = 4 * (Math.random() > 0.5 ? 1 : -1);
    }

    // Move right paddle (AI)
    moveRightPaddle();

    requestAnimationFrame(draw);
}

// Start game
draw();