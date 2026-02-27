
import { Enemy, Player, Platform, Loadout, Item, ItemRarity } from '../../types';
import { applyPhysics, checkAABB } from '../Physics';
import { ATTACK_COOLDOWN, JUMP_FORCE } from '../../constants';
import { audio } from '../Audio';
import { generateSpecificLoot } from './CombatSystem';

export const updateEnemies = (enemies: Enemy[], player: Player, platforms: Platform[]) => {
    const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    enemies.forEach((enemy) => {
        const dx = player.pos.x - enemy.pos.x;
        const dy = player.pos.y - enemy.pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        
        let speedMultiplier = isMobile ? 0.18 : 0.35; 
        const acceleration = enemy.stats.moveSpeed * speedMultiplier;

        if (dist < enemy.detectionRange) {
            if (enemy.type === 'ranger') {
                // Ranger AI: Keep distance (300-500px)
                const idealRange = 400;
                if (dist < idealRange - 50) {
                    // Too close, retreat
                    if (dx > 0) {
                        enemy.vel.x -= acceleration;
                        enemy.facingRight = true; // Still face player
                    } else {
                        enemy.vel.x += acceleration;
                        enemy.facingRight = false;
                    }
                } else if (dist > idealRange + 50) {
                    // Too far, approach
                    if (dx > 0) {
                        enemy.vel.x += acceleration;
                        enemy.facingRight = true;
                    } else {
                        enemy.vel.x -= acceleration;
                        enemy.facingRight = false;
                    }
                } else {
                    // In range, stop moving and face player
                    enemy.vel.x *= 0.8;
                    enemy.facingRight = dx > 0;
                }
            } else {
                // Chaser AI: Run at player
                if (dx > 40) {
                    enemy.vel.x += acceleration;
                    enemy.facingRight = true;
                } else if (dx < -40) {
                    enemy.vel.x -= acceleration;
                    enemy.facingRight = false;
                }
            }

            if (enemy.isGrounded && Math.abs(enemy.vel.x) > 0.1) {
                const checkDist = 60;
                const wallSensor = {
                    pos: { 
                        x: enemy.pos.x + (enemy.facingRight ? enemy.width : -checkDist), 
                        y: enemy.pos.y + 10 
                    },
                    width: checkDist,
                    height: 40
                };

                let wallDetected = false;
                for (const plat of platforms) {
                    if (checkAABB(wallSensor, { pos: { x: plat.x, y: plat.y }, width: plat.width, height: plat.height })) {
                        wallDetected = true;
                        break;
                    }
                }

                // Ledge Detection
                // Check a point slightly ahead and below the enemy
                const lookAhead = 40;
                const ledgeSensorX = enemy.pos.x + (enemy.facingRight ? enemy.width + lookAhead : -lookAhead);
                const ledgeSensorY = enemy.pos.y + enemy.height + 5; // Just below the feet

                let groundAhead = false;
                // Check if this point is inside any platform
                for (const plat of platforms) {
                    if (ledgeSensorX >= plat.x && ledgeSensorX <= plat.x + plat.width &&
                        ledgeSensorY >= plat.y && ledgeSensorY <= plat.y + plat.height) {
                        groundAhead = true;
                        break;
                    }
                }

                if (wallDetected || !groundAhead || (dy < -60 && Math.abs(dx) < 150)) {
                    enemy.vel.y = JUMP_FORCE;
                    enemy.isGrounded = false;
                    audio.playJump();
                }
            }

            const baseCooldown = isMobile ? ATTACK_COOLDOWN * 5 : ATTACK_COOLDOWN * 3;
            // Ranger shoots if in range and cooldown ready
            if (enemy.type === 'ranger') {
                 if (dist < 600 && enemy.attackCooldown <= 0) {
                    enemy.isAttacking = true;
                    enemy.attackCooldown = Math.floor(baseCooldown * 1.5); // Slower fire rate for rangers
                    audio.playEnemyAttack();
                 }
            } else {
                // Melee attack
                if (dist < 75 && enemy.attackCooldown <= 0) {
                    enemy.isAttacking = true;
                    enemy.attackCooldown = Math.floor(baseCooldown);
                    audio.playEnemyAttack();
                }
            }
        }

        if (enemy.attackCooldown > 0) {
            enemy.attackCooldown--;
            const baseCooldown = isMobile ? ATTACK_COOLDOWN * 5 : ATTACK_COOLDOWN * 3;
            if (enemy.attackCooldown < Math.floor(baseCooldown) - 15) {
                enemy.isAttacking = false;
            }
        }

        // Wall Jump Logic
        if (enemy.isWallSliding) {
             // Jump away from wall towards player if possible
             enemy.vel.y = JUMP_FORCE;
             enemy.vel.x = -enemy.wallSlideDir * (enemy.stats.moveSpeed * 1.5); 
             enemy.isWallSliding = false;
             enemy.canDoubleJump = true; 
             audio.playJump();
        }

        // Double Jump Logic
        if (!enemy.isGrounded && enemy.canDoubleJump && enemy.vel.y > 0) {
             // If player is significantly higher
             if (player.pos.y < enemy.pos.y - 100) {
                 enemy.vel.y = JUMP_FORCE;
                 enemy.canDoubleJump = false;
                 audio.playJump();
                 
                 // Adjust X velocity towards player
                 if (player.pos.x > enemy.pos.x) enemy.vel.x = enemy.stats.moveSpeed;
                 else enemy.vel.x = -enemy.stats.moveSpeed;
             }
        }
        
        // Reset double jump when grounded
        if (enemy.isGrounded) {
            enemy.canDoubleJump = true;
            enemy.isWallSliding = false;
        }
        
        applyPhysics(enemy, platforms);
    });
};

const calculateGearScore = (loadout: Loadout): number => {
    let score = 0;
    let count = 0;
    const rarityValues: Record<ItemRarity, number> = {
        'COMMON': 1,
        'UNCOMMON': 2,
        'RARE': 3,
        'EPIC': 4,
        'LEGENDARY': 5
    };

    Object.values(loadout).forEach(item => {
        if (item && item.rarity) {
            score += rarityValues[item.rarity];
            count++;
        }
    });

    return count > 0 ? score / count : 1;
};

export const spawnEnemies = (enemies: Enemy[], player?: Player) => {
    // Simple spawn logic based on rate
    if (Math.random() < 0.005 && enemies.length < 1) {
        const side = Math.random() > 0.5 ? 1 : -1;
        const x = side === 1 ? -50 : 3000; // Spawn off-screen
        
        // Determine enemy gear tier based on player
        let gearTier = 1;
        if (player) {
            const playerGearScore = calculateGearScore(player.loadout);
            // Enemy gear score is player's score +/- 1, clamped 1-5
            gearTier = Math.max(1, Math.min(5, Math.round(playerGearScore + (Math.random() * 2 - 1))));
        }

        // Generate loadout for enemy
        const enemyLoadout: Loadout = {
            HELMET: null, CHEST: null, LEGGINGS: null, BOOTS: null, 
            GLOVES: null, RING: null, PRIMARY_WEAPON: null, SECONDARY_WEAPON: null
        };

        // Helper to get rarity from tier
        const getRarityFromTier = (tier: number): ItemRarity => {
            const rarities: ItemRarity[] = ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'];
            return rarities[tier - 1] || 'COMMON';
        };

        const rarity = getRarityFromTier(gearTier);
        
        const isRanger = Math.random() > 0.7; // 30% chance to be a ranger
        
        // Equip items
        if (Math.random() > 0.3) enemyLoadout.HELMET = generateSpecificLoot('HELMET', rarity);
        if (Math.random() > 0.3) enemyLoadout.CHEST = generateSpecificLoot('CHEST', rarity);
        if (Math.random() > 0.3) enemyLoadout.LEGGINGS = generateSpecificLoot('LEGGINGS', rarity);
        if (Math.random() > 0.3) enemyLoadout.BOOTS = generateSpecificLoot('BOOTS', rarity);
        
        // Weapon Logic: Match player's weapon state
        const playerHasWeapon = player && (player.loadout.PRIMARY_WEAPON || player.loadout.SECONDARY_WEAPON);
        
        // If player has a weapon, enemy always gets one.
        // If player has NO weapon, enemy has 10% chance to have one (rare challenge), otherwise nothing.
        if (playerHasWeapon || Math.random() < 0.1) {
            const weaponItem = generateSpecificLoot('WEAPON', rarity);
            if (isRanger) {
                weaponItem.weaponType = 'BOW';
                weaponItem.name = rarity.charAt(0) + rarity.slice(1).toLowerCase() + " Bow";
            } else {
                weaponItem.weaponType = 'SWORD';
                weaponItem.name = rarity.charAt(0) + rarity.slice(1).toLowerCase() + " Sword";
            }
            enemyLoadout.PRIMARY_WEAPON = weaponItem;
        } else {
            // No weapon - Fists only
            enemyLoadout.PRIMARY_WEAPON = null;
        }

        // Calculate stats from loadout
        let hp = 100;
        let damage = 10;
        let moveSpeed = 4.0;
        let attackSpeed = 1.0;

        Object.values(enemyLoadout).forEach(item => {
            if (item && item.stats) {
                if (item.stats.hp) hp += item.stats.hp;
                if (item.stats.damage) damage += item.stats.damage;
                if (item.stats.moveSpeed) moveSpeed += item.stats.moveSpeed;
                if (item.stats.attackSpeed) attackSpeed -= item.stats.attackSpeed;
            }
        });

        // Clamp attack speed
        attackSpeed = Math.max(0.2, attackSpeed);

        enemies.push({
            id: `enemy_${Date.now()}`,
            pos: { x, y: 400 },
            vel: { x: 0, y: 0 },
            width: 30,
            height: 60,
            color: isRanger ? '#10b981' : '#ef4444', // Green for rangers, Red for chasers
            isGrounded: false,
            health: hp,
            maxHealth: hp,
            facingRight: side === -1,
            type: isRanger ? 'ranger' : 'chaser',
            detectionRange: isRanger ? 1200 : 1000,
            stats: { moveSpeed, attackSpeed, damage },
            isAttacking: false,
            attackCooldown: 0,
            loadout: enemyLoadout,
            canDoubleJump: true,
            doubleJumpCooldown: 0,
            isWallSliding: false,
            wallSlideDir: 0,
            wallSlideTimer: 0
        });
    }
};
