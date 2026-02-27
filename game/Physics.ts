
import { Entity, Platform, Vector2, Player } from '../types';
import { GRAVITY, FRICTION, MAX_SPEED } from '../constants';

export const applyPhysics = (entity: Entity, platforms: Platform[]) => {
  // Apply Gravity (Skip if wall sliding)
  const player = entity as Player; // Cast to check specific flags safely
  const isWallSliding = player.isWallSliding;

  if (!isWallSliding) {
    entity.vel.y += GRAVITY;
  }

  // Apply Friction
  entity.vel.x *= FRICTION;

  // Clamp Speed
  entity.vel.x = Math.max(Math.min(entity.vel.x, MAX_SPEED), -MAX_SPEED);
  entity.vel.y = Math.max(Math.min(entity.vel.y, MAX_SPEED * 2), -MAX_SPEED * 2);

  // Apply Velocity to Position (X)
  entity.pos.x += entity.vel.x;
  
  // Collision Detection X
  checkPlatformCollisions(entity, platforms, true);

  // Apply Velocity to Position (Y)
  entity.pos.y += entity.vel.y;

  // Collision Detection Y
  entity.isGrounded = false;
  checkPlatformCollisions(entity, platforms, false);

  // Screen Boundaries - Void Death
  if (entity.pos.y > 1000) { 
    entity.health = 0;
  }
};

const checkPlatformCollisions = (entity: Entity, platforms: Platform[], checkX: boolean) => {
  const player = entity as Player;

  for (const plat of platforms) {
    if (
      entity.pos.x < plat.x + plat.width &&
      entity.pos.x + entity.width > plat.x &&
      entity.pos.y < plat.y + plat.height &&
      entity.pos.y + entity.height > plat.y
    ) {
      if (checkX) {
        if (entity.vel.x > 0) {
          entity.pos.x = plat.x - entity.width;
          // Wall Slide Logic: If Player hits a wall in air
          if ('isWallSliding' in entity && !entity.isGrounded && !player.isWallSliding) {
             player.isWallSliding = true;
             player.wallSlideDir = 1; // Wall is on right
             player.wallSlideTimer = 120; // 2 seconds
             player.vel.y = 0; // Stop gravity
          }
        } else if (entity.vel.x < 0) {
          entity.pos.x = plat.x + plat.width;
          // Wall Slide Logic
          if ('isWallSliding' in entity && !entity.isGrounded && !player.isWallSliding) {
             player.isWallSliding = true;
             player.wallSlideDir = -1; // Wall is on left
             player.wallSlideTimer = 120; // 2 seconds
             player.vel.y = 0; // Stop gravity
          }
        }
        entity.vel.x = 0;
      } else {
        if (entity.vel.y > 0) { // Falling
          entity.pos.y = plat.y - entity.height;
          entity.isGrounded = true;
          entity.vel.y = 0;
          // Reset wall slide if we hit ground
          if ('isWallSliding' in entity) {
             player.isWallSliding = false;
          }
        } else if (entity.vel.y < 0) { // Jumping up into platform
           entity.pos.y = plat.y + plat.height;
           entity.vel.y = 0;
        }
      }
    }
  }
};

export const checkAABB = (a: Entity | {pos: Vector2, width: number, height: number}, b: Entity | {pos: Vector2, width: number, height: number}) => {
  return (
    a.pos.x < b.pos.x + b.width &&
    a.pos.x + a.width > b.pos.x &&
    a.pos.y < b.pos.y + b.height &&
    a.pos.y + a.height > b.pos.y
  );
};
