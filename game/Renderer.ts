
import { Player, Enemy, Platform, Item, Particle, ExtractionZone, Projectile } from '../types';
import { COLORS, MAX_BOW_CHARGE, MAP_LEFT_LIMIT, MAP_RIGHT_LIMIT, RARITY_COLORS, ATTACK_COOLDOWN, ATTACK_DURATION } from '../constants';
import { WorldState } from './state';

export class Renderer {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  camera: { x: number; y: number } = { x: 0, y: 0 };

  constructor(ctx: CanvasRenderingContext2D, width: number, height: number) {
    this.ctx = ctx;
    this.width = width;
    this.height = height;
  }

  // New method to handle viewport resizing correctly
  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  clear() {
    // Robust clear: Reset transform to identity to ensure we clear the entire physical canvas
    this.ctx.save();
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    this.ctx.fillStyle = COLORS.background;
    this.ctx.fillRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
    this.ctx.restore();
  }

  drawWorld(state: WorldState) {
    // Camera update is now handled in GameEngine.update() to sync with physics
    
    state.platforms.forEach(p => this.drawPlatform(p));
    this.drawExtraction(state.extractionZone);
    state.items.forEach(i => this.drawItem(i));
    state.enemies.forEach(e => this.drawStickman(e, false));
    this.drawStickman(state.player, true);
    this.drawParticles(state.particles);
    this.drawProjectiles(state.projectiles);
    this.drawSuddenDeath(state.suddenDeathOffset);
  }

  updateCamera(player: Player) {
    const targetX = player.pos.x - this.width / 2;
    const targetY = player.pos.y - this.height / 2;
    this.camera.x += (targetX - this.camera.x) * 0.1;
    this.camera.y += (targetY - this.camera.y) * 0.1;
  }

  drawPlatform(plat: Platform) {
    this.ctx.fillStyle = COLORS.ground;
    this.ctx.fillRect(plat.x - this.camera.x, plat.y - this.camera.y, plat.width, plat.height);
    this.ctx.strokeStyle = '#4b5563';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(plat.x - this.camera.x, plat.y - this.camera.y, plat.width, plat.height);
  }

  drawStickman(entity: Player | Enemy, isPlayer: boolean) {
    const centerX = entity.pos.x - this.camera.x + entity.width / 2;
    const centerY = entity.pos.y - this.camera.y + entity.height / 2;
    const color = isPlayer ? COLORS.player : COLORS.enemy;

    this.ctx.save();
    this.ctx.translate(centerX, centerY);

    // Wall Slide Rotation
    if (isPlayer) {
        const p = entity as Player;
        if (p.isWallSliding) {
            // Rotate so feet point towards wall
            // If wall is on Right (dir 1), rotate CCW (-PI/4) to lean back against it? 
            // Standard stickman is upright. To look like he is leaning against a wall:
            // If wall on right, rotate slightly CCW (-20deg).
            // Actually, prompt says "slanted position".
            const rotation = p.wallSlideDir === 1 ? -Math.PI / 6 : Math.PI / 6;
            this.ctx.rotate(rotation);
        }
    }

    if (!entity.facingRight) {
        this.ctx.scale(-1, 1);
    }

    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 3;
    this.ctx.lineCap = 'round';

    const walkCycle = Math.sin(Date.now() / 100) * (Math.abs(entity.vel.x) > 0.1 ? 1 : 0);

    // Head
    this.ctx.beginPath();
    this.ctx.arc(0, -20, 8, 0, Math.PI * 2);
    this.ctx.stroke();

    // Torso
    this.ctx.beginPath();
    this.ctx.moveTo(0, -12);
    this.ctx.lineTo(0, 10);
    this.ctx.stroke();

    let isBow = false;
    let chargePct = 0;
    let chargeColor = '#EEE'; 

    if (isPlayer) {
        const p = entity as Player;
        if (p.activeSlot && p.loadout[p.activeSlot]?.weaponType === 'BOW') {
            isBow = true;
            chargePct = Math.min(p.chargeTime / MAX_BOW_CHARGE, 1);
            
            if (chargePct >= 0.75) chargeColor = '#a855f7'; 
            else if (chargePct >= 0.5) chargeColor = '#3b82f6'; 
            else if (chargePct >= 0.25) chargeColor = '#ef4444'; 
        }
    }

    // Arms
    this.ctx.beginPath();
    this.ctx.moveTo(0, -5);
    if (entity.isAttacking) {
        if (isBow) {
            this.ctx.lineTo(20, -5); 
        } else {
            this.ctx.lineTo(25, -5); 
        }
    } else {
        this.ctx.lineTo(walkCycle * 10, 10);
    }
    this.ctx.stroke();

    // Back Arm
    this.ctx.beginPath();
    this.ctx.moveTo(0, -5);
    if (isBow && entity.isAttacking) {
         const pullBack = 5 + (chargePct * 15);
         this.ctx.lineTo(15 - pullBack, 0); 
    } else {
         this.ctx.lineTo(-walkCycle * 10, 10);
    }
    this.ctx.stroke();

    // Legs
    this.ctx.beginPath();
    this.ctx.moveTo(0, 10);
    this.ctx.lineTo((walkCycle * 10) + 5, 30);
    this.ctx.moveTo(0, 10);
    this.ctx.lineTo(-(walkCycle * 10) - 5, 30);
    this.ctx.stroke();

    // Bow Visuals
    const hasBow = isPlayer ? isBow : (entity as Enemy).loadout?.PRIMARY_WEAPON?.weaponType === 'BOW';
    
    if (hasBow) {
        const bowX = 20;
        const bowY = -5;
        this.ctx.strokeStyle = '#A0522D';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(bowX, bowY, 18, -Math.PI/2, Math.PI/2); 
        this.ctx.stroke();
        
        if (chargePct >= 0.25) {
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = chargeColor;
        }

        this.ctx.beginPath();
        this.ctx.strokeStyle = chargeColor;
        this.ctx.lineWidth = chargePct >= 0.75 ? 2 : 1;
        if (entity.isAttacking) {
             const pullBack = 5 + (chargePct * 15);
             const stringX = 15 - pullBack;
             this.ctx.moveTo(bowX, bowY - 18);
             this.ctx.lineTo(stringX, bowY);
             this.ctx.lineTo(bowX, bowY + 18);
        } else {
             this.ctx.moveTo(bowX, bowY - 18);
             this.ctx.lineTo(bowX, bowY + 18);
        }
        this.ctx.stroke();

        if (entity.isAttacking) {
             this.ctx.beginPath();
             this.ctx.strokeStyle = chargePct >= 0.25 ? chargeColor : 'white';
             this.ctx.lineWidth = 2;
             const pullBack = 5 + (chargePct * 15);
             this.ctx.moveTo(15 - pullBack, bowY);
             this.ctx.lineTo(bowX + 5, bowY);
             this.ctx.stroke();
        }
        
        this.ctx.shadowBlur = 0;
    } else if (entity.isAttacking) {
        // Sword Animation
        const p = entity as Player;
        // Check if player has sword equipped or if it's an enemy (check loadout)
        const hasSword = isPlayer 
            ? (p.activeSlot && p.loadout[p.activeSlot]?.weaponType === 'SWORD')
            : (entity as Enemy).loadout?.PRIMARY_WEAPON?.weaponType === 'SWORD';
        
        if (hasSword) {
             const progress = (ATTACK_COOLDOWN - entity.attackCooldown) / ATTACK_DURATION;
             const clampedProgress = Math.max(0, Math.min(1, progress));
             
             // Swing from -100 to +45 degrees (Higher start, lower end)
             const startAngle = -Math.PI * 0.6;
             const endAngle = Math.PI * 0.3;
             const currentAngle = startAngle + (endAngle - startAngle) * clampedProgress;

             this.ctx.save();
             this.ctx.translate(10, -5); // Shoulder pivot
             this.ctx.rotate(currentAngle);
             
             // Blade
             this.ctx.fillStyle = '#C0C0C0';
             this.ctx.fillRect(0, -2, 40, 4);
             
             // Handle
             this.ctx.fillStyle = '#8B4513';
             this.ctx.fillRect(-10, -2, 10, 4);
             
             // Crossguard
             this.ctx.fillStyle = '#FFD700';
             this.ctx.fillRect(0, -6, 4, 12);
             
             // Tip
             this.ctx.beginPath();
             this.ctx.moveTo(40, -2);
             this.ctx.lineTo(45, 0);
             this.ctx.lineTo(40, 2);
             this.ctx.fill();

             this.ctx.restore();
        }
    }

    this.ctx.restore();
    this.ctx.save();
    this.ctx.translate(centerX, centerY);
    const hpPct = Math.max(0, entity.health / entity.maxHealth);
    this.ctx.fillStyle = 'red';
    this.ctx.fillRect(-15, -45, 30, 4);
    this.ctx.fillStyle = 'green';
    this.ctx.fillRect(-15, -45, 30 * hpPct, 4);
    this.ctx.restore();
  }

  drawProjectiles(projectiles: Projectile[]) {
    projectiles.forEach(p => {
        const x = p.pos.x - this.camera.x;
        const y = p.pos.y - this.camera.y;
        const angle = Math.atan2(p.vel.y, p.vel.x);
        this.ctx.save();
        this.ctx.translate(x, y);
        this.ctx.rotate(angle);
        this.ctx.beginPath();
        this.ctx.strokeStyle = 'white';
        this.ctx.lineWidth = 2;
        this.ctx.moveTo(-10, 0);
        this.ctx.lineTo(10, 0);
        this.ctx.lineTo(6, -3);
        this.ctx.moveTo(10, 0);
        this.ctx.lineTo(6, 3);
        this.ctx.stroke();
        this.ctx.restore();
    });
  }

  drawItem(item: Item) {
    if (item.collected) return;
    const x = item.pos.x - this.camera.x;
    const y = item.pos.y - this.camera.y;
    
    const color = item.rarity ? RARITY_COLORS[item.rarity] : COLORS.loot;

    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.arc(x, y, 8, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Glow effect for high rarity
    if (item.rarity === 'LEGENDARY' || item.rarity === 'EPIC') {
        this.ctx.shadowBlur = 15;
        this.ctx.shadowColor = color;
        this.ctx.stroke();
        this.ctx.shadowBlur = 0;
    }

    this.ctx.fillStyle = 'white';
    this.ctx.font = '10px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(item.name, x, y - 15);
  }

  drawExtraction(zone: ExtractionZone) {
  }

  drawParticles(particles: Particle[]) {
      particles.forEach(p => {
        this.ctx.fillStyle = p.color;
        this.ctx.globalAlpha = p.life / 60;
        this.ctx.beginPath();
        this.ctx.arc(p.x - this.camera.x, p.y - this.camera.y, p.size, 0, Math.PI * 2);
        this.ctx.fill();
      });
      this.ctx.globalAlpha = 1.0;
  }

  drawSuddenDeath(offset: number) {
    if (offset <= 0) return;

    const leftWallX = MAP_LEFT_LIMIT + offset - this.camera.x;
    const rightWallX = MAP_RIGHT_LIMIT - offset - this.camera.x;

    this.ctx.fillStyle = 'rgba(220, 38, 38, 0.4)'; // Red warning zone
    
    // Left Zone
    this.ctx.fillRect(-this.camera.x + MAP_LEFT_LIMIT, -this.camera.y - 1000, offset, 3000);
    // Right Zone
    this.ctx.fillRect(rightWallX, -this.camera.y - 1000, offset, 3000);

    // Wall Borders
    this.ctx.strokeStyle = COLORS.danger;
    this.ctx.lineWidth = 4;
    this.ctx.beginPath();
    this.ctx.moveTo(leftWallX, -this.camera.y - 1000);
    this.ctx.lineTo(leftWallX, -this.camera.y + 2000);
    this.ctx.stroke();

    this.ctx.beginPath();
    this.ctx.moveTo(rightWallX, -this.camera.y - 1000);
    this.ctx.lineTo(rightWallX, -this.camera.y + 2000);
    this.ctx.stroke();

    // Pulse effect
    if (Math.sin(Date.now() / 100) > 0) {
        this.ctx.shadowBlur = 20;
        this.ctx.shadowColor = COLORS.danger;
        this.ctx.stroke();
        this.ctx.shadowBlur = 0;
    }
  }
}
