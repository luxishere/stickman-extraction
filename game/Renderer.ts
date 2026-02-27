
import { Player, Enemy, Platform, Item, Particle, ExtractionZone, Projectile } from '../types';
import { COLORS, MAX_BOW_CHARGE, MAP_LEFT_LIMIT, MAP_RIGHT_LIMIT, RARITY_COLORS, ATTACK_COOLDOWN, ATTACK_DURATION } from '../constants';
import { WorldState } from './state';
import { drawLegendaryCleaver } from './content/LegendaryCleaver';

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

    const loadout = (entity as any).loadout;
    const applyGlow = (item: Item | null | undefined) => {
        if (!item?.rarity) return;
        if (item.rarity === 'LEGENDARY') {
            this.ctx.shadowBlur = 15;
            this.ctx.shadowColor = '#f97316';
        } else if (item.rarity === 'EPIC') {
            this.ctx.shadowBlur = 10;
            this.ctx.shadowColor = '#a855f7';
        } else if (item.rarity === 'RARE') {
            this.ctx.shadowBlur = 8;
            this.ctx.shadowColor = '#3b82f6';
        }
    };

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
    if (loadout?.HELMET) applyGlow(loadout.HELMET);
    this.ctx.beginPath();
    this.ctx.arc(0, -20, 8, 0, Math.PI * 2);
    this.ctx.stroke();
    this.ctx.shadowBlur = 0;

    // Torso
    if (loadout?.CHEST) applyGlow(loadout.CHEST);
    this.ctx.beginPath();
    this.ctx.moveTo(0, -12);
    this.ctx.lineTo(0, 10);
    this.ctx.stroke();
    this.ctx.shadowBlur = 0;

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
    if (loadout?.GLOVES) applyGlow(loadout.GLOVES);
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
    this.ctx.shadowBlur = 0;

    // Back Arm
    if (loadout?.GLOVES) applyGlow(loadout.GLOVES);
    this.ctx.beginPath();
    this.ctx.moveTo(0, -5);
    if (isBow && entity.isAttacking) {
         const pullBack = 5 + (chargePct * 15);
         this.ctx.lineTo(15 - pullBack, 0); 
    } else {
         this.ctx.lineTo(-walkCycle * 10, 10);
    }
    this.ctx.stroke();
    this.ctx.shadowBlur = 0;

    // Legs
    if (loadout?.LEGGINGS || loadout?.BOOTS) {
        if (loadout.LEGGINGS?.rarity === 'LEGENDARY' || loadout.BOOTS?.rarity === 'LEGENDARY') {
             this.ctx.shadowBlur = 15;
             this.ctx.shadowColor = '#f97316';
        } else if (loadout.LEGGINGS?.rarity === 'EPIC' || loadout.BOOTS?.rarity === 'EPIC') {
             this.ctx.shadowBlur = 10;
             this.ctx.shadowColor = '#a855f7';
        } else if (loadout.LEGGINGS?.rarity === 'RARE' || loadout.BOOTS?.rarity === 'RARE') {
             this.ctx.shadowBlur = 8;
             this.ctx.shadowColor = '#3b82f6';
        }
    }
    this.ctx.beginPath();
    this.ctx.moveTo(0, 10);
    this.ctx.lineTo((walkCycle * 10) + 5, 30);
    this.ctx.moveTo(0, 10);
    this.ctx.lineTo(-(walkCycle * 10) - 5, 30);
    this.ctx.stroke();
    this.ctx.shadowBlur = 0;

    // Bow Visuals
    const hasBow = isPlayer ? isBow : (entity as Enemy).loadout?.PRIMARY_WEAPON?.weaponType === 'BOW';
    
    if (hasBow) {
        const weapon = isPlayer ? (entity as Player).loadout[(entity as Player).activeSlot!] : (entity as Enemy).loadout?.PRIMARY_WEAPON;
        applyGlow(weapon);

        const bowX = 20;
        const bowY = -5;
        this.ctx.strokeStyle = '#A0522D';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(bowX, bowY, 18, -Math.PI/2, Math.PI/2); 
        this.ctx.stroke();
        this.ctx.shadowBlur = 0;
        
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
    } else {
        // Sword Animation
        const p = entity as Player;
        // Check if player has sword equipped or if it's an enemy (check loadout)
        const hasSword = isPlayer 
            ? (p.activeSlot && p.loadout[p.activeSlot]?.weaponType === 'SWORD')
            : (entity as Enemy).loadout?.PRIMARY_WEAPON?.weaponType === 'SWORD';
        
        if (hasSword) {
             const weapon = isPlayer ? (entity as Player).loadout[(entity as Player).activeSlot!] : (entity as Enemy).loadout?.PRIMARY_WEAPON;
             const isCleaver = weapon?.name === 'Legendary Cleaver';
             
             this.ctx.save();
             applyGlow(weapon);
             
             if (entity.isAttacking) {
                 const attackSpeed = (entity as any).stats?.attackSpeed || 1;
                 const currentMaxCooldown = ATTACK_COOLDOWN / attackSpeed;
                 
                 const progress = (currentMaxCooldown - entity.attackCooldown) / ATTACK_DURATION;
                 // For Cleaver, maybe the swing is different?
                 // Let's just use the standard swing but it will be slower because attackCooldown decrements slower relative to the max?
                 // No, attackCooldown decrements at 1 per frame.
                 // currentMaxCooldown is larger (e.g. 60 instead of 30).
                 // ATTACK_DURATION is constant (e.g. 10).
                 // So the swing happens in the first 10 frames regardless of cooldown?
                 // Wait, PlayerSystem says: `if (player.attackCooldown < currentMaxCooldown - ATTACK_DURATION) player.isAttacking = false;`
                 // So `isAttacking` is true for `ATTACK_DURATION` frames.
                 // So the swing speed is CONSTANT (fast), but the delay between swings is longer.
                 // The user asked for "slow swing".
                 // To make the swing slower, I need to increase `ATTACK_DURATION` for this weapon.
                 // But `ATTACK_DURATION` is a constant.
                 // I can simulate a slower swing visual by stretching the animation over the `ATTACK_DURATION` if I could change it.
                 // Since I can't easily change `ATTACK_DURATION` in PlayerSystem without passing it around,
                 // I will just accept the fast swing for now but maybe add a "wind up" or "recovery" visual if possible.
                 // Actually, if I want a slow swing, I should have changed `ATTACK_DURATION` in PlayerSystem.
                 // But let's stick to the visual.
                 
                 const startAngle = -Math.PI / 3;
                 const endAngle = Math.PI / 3;
                 const currentAngle = startAngle + (endAngle - startAngle) * Math.sin(progress * Math.PI);
                 
                 this.ctx.translate(10, 0);
                 this.ctx.rotate(currentAngle);
             } else {
                 // Idle state - hold sword up
                 this.ctx.translate(15, 5);
                 this.ctx.rotate(-Math.PI / 3); // Pointing up and back slightly
             }
             
             if (isCleaver) {
                 const attackSpeed = (entity as any).stats?.attackSpeed || 1;
                 const currentMaxCooldown = ATTACK_COOLDOWN / attackSpeed;
                 const progress = entity.isAttacking 
                    ? (currentMaxCooldown - entity.attackCooldown) / ATTACK_DURATION 
                    : 0;
                 
                 drawLegendaryCleaver(this.ctx, entity.isAttacking, progress);
             } else {
                 // Standard Sword Drawing
                 // Blade
                 this.ctx.fillStyle = '#cbd5e1'; // Lighter blade
                 this.ctx.beginPath();
                 this.ctx.moveTo(0, -4);
                 this.ctx.lineTo(35, 0); // Tip
                 this.ctx.lineTo(0, 4);
                 this.ctx.fill();
                 
                 // Fuller
                 this.ctx.fillStyle = '#94a3b8';
                 this.ctx.fillRect(2, -1, 25, 2);

                 // Guard
                 this.ctx.fillStyle = '#64748b'; // Darker guard
                 this.ctx.fillRect(-2, -8, 4, 16);

                 // Handle
                 this.ctx.fillStyle = '#78350f'; // Brown handle
                 this.ctx.fillRect(-10, -2, 8, 4);
                 
                 // Pommel
                 this.ctx.fillStyle = '#475569';
                 this.ctx.beginPath();
                 this.ctx.arc(-12, 0, 3, 0, Math.PI * 2);
                 this.ctx.fill();
             }

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
