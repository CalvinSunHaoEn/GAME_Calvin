const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('scoreValue');
const livesElement = document.getElementById('livesValue');

// Game constants
const GRID_SIZE = 40;
const PLAYER_SIZE = 30;
const OBSTACLE_HEIGHT = 30;
const OBSTACLE_WIDTH = 60;
const INVULNERABILITY_DURATION = 1500; // 1.5 seconds of invulnerability after hit

// Game state
let score = 0;
let lives = 3;
let gameOver = false;
let isInvulnerable = false;

// Player
const player = {
    x: canvas.width / 2 - PLAYER_SIZE / 2,
    y: canvas.height - GRID_SIZE,
    width: PLAYER_SIZE,
    height: PLAYER_SIZE,
    speed: GRID_SIZE,
    draw() {
        ctx.fillStyle = isInvulnerable ? 'rgba(0, 255, 0, 0.5)' : '#00ff00';
        ctx.fillRect(this.x, this.y, this.width, this.height);
    },
    move(direction) {
        if (gameOver) return;
        
        switch(direction) {
            case 'up':
                if (this.y - this.speed >= 0) this.y -= this.speed;
                break;
            case 'down':
                if (this.y + this.speed <= canvas.height - this.height) this.y += this.speed;
                break;
            case 'left':
                if (this.x - this.speed >= 0) this.x -= this.speed;
                break;
            case 'right':
                if (this.x + this.speed <= canvas.width - this.width) this.x += this.speed;
                break;
        }

        // Check if player reached the top
        if (this.y === 0) {
            score += 1;
            scoreElement.textContent = score;
            this.reset();
        }
    },
    reset() {
        this.x = canvas.width / 2 - PLAYER_SIZE / 2;
        this.y = canvas.height - GRID_SIZE;
    }
};

// Obstacles
class Obstacle {
    constructor(y, speed, direction, type = 'normal') {
        this.width = OBSTACLE_WIDTH;
        this.height = OBSTACLE_HEIGHT;
        this.y = y;
        this.baseY = y;  // Store original Y position for oscillating
        this.speed = speed;
        this.baseSpeed = speed;  // Store original speed for speed-changing
        this.direction = direction;
        this.x = direction > 0 ? -this.width : canvas.width;
        this.type = type;
        
        // Properties for oscillating obstacles
        this.verticalSpeed = 1;
        this.verticalRange = 30;
        
        // Properties for speed-changing obstacles
        this.speedChangeTimer = 0;
        this.speedChangeInterval = 120;  // Frames between speed changes
        this.speedMultiplier = 1;
    }

    draw() {
        switch(this.type) {
            case 'oscillating':
                ctx.fillStyle = '#800080';  // Purple
                break;
            case 'speed-changing':
                ctx.fillStyle = '#FFA500';  // Orange
                break;
            default:
                ctx.fillStyle = '#ff0000';  // Red
        }
        ctx.fillRect(this.x, this.y, this.width, this.height);
    }

    update() {
        // Type-specific updates
        switch(this.type) {
            case 'oscillating':
                // Oscillate up and down
                this.y = this.baseY + Math.sin(Date.now() / 200) * this.verticalRange;
                break;
            case 'speed-changing':
                // Change speed periodically
                this.speedChangeTimer++;
                if (this.speedChangeTimer >= this.speedChangeInterval) {
                    this.speedMultiplier = this.speedMultiplier === 1 ? 2 : 1;
                    this.speedChangeTimer = 0;
                }
                break;
        }

        // Update horizontal position
        const currentSpeed = this.baseSpeed * (this.type === 'speed-changing' ? this.speedMultiplier : 1);
        this.x += currentSpeed * this.direction;

        // Reset position when off screen
        if (this.direction > 0 && this.x > canvas.width) {
            this.x = -this.width;
        } else if (this.direction < 0 && this.x < -this.width) {
            this.x = canvas.width;
        }
    }
}

// Create obstacles
const obstacles = [
    new Obstacle(GRID_SIZE * 2, 2, 1, 'normal'),
    new Obstacle(GRID_SIZE * 3, 3, -1, 'oscillating'),
    new Obstacle(GRID_SIZE * 4, 4, 1, 'speed-changing'),
    new Obstacle(GRID_SIZE * 5, 2, -1, 'oscillating'),
    new Obstacle(GRID_SIZE * 6, 3, 1, 'speed-changing')
];

// Collision detection
function checkCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

// Game loop
function gameLoop() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw safe zones
    ctx.fillStyle = '#4CAF50';
    ctx.fillRect(0, 0, canvas.width, GRID_SIZE);
    ctx.fillRect(0, canvas.height - GRID_SIZE, canvas.width, GRID_SIZE);

    // Update and draw obstacles
    obstacles.forEach(obstacle => {
        obstacle.update();
        obstacle.draw();
        
        // Check collision with player
        if (checkCollision(player, obstacle) && !isInvulnerable) {
            lives--;
            livesElement.textContent = lives;
            
            if (lives <= 0) {
                gameOver = true;
            } else {
                isInvulnerable = true;
                player.reset();
                setTimeout(() => {
                    isInvulnerable = false;
                }, INVULNERABILITY_DURATION);
            }
        }
    });

    // Draw player
    player.draw();

    // Game over screen
    if (gameOver) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = 'white';
        ctx.font = '30px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Game Over!', canvas.width / 2, canvas.height / 2);
        ctx.font = '20px Arial';
        ctx.fillText('Press Space to Restart', canvas.width / 2, canvas.height / 2 + 40);
        return;
    }

    requestAnimationFrame(gameLoop);
}

// Keyboard controls
document.addEventListener('keydown', (e) => {
    switch(e.key) {
        case 'ArrowUp':
            player.move('up');
            break;
        case 'ArrowDown':
            player.move('down');
            break;
        case 'ArrowLeft':
            player.move('left');
            break;
        case 'ArrowRight':
            player.move('right');
            break;
        case ' ':
            if (gameOver) {
                gameOver = false;
                score = 0;
                lives = 3;
                scoreElement.textContent = score;
                livesElement.textContent = lives;
                isInvulnerable = false;
                player.reset();
                gameLoop();
            }
            break;
    }
});

// Click/touch controls
canvas.addEventListener('click', (e) => {
    if (gameOver) {
        // Handle restart click
        gameOver = false;
        score = 0;
        lives = 3;
        scoreElement.textContent = score;
        livesElement.textContent = lives;
        isInvulnerable = false;
        player.reset();
        gameLoop();
        return;
    }

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    
    // Determine movement based on click position relative to player
    const playerCenterX = player.x + player.width / 2;
    const playerCenterY = player.y + player.height / 2;
    
    const xDiff = clickX - playerCenterX;
    const yDiff = clickY - playerCenterY;
    
    // Move in the direction of the largest difference
    if (Math.abs(xDiff) > Math.abs(yDiff)) {
        player.move(xDiff > 0 ? 'right' : 'left');
    } else {
        player.move(yDiff > 0 ? 'down' : 'up');
    }
});

// Start the game
gameLoop();
