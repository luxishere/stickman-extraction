
import { Player, Particle } from '../../types';
import { InputHandler } from '../Input';
import { 
    MOVE_SPEED, JUMP_FORCE, ATTACK_COOLDOWN, ATTACK_DURATION, 
    MAX_BOW_CHARGE, DOUBLE_JUMP_DELAY, DASH_FORCE, DASH_DURATION, DASH_COOLDOWN 
} from '../../constants';
import { audio } from '../Audio';

export const updatePlayer = (player: Player, input: InputHandler, particles: Particle[]) => {
  const activeWeapon = player.activeSlot ? player.loadout[player.activeSlot] : null;
  const isBow = activeWeapon?.weaponType === 'BOW';

  // Dash Logic
  if (player.dashCooldown > 0) player.dashCooldown--;
  if (player.dashTimer > 0) {
      player.dashTimer--;
      // Maintain horizontal momentum during dash
      player.vel.x = player.facingRight ? DASH_FORCE : -DASH_FORCE;
      player.vel.y = 0; // Lock vertical movement during dash
      return; // Skip other movement inputs during active dash
  }

  // Dash triggered by Shift or R (PC preference)
  const dashRequested = input.isDown('ShiftLeft') || input.isDown('ShiftRight') || input.isDown('KeyR');
  if (dashRequested && player.dashCooldown <= 0 && !player.isWallSliding) {
      player.dashTimer = DASH_DURATION;
      player.dashCooldown = DASH_COOLDOWN;
      audio.playDash();
      return;
  }

  // Wall Slide Logic
  if (player.isWallSliding) {
      player.wallSlideTimer--;
      player.vel.x = 0;
      player.vel.y = 0; // Stuck to wall

      // Wall Jump
      if (input.isDown('Space') && !player.jumpWasDown) {
          player.isWallSliding = false;
          // Jump opposite to wall direction
          player.vel.x = -player.wallSlideDir * 10; 
          player.vel.y = JUMP_FORCE;
          // Face opposite direction
          player.facingRight = player.wallSlideDir < 0; 
          
          audio.playJump();
          createJumpParticles(particles, player);
          // Add cooldown to prevent immediate re-stick
          player.jumpWasDown = true;
          return; 
      }

      if (player.wallSlideTimer <= 0 || input.isDown('ArrowDown') || input.isDown('KeyS')) {
          player.isWallSliding = false;
      }
      
      // Update jump key state for wall jump
      player.jumpWasDown = input.isDown('Space');
      return; // Skip normal movement while on wall
  }

  // Movement speed penalty while charging
  let speed = player.stats.moveSpeed;
  if (isBow && player.chargeTime > 0) {
      speed *= 0.4; // Slower while aiming
  }

  // Horizontal Movement
  if (input.isDown('ArrowRight') || input.isDown('KeyD')) {
    player.vel.x += speed;
    player.facingRight = true;
  }
  if (input.isDown('ArrowLeft') || input.isDown('KeyA')) {
    player.vel.x -= speed;
    player.facingRight = false;
  }

  // Cooldown logic
  if (player.doubleJumpCooldown > 0) {
    player.doubleJumpCooldown--;
  }

  // Jump Logic - STRICTLY SPACE ONLY
  const jumpKeyDown = input.isDown('Space');
  
  if (player.isGrounded) {
    player.canDoubleJump = true;
  }

  // Detect rising edge of jump key press
  if (jumpKeyDown && !player.jumpWasDown) {
    if (player.isGrounded) {
      player.vel.y = JUMP_FORCE;
      player.isGrounded = false;
      player.doubleJumpCooldown = DOUBLE_JUMP_DELAY; 
      audio.playJump();
      createJumpParticles(particles, player);
    } else if (player.canDoubleJump && player.doubleJumpCooldown <= 0) {
      player.vel.y = JUMP_FORCE;
      player.canDoubleJump = false;
      audio.playDoubleJump(); // Distinct sound for double jump
      createJumpParticles(particles, player);
    }
  }
  player.jumpWasDown = jumpKeyDown;
  
  // Weapon Switching
  if (input.isDown('Digit1') && player.loadout.PRIMARY_WEAPON && player.activeSlot !== 'PRIMARY_WEAPON') {
      player.activeSlot = 'PRIMARY_WEAPON';
      player.chargeTime = 0;
      recalculateStats(player);
  }
  if (input.isDown('Digit2') && player.loadout.SECONDARY_WEAPON && player.activeSlot !== 'SECONDARY_WEAPON') {
      player.activeSlot = 'SECONDARY_WEAPON';
      player.chargeTime = 0;
      recalculateStats(player);
  }

  // Combat Input
  const isActionHeld = input.isDown('Mouse0') || input.isDown('Mouse3') || input.isDown('Mouse4');

  if (isBow) {
      if (isActionHeld) {
          player.isAttacking = true;
          player.chargeTime += (1 / player.stats.attackSpeed);
      } else {
          const minCharge = MAX_BOW_CHARGE * 0.25;
          if (player.chargeTime >= minCharge) {
              player.shotPower = Math.min(player.chargeTime / MAX_BOW_CHARGE, 1);
              player.shootRequested = true;
              audio.playShoot();
          }
          player.chargeTime = 0;
          player.isAttacking = false;
      }
  } else {
      const attackSpeed = player.stats.attackSpeed || 1;
      const currentMaxCooldown = ATTACK_COOLDOWN / attackSpeed;
      
      if (isActionHeld && player.attackCooldown <= 0) {
          player.isAttacking = true;
          player.attackCooldown = currentMaxCooldown;
          audio.playAttack();
      }
      if (player.attackCooldown > 0) player.attackCooldown--;
      if (player.attackCooldown < currentMaxCooldown - ATTACK_DURATION) player.isAttacking = false;
  }
};

const createJumpParticles = (particles: Particle[], player: Player) => {
    for (let i = 0; i < 6; i++) {
        particles.push({
            x: player.pos.x + player.width / 2 + (Math.random() - 0.5) * player.width,
            y: player.pos.y + player.height,
            vx: (Math.random() - 0.5) * 4,
            vy: -Math.random() * 2 - 1, // Slight upward velocity
            life: 10,
            color: 'white',
            size: Math.random() * 2 + 1
        });
    }
};

const recalculateStats = (player: Player) => {
    const newStats = { ...player.baseStats };
    if (player.activeSlot) {
        const weapon = player.loadout[player.activeSlot];
        if (weapon?.stats) {
            if (weapon.stats.damage) newStats.damage += weapon.stats.damage;
            if (weapon.stats.attackSpeed) newStats.attackSpeed += weapon.stats.attackSpeed;
        }
    }
    player.stats = newStats;
};
