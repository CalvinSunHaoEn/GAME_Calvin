// Initialize game state
let score = 0;
let lives = 3;
let gameOver = false;
let isInvulnerable = false;
let records = [];

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('Game initializing...');
    
    // Get DOM elements
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    const scoreElement = document.getElementById('scoreValue');
    const livesElement = document.getElementById('livesValue');
    const nameModal = document.getElementById('nameModal');
    const playerNameInput = document.getElementById('playerName');
    const submitNameButton = document.getElementById('submitName');
    const recordsList = document.getElementById('recordsList');

    // Game constants
    const GRID_SIZE = 40;
    const PLAYER_SIZE = 30;
    const OBSTACLE_HEIGHT = 40;
    const OBSTACLE_WIDTH = 80;
    const INVULNERABILITY_DURATION = 1500;
    const MAX_RECORDS = 10;

    // Initialize records
    records = JSON.parse(localStorage.getItem('froggerRecords')) || [];

    // Records management
    function addRecord(name, score) {
        records.push({ name, score });
        records.sort((a, b) => b.score - a.score);
        if (records.length > MAX_RECORDS) {
            records = records.slice(0, MAX_RECORDS);
        }
        localStorage.setItem('froggerRecords', JSON.stringify(records));
        updateRecordsList();
    }

    function updateRecordsList() {
        recordsList.innerHTML = records.map((record, index) => `
            <div class="record-item">
                ${index + 1}. ${record.name}: ${record.score}
            </div>
        `).join('');
    }

    // Initialize records display
    updateRecordsList();

    // Name modal handling
    submitNameButton.addEventListener('click', () => {
        const name = playerNameInput.value.trim() || 'Anonymous';
        addRecord(name, score);
        nameModal.style.display = 'none';
        resetGame();
    });

    function resetGame() {
        console.log('Resetting game...');
        gameOver = false;
        score = 0;
        lives = 3;
        console.log('Lives reset to:', lives);
        updateGameState();
        isInvulnerable = false;
        player.reset();
        requestAnimationFrame(gameLoop);
    }

    // Update game state
    function updateGameState() {
        scoreElement.textContent = score;
        livesElement.textContent = lives;
    }

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
                updateGameState();
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
            this.baseY = y;
            this.speed = speed;
            this.baseSpeed = speed;
            this.direction = direction;
            this.x = direction > 0 ? -this.width : canvas.width;
            this.type = type;
            
            this.verticalSpeed = 1;
            this.verticalRange = 30;
            this.speedChangeTimer = 0;
            this.speedChangeInterval = 120;
            this.speedMultiplier = 1;
        }

        draw() {
            switch(this.type) {
                case 'oscillating':
                    ctx.fillStyle = '#800080';
                    break;
                case 'speed-changing':
                    ctx.fillStyle = '#FFA500';
                    break;
                default:
                    ctx.fillStyle = '#ff0000';
            }
            ctx.fillRect(this.x, this.y, this.width, this.height);
        }

        update() {
            switch(this.type) {
                case 'oscillating':
                    this.y = this.baseY + Math.sin(Date.now() / 200) * this.verticalRange;
                    break;
                case 'speed-changing':
                    this.speedChangeTimer++;
                    if (this.speedChangeTimer >= this.speedChangeInterval) {
                        this.speedMultiplier = this.speedMultiplier === 1 ? 2 : 1;
                        this.speedChangeTimer = 0;
                    }
                    break;
            }

            const currentSpeed = this.baseSpeed * (this.type === 'speed-changing' ? this.speedMultiplier : 1);
            this.x += currentSpeed * this.direction;

            if (this.direction > 0 && this.x > canvas.width) {
                this.x = -this.width;
            } else if (this.direction < 0 && this.x < -this.width) {
                this.x = canvas.width;
            }
        }
    }

    // Create obstacles
    const obstacles = [
        new Obstacle(GRID_SIZE * 2, 5, 1, 'normal'),
        new Obstacle(GRID_SIZE * 3, 6, -1, 'oscillating'),
        new Obstacle(GRID_SIZE * 4, 7, 1, 'speed-changing'),
        new Obstacle(GRID_SIZE * 5, 6, -1, 'oscillating'),
        new Obstacle(GRID_SIZE * 6, 7, 1, 'speed-changing')
    ];

    // Collision detection
    function checkCollision(rect1, rect2) {
        const buffer = 100;
        const movementBuffer = 50;
        
        let extendedX = rect2.x;
        let extendedWidth = rect2.width;
        if (rect2.direction > 0) {
            extendedWidth += movementBuffer;
        } else {
            extendedX -= movementBuffer;
            extendedWidth += movementBuffer;
        }
        
        return (rect1.x - buffer) < (extendedX + extendedWidth) &&
               (rect1.x + rect1.width + buffer) > extendedX &&
               (rect1.y - buffer) < (rect2.y + rect2.height) &&
               (rect1.y + rect1.height + buffer) > rect2.y;
    }

    // Game loop
    function gameLoop() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#4CAF50';
        ctx.fillRect(0, 0, canvas.width, GRID_SIZE);
        ctx.fillRect(0, canvas.height - GRID_SIZE, canvas.width, GRID_SIZE);

        obstacles.forEach(obstacle => {
            obstacle.update();
            obstacle.draw();
        });

        if (!gameOver && !isInvulnerable) {
            for (const obstacle of obstacles) {
                if (checkCollision(player, obstacle)) {
                    lives--;
                    console.log('Collision detected! Lives:', lives);
                    updateGameState();
                    
                    if (lives <= 0) {
                        lives = 0;
                        updateGameState();
                        gameOver = true;
                        break;
                    } else {
                        isInvulnerable = true;
                        player.reset();
                        setTimeout(() => {
                            isInvulnerable = false;
                        }, INVULNERABILITY_DURATION);
                        break;
                    }
                }
            }
        }

        player.draw();

        if (gameOver) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            nameModal.style.display = 'flex';
            playerNameInput.value = '';
            playerNameInput.focus();
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
        }
    });

    // Click/touch controls
    canvas.addEventListener('click', (e) => {
        if (gameOver) return;

        const rect = canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;
        
        player.x = clickX - player.width / 2;
        player.y = clickY - player.height / 2;
        
        player.x = Math.max(0, Math.min(canvas.width - player.width, player.x));
        player.y = Math.max(0, Math.min(canvas.height - player.height, player.y));

        if (!gameOver && !isInvulnerable) {
            obstacles.forEach(obstacle => obstacle.update());
            
            for (const obstacle of obstacles) {
                if (checkCollision(player, obstacle)) {
                    lives--;
                    console.log('Click collision detected! Lives:', lives);
                    updateGameState();
                    
                    if (lives <= 0) {
                        lives = 0;
                        updateGameState();
                        gameOver = true;
                        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                        ctx.fillRect(0, 0, canvas.width, canvas.height);
                        nameModal.style.display = 'flex';
                        playerNameInput.value = '';
                        playerNameInput.focus();
                        break;
                    } else {
                        isInvulnerable = true;
                        player.reset();
                        setTimeout(() => {
                            isInvulnerable = false;
                        }, INVULNERABILITY_DURATION);
                        break;
                    }
                }
            }
        }
    });

    // Initialize game display
    console.log('Initial lives value:', lives);
    updateGameState();

    // Start the game
    console.log('Starting game with lives:', lives);
    requestAnimationFrame(gameLoop);
});
