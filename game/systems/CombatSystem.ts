
import { Player, Enemy, Particle, Item, ItemCategory, ItemStats, Projectile, Platform, ItemRarity } from '../../types';
import { checkAABB } from '../Physics';
import { ATTACK_RANGE, ATTACK_COOLDOWN, ARROW_SPEED, ARROW_GRAVITY } from '../../constants';
import { audio } from '../Audio';

export const handleCombat = (
    player: Player, 
    enemies: Enemy[], 
    particles: Particle[], 
    items: Item[],
    projectiles: Projectile[],
    platforms: Platform[],
    gameTime: number
): Item[] | null => {
    const isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    let victoryLoot: Item[] | null = null;
    
    // 1. Player Ranged Attack (Bow)
    if (player.shootRequested) {
        const facingDir = player.facingRight ? 1 : -1;
        const power = player.shotPower;
        const scaledDamage = player.stats.damage * (0.1 + Math.pow(power, 2) * 2.9);
        const speed = ARROW_SPEED * (0.8 + power * 0.4);

        projectiles.push({
            id: `arrow_${Date.now()}`,
            pos: { 
                x: player.pos.x + (player.width/2), 
                y: player.pos.y + (player.height/2)
            },
            vel: { x: facingDir * speed, y: -1 - (power * 1.5) },
            width: 25,
            height: 5,
            damage: scaledDamage,
            color: 'white',
            life: 180,
            ownerId: 'player'
        });
        player.shootRequested = false;
        player.shotPower = 0;
        player.vel.x = -facingDir * (3 + power * 4);
    }

    // 2. Player Melee Attack
    const playerWeaponSlot = player.activeSlot;
    const playerWeapon = playerWeaponSlot ? player.loadout[playerWeaponSlot] : null;
    const isPlayerUsingBow = playerWeapon?.weaponType === 'BOW';

    if (!isPlayerUsingBow && player.isAttacking) {
        if (player.attackCooldown === ATTACK_COOLDOWN - 5) {
            const hitbox = {
                pos: { 
                    x: player.pos.x + (player.facingRight ? player.width : -ATTACK_RANGE),
                    y: player.pos.y 
                },
                width: ATTACK_RANGE,
                height: player.height
            };
            
            enemies.forEach(e => {
                if (checkAABB(hitbox, e)) {
                    e.health -= player.stats.damage; 
                    e.vel.x = player.facingRight ? 7 : -7;
                    e.vel.y = -5;
                    createParticles(particles, e.pos.x + e.width/2, e.pos.y + e.height/2, 'red', 8);
                    audio.playHit();
                }
            });
        }
    }

    // 3. Enemy Attacks
    enemies.forEach(enemy => {
        const enemyMaxCooldown = isMobile ? ATTACK_COOLDOWN * 5 : ATTACK_COOLDOWN * 3;
        
        // Ranger Shooting Logic
        if (enemy.type === 'ranger') {
             const fireFrame = Math.floor(enemyMaxCooldown * 1.5) - 10;
             if (enemy.isAttacking && enemy.attackCooldown === fireFrame) {
                 const dx = player.pos.x - enemy.pos.x;
                 const dy = player.pos.y - enemy.pos.y;
                 const dist = Math.sqrt(dx*dx + dy*dy);
                 
                 // Predict player movement slightly
                 const targetX = player.pos.x + player.vel.x * 10;
                 const targetY = player.pos.y + player.vel.y * 10;
                 
                 const angle = Math.atan2(targetY - (enemy.pos.y + 20), targetX - (enemy.pos.x + 15));
                 const speed = ARROW_SPEED * 0.8;

                 projectiles.push({
                    id: `enemy_arrow_${Date.now()}_${Math.random()}`,
                    pos: { 
                        x: enemy.pos.x + (enemy.facingRight ? enemy.width : 0), 
                        y: enemy.pos.y + 20
                    },
                    vel: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
                    width: 25,
                    height: 5,
                    damage: enemy.stats.damage,
                    color: '#ef4444', // Red arrow
                    life: 180,
                    ownerId: enemy.id
                });
                audio.playShoot();
             }
        } else {
            // Melee Logic
            const hitFrame = Math.floor(enemyMaxCooldown) - 6;

            if (enemy.isAttacking && enemy.attackCooldown === hitFrame) {
                const hitbox = {
                    pos: { 
                        x: enemy.pos.x + (enemy.facingRight ? enemy.width : -ATTACK_RANGE),
                        y: enemy.pos.y 
                    },
                    width: ATTACK_RANGE,
                    height: enemy.height
                };

                if (checkAABB(hitbox, player)) {
                    player.health -= enemy.stats.damage;
                    player.vel.x = enemy.facingRight ? 10 : -10;
                    player.vel.y = -6;
                    createParticles(particles, player.pos.x + player.width/2, player.pos.y + player.height/2, 'blue', 12);
                    audio.playHit();
                }
            }
        }
    });

    updateProjectiles(projectiles, enemies, platforms, particles);

    for (let i = enemies.length - 1; i >= 0; i--) {
        const enemy = enemies[i];
        if (enemy.health <= 0) {
            enemies.splice(i, 1);
            
            // If enemy fell into void (y > 800), no loot is awarded.
            if (enemy.pos.y > 800) {
                continue;
            }

            let lootX = enemy.pos.x;
            let lootY = enemy.pos.y;
            
            createParticles(particles, lootX, lootY, 'orange', 25);
            
            // Drop enemy loadout
            if (enemy.loadout) {
                // Find all items
                const availableItems = Object.values(enemy.loadout).filter(item => item !== null) as Item[];
                if (availableItems.length > 0) {
                    // Drop ALL items
                    victoryLoot = availableItems.map((item, index) => ({
                        ...item,
                        pos: { x: lootX + (Math.random() * 40 - 20), y: lootY }, // Scatter slightly
                        collected: true,
                        id: `loot_${Date.now()}_${index}`
                    }));
                } else {
                    // Fallback if no gear
                    victoryLoot = [generateRandomLoot(lootX, lootY)];
                }
            } else {
                 victoryLoot = [generateRandomLoot(lootX, lootY)];
            }
        }
    }

    return victoryLoot;
};

const updateProjectiles = (
    projectiles: Projectile[], 
    enemies: Enemy[], 
    platforms: Platform[],
    particles: Particle[]
) => {
    for (let i = projectiles.length - 1; i >= 0; i--) {
        const p = projectiles[i];
        p.pos.x += p.vel.x;
        p.pos.y += p.vel.y;
        p.vel.y += ARROW_GRAVITY;
        p.life--;

        if (p.life <= 0) {
            projectiles.splice(i, 1);
            continue;
        }

        let hitPlatform = false;
        for (const plat of platforms) {
            const platformBox = { pos: { x: plat.x, y: plat.y }, width: plat.width, height: plat.height };
            if (checkAABB(p, platformBox)) {
                hitPlatform = true;
                break;
            }
        }

        if (hitPlatform) {
            createParticles(particles, p.pos.x, p.pos.y, 'gray', 3);
            projectiles.splice(i, 1);
            continue;
        }

        if (p.ownerId === 'player') {
            for (const e of enemies) {
                if (checkAABB(p, e)) {
                    e.health -= p.damage;
                    e.vel.x = p.vel.x > 0 ? 5 : -5;
                    e.vel.y = -3;
                    createParticles(particles, p.pos.x, p.pos.y, 'red', 12);
                    projectiles.splice(i, 1);
                    audio.playHit();
                    break;
                }
            }
        }
    }
};

export const generateSpecificLoot = (category: ItemCategory, rarity: ItemRarity, forcedWeaponType?: WeaponType): Item => {
    let multiplier = 1.0;
    switch(rarity) {
        case 'COMMON': multiplier = 1.0; break;
        case 'UNCOMMON': multiplier = 1.5; break;
        case 'RARE': multiplier = 3.0; break;
        case 'EPIC': multiplier = 6.0; break;
        case 'LEGENDARY': multiplier = 10.0; break;
    }

    let name = "Unknown Item";
    let stats: ItemStats = {};
    let weaponType = undefined;

    switch(category) {
        case 'HELMET': name = "Helmet"; stats = { hp: Math.floor(10 * multiplier) }; break;
        case 'CHEST': name = "Chestplate"; stats = { hp: Math.floor(25 * multiplier) }; break;
        case 'LEGGINGS': name = "Leggings"; stats = { hp: Math.floor(15 * multiplier) }; break;
        case 'BOOTS': name = "Boots"; stats = { moveSpeed: parseFloat((0.2 * multiplier).toFixed(1)) }; break;
        case 'GLOVES': 
            name = "Gloves"; 
            stats = { damage: Math.floor(5 * multiplier), attackSpeed: parseFloat((0.05 * multiplier).toFixed(2)) };
            break;
        case 'RING': name = "Ring"; stats = { attackSpeed: parseFloat((0.1 * multiplier).toFixed(2)) }; break;
        case 'WEAPON':
            const isBow = forcedWeaponType ? forcedWeaponType === 'BOW' : Math.random() > 0.5;
            weaponType = isBow ? 'BOW' : 'SWORD';
            name = isBow ? "Bow" : "Sword";
            stats = { damage: Math.floor((isBow ? 8 : 10) * multiplier) };
            break;
    }

    const rarityPrefix = rarity.charAt(0) + rarity.slice(1).toLowerCase();
    name = `${rarityPrefix} ${name}`;

    return {
        id: `loot_${Date.now()}_${Math.random()}`,
        type: 'equipment',
        category: category,
        weaponType: weaponType as any,
        rarity: rarity,
        name: name,
        value: Math.floor(((Math.random() * 100) + 50) * multiplier),
        pos: { x: 0, y: 0 },
        collected: true,
        stats: stats
    };
};

export const generateRandomLoot = (x: number, y: number): Item => {
    const types: ItemCategory[] = ['HELMET', 'CHEST', 'LEGGINGS', 'BOOTS', 'GLOVES', 'RING', 'WEAPON'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    // Rarity Generation
    const rand = Math.random();
    let rarity: ItemRarity = 'COMMON';

    // Adjusted probabilities:
    // Common: 70% (0.00 - 0.70)
    // Uncommon: 20% (0.70 - 0.90)
    // Rare: 7% (0.90 - 0.97)
    // Epic: 2.5% (0.97 - 0.995)
    // Legendary: 0.5% (0.995 - 1.00)

    if (rand > 0.995) { rarity = 'LEGENDARY'; }
    else if (rand > 0.97) { rarity = 'EPIC'; }
    else if (rand > 0.90) { rarity = 'RARE'; }
    else if (rand > 0.70) { rarity = 'UNCOMMON'; }

    const item = generateSpecificLoot(type, rarity);
    item.pos = { x, y };
    return item;
};

export const updateParticles = (particles: Particle[]) => {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life--;
        if(p.life <= 0) particles.splice(i, 1);
    }
};

const createParticles = (particles: Particle[], x: number, y: number, color: string, count: number) => {
    for(let i=0; i<count; i++) {
        particles.push({
            x, y,
            vx: (Math.random() - 0.5) * 8,
            vy: (Math.random() - 0.5) * 8,
            life: 30 + Math.random() * 20,
            color: color,
            size: Math.random() * 3 + 1
        });
    }
};
