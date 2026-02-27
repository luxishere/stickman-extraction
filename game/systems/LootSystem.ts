
import { Player, Item, Particle } from '../../types';
import { checkAABB } from '../Physics';
import { audio } from '../Audio';

export const handleLoot = (
    player: Player, 
    items: Item[], 
    particles: Particle[],
    onItemCollected: (item: Item) => void
) => {
    items.forEach(item => {
        if (!item.collected && checkAABB(player, { ...item, width: 20, height: 20 })) {
            item.collected = true;
            player.inventory.push(item);
            audio.playCollect();
            
             for(let i=0; i<8; i++) {
                particles.push({
                    x: item.pos.x, y: item.pos.y,
                    vx: (Math.random() - 0.5) * 5,
                    vy: (Math.random() - 0.5) * 5,
                    life: 30 + Math.random() * 20,
                    color: 'yellow',
                    size: Math.random() * 3 + 1
                });
            }

            onItemCollected(item);
        }
    });
};

export const handleExtraction = () => {
};
