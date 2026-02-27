
import React, { useState, useEffect } from 'react';
import GameCanvas from './components/GameCanvas';
import Lobby from './components/Lobby';
import { GameState, Item, Loadout, ItemCategory, ItemRarity } from './types';
import { generateSpecificLoot } from './game/systems/CombatSystem';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [lastResult, setLastResult] = useState<{ won: boolean, loot: Item[] | null, bonus?: Item | null } | null>(null);
  const [playerRank, setPlayerRank] = useState<number>(500); // Starting rank
  const [winStreak, setWinStreak] = useState<number>(0);
  const [stash, setStash] = useState<Item[]>([]);
  const [loadout, setLoadout] = useState<Loadout>({
    HELMET: null,
    CHEST: null,
    LEGGINGS: null,
    BOOTS: null,
    GLOVES: null,
    RING: null,
    PRIMARY_WEAPON: null,
    SECONDARY_WEAPON: null,
  });

  const getGearScore = (currentLoadout: Loadout): number => {
    let score = 0;
    let count = 0;
    const rarityMap: Record<string, number> = {
        'COMMON': 1, 'UNCOMMON': 2, 'RARE': 3, 'EPIC': 4, 'LEGENDARY': 5
    };
    
    Object.values(currentLoadout).forEach(item => {
        if (item) {
            score += rarityMap[item.rarity || 'COMMON'] || 1;
            count++;
        }
    });
    
    return count > 0 ? score / count : 1;
  };

  const getRarityFromScore = (score: number): ItemRarity => {
    // Add some randomness so it's "around" the gear level (-0.5 to +1.0)
    const adjustedScore = score + (Math.random() * 1.5 - 0.5); 
    
    if (adjustedScore >= 4.5) return 'LEGENDARY';
    if (adjustedScore >= 3.5) return 'EPIC';
    if (adjustedScore >= 2.5) return 'RARE';
    if (adjustedScore >= 1.5) return 'UNCOMMON';
    return 'COMMON';
  };

  const handleGameOver = (won: boolean, loot: Item[] | null) => {
    let bonusItem: Item | null = null;
    let newStreak = winStreak;

    if (won) {
        newStreak += 1;
        // Extraction Success: Keep gear, add loot to stash
        if (loot) {
            setStash(prev => [...prev, ...loot]);
        }
        
        // Bonus Chest Logic (Every 2 wins)
        if (newStreak > 0 && newStreak % 2 === 0) {
             const score = getGearScore(loadout);
             const bonusRarity = getRarityFromScore(score);
             const categories: ItemCategory[] = ['HELMET', 'CHEST', 'LEGGINGS', 'BOOTS', 'GLOVES', 'RING', 'WEAPON'];
             const randomCategory = categories[Math.floor(Math.random() * categories.length)];
             
             bonusItem = generateSpecificLoot(randomCategory, bonusRarity);
             // bonusItem.name = `Bonus ${bonusItem.name}`; // Removed prefix as requested
             // Ensure it's marked as collected so it doesn't try to render in world if passed wrongly
             bonusItem.collected = true; 
        }

        // Rank goes lower (better) - Decrease by 3 to 7
        setPlayerRank(prev => Math.max(1, prev - Math.floor(Math.random() * 5 + 3)));
    } else {
        newStreak = 0;
        // Death: Lose all equipped gear
        setLoadout({
            HELMET: null,
            CHEST: null,
            LEGGINGS: null,
            BOOTS: null,
            GLOVES: null,
            RING: null,
            PRIMARY_WEAPON: null,
            SECONDARY_WEAPON: null,
        });
        // Rank goes higher (worse) - Increased rank slightly by 1 to 3
        setPlayerRank(prev => prev + Math.floor(Math.random() * 3 + 1));
    }

    setWinStreak(newStreak);
    setLastResult({ won, loot, bonus: bonusItem });
    setGameState(GameState.MENU);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black select-none">
      <GameCanvas 
        onGameOver={handleGameOver} 
        gameState={gameState} 
        loadout={loadout}
      />
      
      {gameState === GameState.MENU && (
        <Lobby 
            setGameState={setGameState} 
            lastResult={lastResult} 
            stash={stash} 
            setStash={setStash}
            loadout={loadout}
            setLoadout={setLoadout}
            playerRank={playerRank}
        />
      )}
    </div>
  );
};

export default App;
