
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Settings } from 'lucide-react';
import { GameState, Item, Loadout, LoadoutSlot, ItemCategory, WeaponType, ItemRarity } from '../types';
import { MOVE_SPEED } from '../constants';
import { generateSpecificLoot } from '../game/systems/CombatSystem';

interface LobbyProps {
  setGameState: (state: GameState) => void;
  lastResult: { won: boolean; loot: Item[] | null; bonus?: Item | null } | null;
  stash: Item[];
  setStash: React.Dispatch<React.SetStateAction<Item[]>>;
  loadout: Loadout;
  setLoadout: React.Dispatch<React.SetStateAction<Loadout>>;
  playerRank: number;
}

const Lobby: React.FC<LobbyProps> = ({ setGameState, lastResult, stash, setStash, loadout, setLoadout, playerRank }) => {
  const [view, setView] = useState<'MAIN' | 'LOADOUT' | 'DEPLOY' | 'SHOP'>('MAIN');
  const [showSettings, setShowSettings] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showChest, setShowChest] = useState(false);
  const [chestOpened, setChestOpened] = useState(false);
  
  useEffect(() => {
      if (lastResult?.bonus) {
          setShowChest(true);
      }
  }, [lastResult]);

  const handleOpenChest = () => {
      setChestOpened(true);
      if (lastResult?.bonus) {
          // Add bonus to stash
          setStash(prev => [...prev, lastResult.bonus!]);
      }
      setTimeout(() => {
          setShowChest(false);
          setChestOpened(false);
      }, 3000);
  };
  
  const [showCheatInput, setShowCheatInput] = useState(false);
  const [cheatPass, setCheatPass] = useState('');
  const [cheatAttempts, setCheatAttempts] = useState(0);
  const [cheatLocked, setCheatLocked] = useState(false);

  const [dragData, setDragData] = useState<{ source: 'STASH' | LoadoutSlot, index?: number, item: Item } | null>(null);

  const leaderboardRef = useRef<HTMLDivElement>(null);

  // Generate some persistent-ish dummy data for the leaderboard
  const dummyLeaderboard = useMemo(() => {
    const names = [
      "NoobSlayer", "ShadowStick", "VoidWalker", "LootGoblin", "SwiftStrike", 
      "EliteFighter", "GhostBlade", "NeonKnight", "ChaosMaker", "ZonerX",
      "StickKing", "ProSniper", "DarkCloud", "SilverSoul", "FlameDash",
      "IronWill", "TacticalCat", "RapidFire", "StashGuardian", "ExtractionGod"
    ];
    
    // Create a list of 1000 items
    return Array.from({ length: 1000 }, (_, i) => {
        const rank = i + 1;
        const name = names[i % names.length] + "_" + (i + 1);
        return { rank, name };
    });
  }, []);

  useEffect(() => {
    if (showLeaderboard && leaderboardRef.current) {
        const element = document.getElementById(`rank-${playerRank}`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
  }, [showLeaderboard, playerRank]);

  // --- Drag and Drop Logic ---

  const handleDragStart = (e: React.DragEvent, item: Item, source: 'STASH' | LoadoutSlot, index?: number) => {
    setDragData({ source, index, item });
    e.dataTransfer.setData('text/plain', item.id);
    e.dataTransfer.effectAllowed = 'move';
    // Small delay to let the ghost image form before applying styles if needed
  };

  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
  };

  const handleDropOnSlot = (e: React.DragEvent, targetSlot: LoadoutSlot) => {
      e.preventDefault();
      if (!dragData) return;

      const item = dragData.item;
      
      // Check compatibility
      let isValid = false;
      if (targetSlot === 'PRIMARY_WEAPON' || targetSlot === 'SECONDARY_WEAPON') {
          isValid = item.category === 'WEAPON';
      } else {
          isValid = item.category === targetSlot;
      }

      if (!isValid) return;

      if (dragData.source === 'STASH' && typeof dragData.index === 'number') {
          // Equip from Stash
          const newLoadout = { ...loadout };
          const currentItem = newLoadout[targetSlot];
          
          newLoadout[targetSlot] = item;
          setLoadout(newLoadout);

          const newStash = [...stash];
          newStash.splice(dragData.index, 1);
          if (currentItem) {
              newStash.push(currentItem);
          }
          setStash(newStash);
      } else if (dragData.source !== 'STASH' && dragData.source !== targetSlot) {
          // Swap between slots (e.g. Weapon 1 <-> Weapon 2)
          const sourceSlot = dragData.source as LoadoutSlot;
          const newLoadout = { ...loadout };
          const targetItem = newLoadout[targetSlot];

          newLoadout[targetSlot] = item;
          newLoadout[sourceSlot] = targetItem;
          setLoadout(newLoadout);
      }
      
      setDragData(null);
  };

  const handleDropOnStash = (e: React.DragEvent) => {
      e.preventDefault();
      if (!dragData) return;

      if (dragData.source !== 'STASH') {
          // Unequip from Slot
          const sourceSlot = dragData.source as LoadoutSlot;
          const item = dragData.item;
          
          setLoadout(prev => ({ ...prev, [sourceSlot]: null }));
          setStash(prev => [...prev, item]);
      }
      setDragData(null);
  };

  // --- Shift + Click Logic ---

  const handleEquip = (item: Item, index: number) => {
    let targetSlot: LoadoutSlot | null = null;
    
    switch(item.category) {
        case 'HELMET': targetSlot = 'HELMET'; break;
        case 'CHEST': targetSlot = 'CHEST'; break;
        case 'LEGGINGS': targetSlot = 'LEGGINGS'; break;
        case 'BOOTS': targetSlot = 'BOOTS'; break;
        case 'GLOVES': targetSlot = 'GLOVES'; break;
        case 'RING': targetSlot = 'RING'; break;
        case 'WEAPON':
            if (!loadout.PRIMARY_WEAPON) targetSlot = 'PRIMARY_WEAPON';
            else if (!loadout.SECONDARY_WEAPON) targetSlot = 'SECONDARY_WEAPON';
            else targetSlot = 'PRIMARY_WEAPON';
            break;
    }

    if (!targetSlot) return;

    const currentEquipped = loadout[targetSlot];
    setLoadout(prev => ({ ...prev, [targetSlot!]: item }));

    const newStash = [...stash];
    newStash.splice(index, 1);
    if (currentEquipped) {
        newStash.push(currentEquipped);
    }
    setStash(newStash);
  };

  const handleUnequip = (slot: LoadoutSlot) => {
      const item = loadout[slot];
      if (!item) return;

      setLoadout(prev => ({ ...prev, [slot]: null }));
      setStash(prev => [...prev, item]);
  };

  const onStashItemClick = (e: React.MouseEvent, item: Item, index: number) => {
      if (e.shiftKey) {
          handleEquip(item, index);
      }
  };

  const onSlotClick = (e: React.MouseEvent, slot: LoadoutSlot) => {
      if (e.shiftKey) {
          handleUnequip(slot);
      }
  };

  // Helper function to render a equipment slot
  const renderSlot = (label: string, slot: LoadoutSlot, size: 'md' | 'lg' = 'md') => (
    <Slot 
        label={label} 
        size={size} 
        item={loadout[slot]} 
        onClick={(e) => onSlotClick(e, slot)}
        onDragStart={(e) => loadout[slot] && handleDragStart(e, loadout[slot]!, slot)}
        onDrop={(e) => handleDropOnSlot(e, slot)}
        onDragOver={handleDragOver}
    />
  );

  const submitCheat = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (cheatLocked) return;

    if (cheatPass === "0546") {
      const rarities: ItemRarity[] = ['COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY'];
      const categories: ItemCategory[] = ['HELMET', 'CHEST', 'LEGGINGS', 'BOOTS', 'GLOVES', 'RING'];
      const newItems: Item[] = [];

      rarities.forEach(rarity => {
          // Standard Armor/Ring
          categories.forEach(cat => {
              newItems.push(generateSpecificLoot(cat, rarity));
          });
          // Weapons (Force one of each type)
          newItems.push(generateSpecificLoot('WEAPON', rarity, 'SWORD'));
          newItems.push(generateSpecificLoot('WEAPON', rarity, 'BOW'));
      });

      setStash(prev => [...prev, ...newItems]);
      alert("All items added to stash!");
      setShowSettings(false);
      setShowCheatInput(false);
      setCheatPass('');
    } else {
      const newAttempts = cheatAttempts + 1;
      setCheatAttempts(newAttempts);
      setCheatPass('');
      if (newAttempts >= 3) {
        setCheatLocked(true);
        setShowCheatInput(false);
        alert("Too many failed attempts. TEST button locked.");
      } else {
        alert(`Incorrect password. ${3 - newAttempts} attempts remaining.`);
      }
    }
  };

  const calculateDisplayStats = () => {
      let hp = 100;
      let dmg = 10;
      let spd = MOVE_SPEED;
      let atkSpd = 1.0;

      const armorSlots: LoadoutSlot[] = ['HELMET', 'CHEST', 'LEGGINGS', 'BOOTS', 'GLOVES', 'RING'];
      armorSlots.forEach(slot => {
          const item = loadout[slot];
          if (item && item.stats) {
              if (item.stats.hp) hp += item.stats.hp;
              if (item.stats.damage) dmg += item.stats.damage;
              if (item.stats.moveSpeed) spd += item.stats.moveSpeed;
              if (item.stats.attackSpeed) atkSpd -= item.stats.attackSpeed;
          }
      });

      const weapon = loadout.PRIMARY_WEAPON || loadout.SECONDARY_WEAPON;
      if (weapon && weapon.stats) {
          if (weapon.stats.damage) dmg += weapon.stats.damage;
          if (weapon.stats.attackSpeed) atkSpd -= weapon.stats.attackSpeed;
      }

      return { hp, dmg, spd: spd.toFixed(1), atkSpd: Math.round((1 - atkSpd) * 100) };
  };

  const stats = calculateDisplayStats();

  if (view === 'LOADOUT' || view === 'DEPLOY' || view === 'SHOP') {
      return (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-95 z-50 text-white select-none">
              <div className="max-w-[90vw] w-full p-8 bg-gray-800 border-4 border-gray-700 shadow-2xl rounded-lg flex flex-col items-center relative min-h-[80vh]">
                  <h2 className="text-3xl mb-8 text-yellow-500 retro-font">
                      {view === 'DEPLOY' ? 'PREPARE FOR DEPLOYMENT' : 
                       view === 'SHOP' ? 'ITEM SHOP' : 'LOADOUT'}
                  </h2>
                  
                  <button 
                    onClick={() => setView('MAIN')}
                    className="absolute top-6 left-6 text-gray-400 hover:text-white font-mono text-xl"
                  >
                    ← BACK
                  </button>

                  {view !== 'SHOP' && (
                    <div className="flex flex-row items-start justify-center gap-12 w-full mb-8">
                        <div className="flex flex-col gap-2">
                            <h3 className="text-gray-400 font-mono text-center tracking-widest border-b border-gray-700 pb-2">STASH</h3>
                            <p className="text-[10px] text-gray-500 text-center uppercase">Drag to Equip • Shift+Click to Fast Equip</p>
                            <div 
                                className="grid grid-cols-5 gap-2 bg-gray-900 p-4 border-2 border-gray-700 rounded h-[400px] overflow-y-auto w-[300px] content-start"
                                onDragOver={handleDragOver}
                                onDrop={handleDropOnStash}
                            >
                                {Array.from({ length: Math.max(40, stash.length + 5) }).map((_, i) => {
                                    const item = stash[i];
                                    return (
                                        <div 
                                            key={i} 
                                            onClick={(e) => item && onStashItemClick(e, item, i)}
                                            draggable={!!item}
                                            onDragStart={(e) => item && handleDragStart(e, item, 'STASH', i)}
                                            className={`w-10 h-10 border relative group flex items-center justify-center ${item ? `${getRarityBg(item.rarity)} ${getRarityColor(item.rarity).split(' ')[0]} hover:border-white cursor-grab active:cursor-grabbing` : 'bg-gray-800 border-gray-600'}`}
                                        >
                                            {item && (
                                                <>
                                                    <ItemIcon item={item} className="w-6 h-6" />
                                                    <ItemTooltip item={item} />
                                                </>
                                            )}
                                            <div className="hidden group-hover:block absolute inset-0 bg-white/5"></div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="flex flex-col items-center">
                            <div className="flex flex-row items-center gap-12">
                                <div className="flex flex-col gap-6 mt-8">
                                    {renderSlot("HELMET", 'HELMET')}
                                    {renderSlot("CHESTPLATE", 'CHEST')}
                                    {renderSlot("LEGGINGS", 'LEGGINGS')}
                                </div>

                                <div className="relative w-40 h-80">
                                    <div className="absolute left-1/2 top-4 -translate-x-1/2 flex flex-col items-center">
                                        <div className="w-16 h-16 border-[4px] border-blue-500 rounded-full bg-gray-900 z-20"></div>
                                        <div className="w-1.5 h-28 bg-blue-500 -mt-1 z-10 relative">
                                            <div className="absolute top-4 left-1/2 -translate-x-1/2 w-32 h-1.5 bg-blue-500 rounded-full"></div>
                                        </div>
                                        <div className="relative w-full">
                                            <div className="absolute top-0 left-1/2 w-1.5 h-32 bg-blue-500 origin-top -translate-x-1/2 rotate-[15deg] rounded-b-full"></div>
                                            <div className="absolute top-0 left-1/2 w-1.5 h-32 bg-blue-500 origin-top -translate-x-1/2 -rotate-[15deg] rounded-b-full"></div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-6 mt-8">
                                    {renderSlot("GLOVES", 'GLOVES')}
                                    {renderSlot("RING", 'RING')}
                                    {renderSlot("BOOTS", 'BOOTS')}
                                </div>
                            </div>

                            <div className="flex gap-12 mt-8 pt-8 border-t border-gray-700 w-full justify-center">
                                <div className="flex flex-col items-center">
                                    {renderSlot("PRIMARY WEAPON", 'PRIMARY_WEAPON', 'lg')}
                                    <span className="text-[10px] text-gray-500 font-mono mt-1">[1]</span>
                                </div>
                                <div className="flex flex-col items-center">
                                    {renderSlot("SECONDARY WEAPON", 'SECONDARY_WEAPON', 'lg')}
                                    <span className="text-[10px] text-gray-500 font-mono mt-1">[2]</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-4 w-40">
                            <h3 className="text-gray-400 font-mono text-center tracking-widest border-b border-gray-700 pb-2">STATS</h3>
                            <div className="flex flex-col gap-3">
                                <StatDisplay label="MAX HEALTH" value={stats.hp} color="text-green-400" />
                                <StatDisplay label="DAMAGE" value={stats.dmg} color="text-red-400" />
                                <StatDisplay label="MOVEMENT SPD" value={stats.spd} color="text-blue-400" />
                                <StatDisplay label="ATK SPEED" value={`+${stats.atkSpd}%`} color="text-orange-400" />
                            </div>
                        </div>
                    </div>
                  )}

                  {view === 'SHOP' && (
                      <div className="w-full flex-1 bg-gray-900 border-2 border-gray-700 rounded p-4 overflow-y-auto min-h-[400px]">
                          {/* Placeholder container for shop items */}
                          <div className="w-full flex flex-col gap-4 min-h-[600px] items-center justify-center text-gray-600 font-mono">
                              <p className="tracking-widest animate-pulse">ESTABLISHING CONNECTION TO BLACK MARKET...</p>
                              {/* Content will be added here later */}
                          </div>
                      </div>
                  )}
                  
                  {view === 'DEPLOY' && (
                      <button 
                          onClick={() => setGameState(GameState.PLAYING)}
                          className="absolute bottom-8 right-8 px-10 py-5 bg-red-600 hover:bg-red-500 text-white font-bold text-2xl rounded-lg shadow-[0_0_15px_rgba(220,38,38,0.7)] border-2 border-red-400 hover:border-white transition-all transform hover:scale-105 active:scale-95 retro-font tracking-widest"
                      >
                          PLAY
                      </button>
                  )}
              </div>
          </div>
      );
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-95 z-50 text-white">
      {/* Top Left Buttons */}
      <div className="absolute top-6 left-6 flex gap-4 z-[60]">
          <button 
              onClick={() => setShowSettings(true)}
              className="p-3 bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white rounded-full border-2 border-gray-600 transition-all shadow-lg"
          >
              <Settings size={24} />
          </button>
      </div>

      {/* Top Right Buttons */}
      <div className="absolute top-6 right-6 flex gap-4 z-[60]">
          <button 
              onClick={() => setShowLeaderboard(true)}
              className="px-4 py-2 bg-yellow-600 hover:bg-yellow-500 text-white font-bold rounded border-b-4 border-yellow-800 transition-all flex items-center gap-2 retro-font text-[10px]"
          >
              🏆 LEADERBOARD
          </button>
      </div>

      <div className="max-w-lg w-full p-10 bg-gray-800 border-4 border-gray-700 shadow-2xl rounded-lg text-center relative">
        <h1 className="text-4xl mb-6 text-yellow-500 retro-font tracking-tighter">
          STICKMAN EXTRACTION
        </h1>
        
        {lastResult && (
            <div className={`mb-6 p-4 border-2 ${lastResult.won ? 'border-green-500 bg-green-900/30' : 'border-red-500 bg-red-900/30'}`}>
                <h2 className="text-2xl font-bold mb-2">
                    {lastResult.won ? 'EXTRACTION SUCCESSFUL' : 'K.I.A.'}
                </h2>
                {lastResult.loot && lastResult.loot.length > 0 ? (
                     <div className="mt-2">
                         <p className="text-yellow-400 font-bold mb-2">WHAT I RECOVERED:</p>
                         <div className="flex flex-wrap justify-center gap-2">
                             {lastResult.loot.map((item, idx) => (
                                 <div key={idx} className={`text-xs px-2 py-1 border rounded ${getRarityColor(item.rarity)} ${getRarityBg(item.rarity)}`}>
                                     {item.name}
                                 </div>
                             ))}
                         </div>
                     </div>
                ) : (
                    <div className="flex flex-col gap-1 mt-2">
                        <p className="text-gray-400">Mission Failed.</p>
                        <p className="text-red-500 font-bold tracking-widest">LOADOUT LOST</p>
                    </div>
                )}
            </div>
        )}

        {/* Chest Animation Overlay */}
        {showChest && lastResult?.bonus && (
             <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[200] animate-in fade-in duration-500">
                 <div className="flex flex-col items-center">
                     <h2 className="text-4xl text-yellow-500 retro-font mb-8 animate-pulse">VICTOR CHEST!</h2>
                     
                     {!chestOpened ? (
                         <button 
                             onClick={handleOpenChest}
                             className="group relative"
                         >
                             <div className="w-48 h-32 bg-yellow-900 border-4 border-yellow-600 rounded-lg shadow-[0_0_50px_rgba(234,179,8,0.5)] flex items-center justify-center transform transition-transform group-hover:scale-105 group-active:scale-95">
                                 <div className="text-yellow-500 font-bold text-2xl">OPEN CHEST</div>
                             </div>
                         </button>
                     ) : (
                         <div className="flex flex-col items-center animate-in zoom-in duration-500">
                             <div className={`w-32 h-32 border-4 rounded-lg flex items-center justify-center mb-4 ${getRarityColor(lastResult.bonus.rarity)} ${getRarityBg(lastResult.bonus.rarity)} shadow-[0_0_50px_currentColor]`}>
                                 <div className={`w-16 h-16 rounded ${getColorForCategory(lastResult.bonus.category || '')}`}></div>
                             </div>
                             <p className={`text-2xl font-bold ${getRarityColor(lastResult.bonus.rarity).split(' ')[1]}`}>{lastResult.bonus.name}</p>
                             <p className="text-gray-400 mt-2">Added to Stash</p>
                         </div>
                     )}
                 </div>
             </div>
        )}

        <div className="space-y-4">
            <p className="text-gray-400 text-sm mb-8 px-4">
                Infiltrate the zone. Fight off the stickman insurgence. 
                Collect high-value loot. Get to the Extraction Point before time runs out.
            </p>

            <button
              onClick={() => setView('DEPLOY')}
              className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded shadow-[0_4px_0_rgb(29,78,216)] active:shadow-none active:translate-y-1 transition-all text-xl"
            >
              DEPLOY TO ZONE
            </button>
            
            <button 
                onClick={() => setView('LOADOUT')}
                className="w-full py-3 bg-gray-700 hover:bg-gray-600 text-gray-300 rounded text-sm border border-gray-600 font-bold tracking-wide uppercase"
            >
                EDIT LOADOUT
            </button>

             <button 
                onClick={() => setView('SHOP')}
                className="w-full py-3 bg-yellow-700/50 hover:bg-yellow-600/50 text-yellow-200 hover:text-white rounded text-sm border border-yellow-600/50 font-bold tracking-wide uppercase transition-colors"
            >
                SHOP
            </button>
        </div>
        
        <div className="mt-10 text-xs text-gray-600 border-t border-gray-700 pt-4">
            SERVER STATUS: <span className="text-green-500">ONLINE</span> • PING: 24ms
        </div>
      </div>

      {/* Leaderboard Modal */}
      {showLeaderboard && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] p-4">
              <div className="bg-gray-800 border-4 border-gray-700 p-8 rounded-lg max-w-md w-full relative h-[80vh] flex flex-col">
                  <button 
                      onClick={() => setShowLeaderboard(false)}
                      className="absolute top-4 right-4 text-gray-400 hover:text-white font-bold text-2xl"
                  >
                      ✕
                  </button>
                  <h3 className="text-2xl text-yellow-500 mb-6 retro-font text-center uppercase tracking-widest border-b border-gray-700 pb-4">RANKINGS</h3>
                  
                  <div ref={leaderboardRef} className="flex-1 overflow-y-auto pr-2 space-y-2 custom-scrollbar">
                      {dummyLeaderboard.map((entry) => {
                          const isPlayer = entry.rank === playerRank;
                          return (
                              <div 
                                  key={entry.rank}
                                  id={`rank-${entry.rank}`}
                                  className={`flex items-center gap-4 p-3 rounded border-2 transition-all ${
                                      isPlayer 
                                      ? 'bg-blue-900/40 border-blue-400 scale-[1.02] shadow-[0_0_10px_rgba(59,130,246,0.3)]' 
                                      : 'bg-gray-900 border-gray-700'
                                  }`}
                              >
                                  <div className={`w-12 text-center font-mono font-bold ${isPlayer ? 'text-blue-400' : 'text-gray-500'}`}>
                                      #{entry.rank}
                                  </div>
                                  <div className={`flex-1 font-mono uppercase tracking-wider ${isPlayer ? 'text-white' : 'text-gray-300'}`}>
                                      {isPlayer ? "YOU (YOU)" : entry.name}
                                  </div>
                                  {isPlayer && (
                                      <div className="animate-pulse w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_5px_rgba(96,165,250,1)]"></div>
                                  )}
                              </div>
                          );
                      })}
                  </div>

                  <div className="mt-6 pt-4 border-t border-gray-700 text-center">
                      <p className="text-[10px] text-gray-500 font-mono">
                          WIN TO LOWER YOUR RANK NUMBER • LOSE TO GO HIGHER
                      </p>
                      <p className="text-xs text-blue-400 font-mono mt-1">
                          YOUR CURRENT RANK: <span className="font-bold">#{playerRank}</span>
                      </p>
                  </div>
              </div>
          </div>
      )}

      {showSettings && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100]">
              <div className="bg-gray-800 border-4 border-gray-700 p-6 rounded-lg w-64 relative shadow-2xl">
                  <button 
                      onClick={() => {
                        setShowSettings(false);
                        setShowCheatInput(false);
                      }}
                      className="absolute top-2 right-2 text-gray-400 hover:text-white"
                  >
                      ✕
                  </button>
                  <h3 className="text-lg text-yellow-500 mb-4 retro-font text-center uppercase tracking-widest">Settings</h3>
                  
                  <div className="space-y-4">
                      {cheatLocked ? (
                        <div className="w-full py-2 bg-red-900/30 text-red-500 font-bold rounded border border-red-700 retro-font text-[10px] text-center">
                            LOCKED
                        </div>
                      ) : (
                        <div className="flex flex-col gap-2">
                           <button 
                                onClick={() => setShowCheatInput(!showCheatInput)}
                                className={`w-full py-2 ${showCheatInput ? 'bg-red-800' : 'bg-red-600'} hover:bg-red-500 text-white font-bold rounded border-b-4 border-red-800 active:border-b-0 active:translate-y-1 transition-all retro-font text-[10px]`}
                            >
                                CHEATS
                            </button>
                            
                            {showCheatInput && (
                                <form onSubmit={submitCheat} className="flex gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <input 
                                        type="password"
                                        placeholder="CODE"
                                        value={cheatPass}
                                        onChange={(e) => setCheatPass(e.target.value)}
                                        autoFocus
                                        className="flex-1 bg-gray-900 border border-gray-600 rounded px-2 py-1 text-[10px] font-mono text-white focus:outline-none focus:border-yellow-500"
                                    />
                                    <button 
                                        type="submit"
                                        className="bg-yellow-600 hover:bg-yellow-500 text-white px-2 py-1 rounded text-[10px] font-bold retro-font"
                                    >
                                        OK
                                    </button>
                                </form>
                            )}
                        </div>
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

const StatDisplay: React.FC<{ label: string; value: string | number; color: string }> = ({ label, value, color }) => (
    <div className="flex flex-col bg-gray-900 p-3 rounded border border-gray-700 w-full shadow-sm">
        <span className="text-gray-500 text-[10px] font-bold tracking-wider mb-1">{label}</span>
        <span className={`text-2xl font-mono ${color}`}>{value}</span>
    </div>
);

const getColorForCategory = (cat: string) => {
    switch(cat) {
        case 'WEAPON': return 'bg-red-500';
        case 'HELMET': 
        case 'CHEST':
        case 'LEGGINGS': return 'bg-blue-500';
        case 'BOOTS': return 'bg-green-500';
        case 'GLOVES': return 'bg-orange-500';
        case 'RING': return 'bg-purple-500';
        default: return 'bg-gray-500';
    }
}

const getRarityColor = (rarity?: string) => {
    switch(rarity) {
        case 'LEGENDARY': return 'border-orange-500 text-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]';
        case 'EPIC': return 'border-purple-500 text-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]';
        case 'RARE': return 'border-blue-400 text-blue-400 shadow-[0_0_6px_rgba(96,165,250,0.5)]';
        case 'UNCOMMON': return 'border-green-400 text-green-400';
        default: return 'border-gray-600 text-gray-400';
    }
}

const getRarityBg = (rarity?: string) => {
    switch(rarity) {
        case 'LEGENDARY': return 'bg-orange-900/20';
        case 'EPIC': return 'bg-purple-900/20';
        case 'RARE': return 'bg-blue-900/20';
        case 'UNCOMMON': return 'bg-green-900/20';
        default: return 'bg-gray-800';
    }
}

const ItemTooltip: React.FC<{item: Item}> = ({item}) => (
    <div className={`absolute left-full top-0 ml-2 z-50 w-52 bg-black border p-3 text-xs hidden group-hover:block rounded pointer-events-none text-left shadow-2xl ${getRarityColor(item.rarity).split(' ')[0]}`}>
        <p className={`font-bold mb-1 text-sm uppercase ${getRarityColor(item.rarity).split(' ')[1]}`}>{item.name}</p>
        <div className="flex justify-between items-center mb-2">
            <p className="text-gray-500 uppercase text-[10px] tracking-widest">{item.category}</p>
            <p className={`uppercase text-[10px] font-bold ${getRarityColor(item.rarity).split(' ')[1]}`}>{item.rarity || 'COMMON'}</p>
        </div>
        <div className="space-y-1.5 border-t border-gray-800 pt-2">
            {item.stats?.hp && <p className="text-green-400 flex justify-between"><span>+ HP:</span> <span>{item.stats.hp}</span></p>}
            {item.stats?.damage && <p className="text-red-400 flex justify-between"><span>+ DMG:</span> <span>{item.stats.damage}</span></p>}
            {item.stats?.moveSpeed && <p className="text-blue-400 flex justify-between"><span>+ SPD:</span> <span>{item.stats.moveSpeed.toFixed(1)}</span></p>}
            {item.stats?.attackSpeed && <p className="text-orange-400 flex justify-between"><span>+ ATK SPD:</span> <span>{Math.round(item.stats.attackSpeed * 100)}%</span></p>}
        </div>
        <p className="mt-3 text-gray-600 text-[9px] italic border-t border-gray-900 pt-1 text-right">Value: {item.value}c</p>
    </div>
);

interface SlotProps { 
    label: string; 
    size?: 'md' | 'lg'; 
    item?: Item | null; 
    onClick: (e: React.MouseEvent) => void;
    onDragStart: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
    onDragOver: (e: React.DragEvent) => void;
}

const Slot: React.FC<SlotProps> = ({ label, size = 'md', item, onClick, onDragStart, onDrop, onDragOver }) => {
    const sizeClasses = size === 'lg' ? 'w-28 h-28' : 'w-16 h-16';
    const rarityClass = item ? getRarityColor(item.rarity).split(' ')[0] : 'border-gray-600';
    const rarityBg = item ? getRarityBg(item.rarity) : 'bg-gray-900';
    
    return (
        <div className="flex flex-col items-center gap-2 group">
            <div 
                onClick={onClick}
                onDrop={onDrop}
                onDragOver={onDragOver}
                draggable={!!item}
                onDragStart={onDragStart}
                className={`${sizeClasses} ${rarityBg} border-2 ${rarityClass} flex items-center justify-center hover:border-white transition-colors cursor-pointer shadow-inner relative overflow-visible rounded`}
            >
                {item ? (
                     <div className={`w-full h-full flex items-center justify-center relative group-hover:z-50`}>
                        <ItemIcon item={item} className="w-1/2 h-1/2" />
                        <ItemTooltip item={item} />
                     </div>
                ) : (
                    <>
                        <div className="absolute inset-0 bg-gray-800 opacity-0 group-hover:opacity-20 transition-opacity pointer-events-none"></div>
                        <span className="text-gray-700 text-4xl group-hover:text-yellow-500/50 transition-colors">+</span>
                    </>
                )}
            </div>
            <span className="text-[10px] text-gray-500 font-bold tracking-wider group-hover:text-gray-300 transition-colors uppercase">{label}</span>
        </div>
    );
};

const ItemIcon: React.FC<{ item: Item, className?: string }> = ({ item, className }) => {
    if (item.name === 'Common Bow' || item.name === 'Uncommon Bow') {
        return (
            <div className={`${className} flex items-center justify-center`}>
                <svg viewBox="0 0 24 24" className="w-full h-full" style={{ filter: 'drop-shadow(0px 1px 1px rgba(0,0,0,0.5))' }}>
                    {/* String */}
                    <line x1="18" y1="5" x2="5" y2="18" stroke="#D1D5DB" strokeWidth="1" />
                    {/* Bow Body */}
                    <path d="M18 5 C 10 2, 2 10, 5 18" stroke="#854D0E" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                    {/* Grip */}
                    <path d="M10 10 L 13 13" stroke="#451a03" strokeWidth="3" strokeLinecap="round" />
                </svg>
            </div>
        );
    }
    if (item.name === 'Rare Bow') {
        return (
            <div className={`${className} flex items-center justify-center`}>
                <svg viewBox="0 0 24 24" className="w-full h-full" style={{ filter: 'drop-shadow(0px 0px 4px rgba(59, 130, 246, 0.6))' }}>
                    {/* String */}
                    <line x1="18" y1="5" x2="5" y2="18" stroke="#BFDBFE" strokeWidth="1" />
                    {/* Bow Body - Dark Blue-Grey */}
                    <path d="M18 5 C 10 2, 2 10, 5 18" stroke="#334155" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                    {/* Grip - Leather Brown */}
                    <path d="M10 10 L 13 13" stroke="#854D0E" strokeWidth="3" strokeLinecap="round" />
                    {/* Blue Accent/Binding */}
                    <path d="M11 11 L 12 12" stroke="#3B82F6" strokeWidth="1" strokeLinecap="round" />
                </svg>
            </div>
        );
    }
    if (item.name === 'Epic Bow') {
        return (
            <div className={`${className} flex items-center justify-center`}>
                <svg viewBox="0 0 24 24" className="w-full h-full" style={{ filter: 'drop-shadow(0px 0px 5px rgba(168, 85, 247, 0.8))' }}>
                    {/* String */}
                    <line x1="18" y1="5" x2="5" y2="18" stroke="#D1D5DB" strokeWidth="1" />
                    {/* Bow Body */}
                    <path d="M18 5 C 10 2, 2 10, 5 18" stroke="#854D0E" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                    {/* Grip */}
                    <path d="M10 10 L 13 13" stroke="#451a03" strokeWidth="3" strokeLinecap="round" />
                </svg>
            </div>
        );
    }
    if (item.name === 'Legendary Bow') {
        return (
            <div className={`${className} flex items-center justify-center`}>
                <svg viewBox="0 0 24 24" className="w-full h-full" style={{ filter: 'drop-shadow(0px 0px 6px rgba(249, 115, 22, 0.8))' }}>
                    {/* String */}
                    <line x1="18" y1="5" x2="5" y2="18" stroke="#FDBA74" strokeWidth="1" />
                    {/* Bow Body */}
                    <path d="M18 5 C 10 2, 2 10, 5 18" stroke="#854D0E" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                    {/* Grip */}
                    <path d="M10 10 L 13 13" stroke="#451a03" strokeWidth="3" strokeLinecap="round" />
                </svg>
            </div>
        );
    }
    return <div className={`${className} rounded-sm ${getColorForCategory(item.category || '')}`}></div>;
};

export default Lobby;
