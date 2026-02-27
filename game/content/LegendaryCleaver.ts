import { Enemy, Particle, Player } from '../../types';
import { ATTACK_COOLDOWN, ATTACK_RANGE } from '../../constants';
import { checkAABB } from '../Physics';
import { audio } from '../Audio';

// Visual Constants
const CLEAVER_SCALE = 1.5;
const BLADE_COLOR = '#1F2937'; // Dark Grey
const BLADE_EDGE_COLOR = '#9CA3AF';
const MAGMA_COLOR = '#F97316'; // Orange
const MAGMA_CORE_COLOR = '#FEF3C7'; // Light Yellow
const GOLD_COLOR = '#D97706';
const GEM_COLOR = '#EF4444';

export const drawLegendaryCleaver = (
    ctx: CanvasRenderingContext2D, 
    isAttacking: boolean, 
    attackProgress: number // 0 to 1
) => {
    ctx.save();
    ctx.scale(CLEAVER_SCALE, CLEAVER_SCALE);

    // Dynamic Glow Pulse
    const pulse = Math.sin(Date.now() / 200) * 0.2 + 0.8;

    // --- Handle ---
    ctx.strokeStyle = '#5D4037';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-12, -2);
    ctx.lineTo(-6, -2);
    ctx.stroke();

    // Grip Texture
    ctx.strokeStyle = '#3E2723';
    ctx.lineWidth = 2.5;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(-12, -2);
    ctx.lineTo(-6, -2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Pommel
    ctx.fillStyle = '#B45309';
    ctx.beginPath();
    ctx.arc(-13, -2, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#78350F';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // --- Guard (Golden Cross) ---
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 2;
    
    ctx.strokeStyle = GOLD_COLOR;
    ctx.lineWidth = 4;
    ctx.lineCap = 'square';
    ctx.beginPath();
    ctx.moveTo(-6, -8);
    ctx.lineTo(-6, 4);
    ctx.stroke();
    
    // Guard Detail
    ctx.strokeStyle = '#B45309';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-6, -7);
    ctx.lineTo(-6, 3);
    ctx.stroke();
    ctx.restore();

    // Gem
    ctx.fillStyle = GEM_COLOR;
    ctx.beginPath();
    ctx.arc(-6, -2, 1.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowColor = GEM_COLOR;
    ctx.shadowBlur = 5;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // --- Blade (Massive Dark Slab) ---
    ctx.save();
    
    // Blade Shape
    ctx.beginPath();
    ctx.moveTo(-4, -6); // Base Top
    ctx.lineTo(35, -6); // Spine
    ctx.lineTo(42, -2); // Tip Top
    ctx.lineTo(38, 4);  // Tip Bottom
    ctx.lineTo(-4, 4);  // Base Bottom
    ctx.closePath();

    // Fill Blade
    const gradient = ctx.createLinearGradient(0, -6, 0, 4);
    gradient.addColorStop(0, '#374151');
    gradient.addColorStop(1, '#111827');
    ctx.fillStyle = gradient;
    ctx.fill();
    
    // Blade Outline
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 0.5;
    ctx.stroke();

    // --- Magma Cracks / Runes ---
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Outer Glow for Cracks
    ctx.shadowColor = MAGMA_COLOR;
    ctx.shadowBlur = 10 * pulse;
    
    // Draw Cracks
    const drawCracks = (color: string, width: number) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.beginPath();
        // Crack 1
        ctx.moveTo(5, -2);
        ctx.lineTo(8, -4);
        ctx.lineTo(12, 0);
        // Crack 2
        ctx.moveTo(16, 1);
        ctx.lineTo(20, -3);
        ctx.lineTo(24, -1);
        // Crack 3
        ctx.moveTo(28, -2);
        ctx.lineTo(32, 0);
        ctx.lineTo(34, -4);
        ctx.stroke();
    };

    // Base Magma
    drawCracks(MAGMA_COLOR, 2);
    // Core Hot Magma
    drawCracks(MAGMA_CORE_COLOR, 0.8);

    ctx.shadowBlur = 0;

    // --- Blade Edge Highlight ---
    ctx.strokeStyle = BLADE_EDGE_COLOR;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-4, 4);
    ctx.lineTo(38, 4);
    ctx.lineTo(42, -2);
    ctx.stroke();

    // Shine effect on edge
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 0.5;
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.moveTo(10, 4);
    ctx.lineTo(30, 4);
    ctx.stroke();
    ctx.globalAlpha = 1.0;

    ctx.restore();

    // --- Attack Visuals (Trail) ---
    if (isAttacking) {
        // Draw a swoosh trail
        ctx.save();
        ctx.globalCompositeOperation = 'screen'; // Additive blending for glow
        ctx.rotate(Math.PI / 2); // Rotate to match swing direction roughly
        
        // We are already rotated by the renderer, so we draw the trail relative to the blade
        // The blade points right (0 degrees).
        // A trail should be "behind" the movement.
        // If we assume standard swing, we can just draw a static "motion blur" shape 
        // or use the attackProgress to draw a trail arc?
        // Since we don't have previous frame data here easily, let's draw a "motion blur" shape attached to the blade.
        
        ctx.fillStyle = `rgba(249, 115, 22, ${0.6 * (1 - attackProgress)})`; // Fade out
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, 45, -0.5, 0.5); // Arc behind
        ctx.fill();
        
        ctx.restore();
    }

    ctx.restore();
};

export const resolveCleaverAttack = (
    player: Player,
    enemies: Enemy[],
    particles: Particle[],
    attackRange: number,
    attackHeight: number
) => {
    // Custom hitbox logic for Cleaver
    const hitbox = {
        pos: { 
            x: player.pos.x + (player.facingRight ? player.width : -attackRange),
            y: player.pos.y - 20 // Hit slightly above too for big cleaver
        },
        width: attackRange,
        height: attackHeight
    };
    
    let hitCount = 0;

    enemies.forEach(e => {
        if (checkAABB(hitbox, e)) {
            e.health -= player.stats.damage; 
            // Massive Knockback
            e.vel.x = player.facingRight ? 15 : -15; 
            e.vel.y = -8; // Launch up
            
            // Hit Effects
            createCleaverHitParticles(particles, e.pos.x + e.width/2, e.pos.y + e.height/2);
            hitCount++;
        }
    });

    if (hitCount > 0) {
        audio.playHit();
        // Screen shake or heavy impact sound could go here
    }
    
    // Ground Smash Effect (Visual only, spawns particles)
    if (player.isGrounded) {
         createGroundSmashParticles(particles, player.pos.x + (player.facingRight ? 50 : -50), player.pos.y + player.height);
    }
};

const createCleaverHitParticles = (particles: Particle[], x: number, y: number) => {
    for(let i=0; i<15; i++) {
        particles.push({
            x, y,
            vx: (Math.random() - 0.5) * 10,
            vy: (Math.random() - 0.5) * 10,
            life: 20 + Math.random() * 10,
            color: Math.random() > 0.5 ? '#F97316' : '#EF4444', // Orange/Red
            size: Math.random() * 4 + 2
        });
    }
};

const createGroundSmashParticles = (particles: Particle[], x: number, y: number) => {
    for(let i=0; i<10; i++) {
        particles.push({
            x: x + (Math.random() - 0.5) * 20,
            y: y,
            vx: (Math.random() - 0.5) * 5,
            vy: -Math.random() * 5 - 2,
            life: 30,
            color: '#78350F', // Dirt/Ground color
            size: Math.random() * 3 + 1
        });
    }
};
