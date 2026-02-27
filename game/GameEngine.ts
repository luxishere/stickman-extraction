
import { WorldState, createInitialState } from './state';
import { InputHandler } from './Input';
import { Renderer } from './Renderer';
import { applyPhysics } from './Physics';
import { updatePlayer } from './systems/PlayerSystem';
import { updateEnemies, spawnEnemies } from './systems/EnemySystem';
import { handleCombat, updateParticles } from './systems/CombatSystem';
import { handleLoot } from './systems/LootSystem';
import { Item, Loadout } from '../types';
import { MATCH_DURATION_SECONDS, SUDDEN_DEATH_WALL_SPEED, MAP_LEFT_LIMIT, MAP_RIGHT_LIMIT } from '../constants';
import { audio } from './Audio';

export class GameEngine {
    state: WorldState;
    input: InputHandler;
    renderer: Renderer;
    onGameOver: (won: boolean, loot: Item[] | null) => void;
    onHudUpdate: (data: any) => void;
    frameId: number = 0;
    isRunning: boolean = false;

    constructor(
        ctx: CanvasRenderingContext2D, 
        width: number, 
        height: number,
        onGameOver: (won: boolean, loot: Item[] | null) => void,
        onHudUpdate: (data: any) => void,
        loadout: Loadout
    ) {
        this.state = createInitialState(loadout);
        this.input = new InputHandler();
        this.renderer = new Renderer(ctx, width, height);
        this.onGameOver = onGameOver;
        this.onHudUpdate = onHudUpdate;
    }

    lastTime: number = 0;
    accumulator: number = 0;
    readonly FIXED_TIME_STEP: number = 1000 / 60;

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.lastTime = performance.now();
        this.loop(this.lastTime);
    }

    stop() {
        this.isRunning = false;
        cancelAnimationFrame(this.frameId);
        this.input.destroy();
    }

    // New method to handle viewport resizing correctly
    resize(width: number, height: number) {
        this.renderer.resize(width, height);
    }

    private loop = (timestamp: number) => {
        if (!this.isRunning) return;

        const deltaTime = timestamp - this.lastTime;
        this.lastTime = timestamp;
        this.accumulator += deltaTime;

        // Cap accumulator to prevent spiral of death if lag occurs
        if (this.accumulator > 200) {
            this.accumulator = 200;
        }

        while (this.accumulator >= this.FIXED_TIME_STEP) {
            this.update();
            this.accumulator -= this.FIXED_TIME_STEP;
        }

        this.render();

        this.frameId = requestAnimationFrame(this.loop);
    };

    private update() {
        this.state.gameTime++;

        updatePlayer(this.state.player, this.input, this.state.particles);
        updateEnemies(this.state.enemies, this.state.player, this.state.platforms);
        spawnEnemies(this.state.enemies, this.state.player);
        
        // Update Camera in sync with physics
        this.renderer.updateCamera(this.state.player);

        // Match Countdown and Sudden Death Logic
        const matchTotalFrames = MATCH_DURATION_SECONDS * 60;
        const timeRemaining = Math.max(0, matchTotalFrames - this.state.gameTime);
        
        if (timeRemaining === 0) {
            this.state.suddenDeathOffset += SUDDEN_DEATH_WALL_SPEED;
            
            const leftWallX = MAP_LEFT_LIMIT + this.state.suddenDeathOffset;
            const rightWallX = MAP_RIGHT_LIMIT - this.state.suddenDeathOffset;

            // Check Player collision with Sudden Death walls
            if (this.state.player.pos.x < leftWallX || (this.state.player.pos.x + this.state.player.width) > rightWallX) {
                this.state.player.health = 0;
            }

            // Check Enemies collision
            for (let i = this.state.enemies.length - 1; i >= 0; i--) {
                const e = this.state.enemies[i];
                if (e.pos.x < leftWallX || (e.pos.x + e.width) > rightWallX) {
                    e.health = 0;
                }
            }
        }

        // Particle trail for dash
        if (this.state.player.dashTimer > 0) {
            this.state.particles.push({
                x: this.state.player.pos.x + this.state.player.width / 2,
                y: this.state.player.pos.y + Math.random() * this.state.player.height,
                vx: -this.state.player.vel.x * 0.2,
                vy: (Math.random() - 0.5) * 2,
                life: 20,
                color: 'rgba(255, 255, 255, 0.5)',
                size: Math.random() * 4 + 2
            });
        }

        const wasGrounded = this.state.player.isGrounded;
        applyPhysics(this.state.player, this.state.platforms);
        if (!wasGrounded && this.state.player.isGrounded) {
             audio.playLand();
        }
        
        const victoryLoot = handleCombat(
            this.state.player, 
            this.state.enemies, 
            this.state.particles, 
            this.state.items,
            this.state.projectiles,
            this.state.platforms,
            this.state.gameTime
        );

        if (victoryLoot) {
            this.onGameOver(true, victoryLoot);
            this.stop();
            return;
        }

        if (this.state.player.health <= 0) {
            this.onGameOver(false, null);
            this.stop();
            return;
        }

        updateParticles(this.state.particles);

        // Update HUD (can be done less frequently if needed, but per-update is fine for now)
        this.onHudUpdate({
            health: this.state.player.health,
            maxHealth: this.state.player.maxHealth,
            loot: 0,
            timer: Math.floor(this.state.gameTime / 60),
            matchCountdown: Math.ceil(timeRemaining / 60),
            dashCooldown: this.state.player.dashCooldown
        });
    }

    private render() {
        this.renderer.clear();
        this.renderer.drawWorld(this.state);
    }
}
