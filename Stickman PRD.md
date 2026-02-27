# **Product Requirements Document (PRD) & Game Design Document (GDD)**

Project Name: Stickman Extraction Fighter  
Version: 4.1 (Product-Focused Refactor)  
Status: APPROVED FOR DEVELOPMENT  
Target Platform: Web Browser (Chromebook Optimized) / Desktop  
Input: Keyboard & Mouse  
Resolution: 1280x720 (Scalable Canvas)

## **1\. Executive Summary**

Concept: A high-stakes 1v1 2D platform fighter with RPG loot mechanics.  
Core Loop: Equip 6-Piece Set \-\> Fight 1v1 \-\> Winner Takes All (Loot Transfer) \-\> Upgrade Stash.  
The "Hook": Combines the mechanical skill of a Platform Fighter (Smash Bros) with the gear fear/reward of an Extraction Shooter (Tarkov/Albion), simplified for a browser environment.

## **2\. User User Journeys & UI Flow**

### **2.1 Launch & Login**

* **Entry Point:** index.html.  
* **Screen 1: Landing Page**  
  * **Background:** Dynamic scene of two stickmen fighting (or static splash art).  
  * **UI Elements:**  
    * \[Title Logo\]: "Stickman Extraction" (Placeholder).  
    * \[Login Button\]: For saving data across sessions (Phase 2).  
    * \[Guest Play Button\]: Creates a temporary session ID.  
    * \[Region Selector\]: US-East / US-West (For latency reduction).

### **2.2 The Hub (Main Menu)**

* **Visuals:** Your Stickman stands in the center, wearing current gear.  
* **Layout:**  
  * **Left Panel (Stash):** A grid (8x8) showing stored items.  
  * **Center (Character Paper Doll):** Slots for Helmet, Chest, Legs, Boots, Gloves, Ring, Main Hand, Off Hand (Bow/Shield if added).  
  * **Right Panel (Stats):** Displays calculated stats (HP, Speed, Atk Speed).  
  * **Bottom Right:** \[PLAY\] Big Red Button.  
  * **Top Right:** \[Settings Gear Icon\].

### **2.3 Settings Menu (Modal)**

* **Controls:**  
  * Move: WASD or Arrow Keys.  
  * Jump: Space or W or Up Arrow.  
  * Dash: Shift.  
  * Attack: Left Mouse Click.  
  * Interact/Swap Weapon: 1, 2, or Q.  
* **Audio:** Master Volume slider, SFX Volume slider.  
* **Graphics:** Low Quality (No particles, strictly lines) vs High Quality (Glow effects, particles). *Default to Low for Chromebooks.*

### **2.4 The Match Loop**

1. **Queue:** User clicks \[PLAY\]. Server matches based on **Gear Score** range (+/- 20% variance).  
2. **Loading:** "Finding Opponent..." \-\> "Match Found".  
3. **Spawn:** Both players spawn on opposite sides of the map (P1 Left, P2 Right).  
4. **Countdown:** "3, 2, 1, FIGHT\!" (Inputs locked during countdown).  
5. **Combat:** 3-minute timer.  
6. **Resolution:**  
   * **Victory:** "VICTORY" text. Animation of looting enemy body. Data sent to server to transfer items.  
   * **Defeat:** "DEFEAT" text. Character falls over. Inventory cleared.  
7. **Return:** Auto-redirect to Hub after 5 seconds.

## **3\. Core Gameplay & Physics Mechanics**

### **3.1 Physics Constants (The "Feel")**

* **Reference Resolution:** 1280px width, 720px height.  
* **Player Size:**  
  * Height: 60px.  
  * Width (Hitbox): 20px.  
* **Gravity:** 0.5 px/frame^2. (Crisp, not floaty).  
* **Terminal Velocity:** 12 px/frame (Max fall speed).  
* **Movement Speed (Base):** 5 px/frame.  
* **Jump Force:** \-12 px/frame (Instant vertical impulse).  
* **Double Jump:** Allowed once while isGrounded is false. Reset on touching ground.  
* **Wall Slide:** If touchingWall and falling, clamp vertical speed to 2 px/frame.  
* **Wall Jump:** Impulse X: ±8, Y: \-10. Locking X input for 0.2s (prevent climbing same wall instantly).  
* **Dash:**  
  * Force: 15 px/frame horizontally.  
  * Duration: 10 frames (0.16s).  
  * Cooldown: 60 frames (1s).  
  * Invincibility: None (Phase 1). Used for positioning only.

### **3.2 Health & Damage Math**

* **Base HP:** 100\.  
* **Armor Formula:** TotalHP \= BaseHP \+ HelmetHP \+ ChestHP \+ LeggingsHP.  
* **Damage Formula:** FinalDamage \= WeaponDamage. (Armor adds HP, does not reduce damage percentage in this version).  
* **Pace:**  
  * Average Weapon Damage: 10\.  
  * Average HP Pool: 120-150.  
  * Hits to Kill: \~12 hits.

### **3.3 Map Design (The "Classic Arena")**

* **Boundaries:**  
  * Floor: Solid at Y \= 650\.  
  * Walls: Solid at X \= 0 and X \= 1280\.  
  * Ceiling: Open (but gravity brings you back).  
* **Platforms:**  
  * **Platform A:** X: 300, Y: 450, W: 200\. (Left floating).  
  * **Platform B:** X: 780, Y: 450, W: 200\. (Right floating).  
  * **Platform C:** X: 540, Y: 250, W: 200\. (Top center).  
* **Sudden Death Mechanics:**  
  * Trigger: Timer hits 0:00.  
  * Effect: Left Wall moves right at 1 px/frame. Right Wall moves left at 1 px/frame.  
  * Contact Damage: 1000 HP (Instant Kill).

## **4\. Weapon & Combat Specifications**

### **4.1 Slot System**

* **Active Slots:** 2 (Primary, Secondary).  
* **Swap Logic:** Instant swap. No animation delay, but separate cooldowns track per weapon.

### **4.2 Weapon Class: Sword (The Balanced Melee)**

* **Hitbox Shape:** Semi-circle arc in front of player.  
* **Range:** 60px radius.  
* **Base Damage:** 10\.  
* **Attack Speed (Cooldown):** 0.5s (30 frames).  
* **Animation:** 5 frames windup \-\> 2 frames active hitbox \-\> 10 frames recovery.  
* **Special:** Consistent knockback (small).

### **4.3 Weapon Class: Bow (The Sniper)**

* **Hitbox Shape:** Projectile (Arrow).  
* **Range:** Infinite (until wall/floor impact).  
* **Base Damage:** 8 (Uncharged) to 25 (Max Charge).  
* **Mechanic: Charge-to-Shoot.**  
  * MouseDown: Starts charge timer.  
  * Movement: **Slow Walk** (Player speed reduced by 50% while charging).  
  * Min Charge: 2.0s. If released early \-\> No shot (or weak fizzle shot).  
  * Max Charge: 5.0s. Arrow travels faster and flatter.  
* **Projectile Physics:** Gravity applies to arrow (0.1 px/frame^2). It arcs.

### **4.4 Weapon Class: Scythe (The Zoner)**

* **Hitbox Shape:** Large Rectangle reaching *past* the Sword range.  
* **Range:** 100px reach.  
* **Deadzone:** The first 20px closest to player deals 0 damage (Handle hit). Must hit with blade.  
* **Base Damage:** 18 (High).  
* **Attack Speed (Cooldown):** 1.0s (60 frames).  
* **Animation:** 15 frames windup (Telegraphed) \-\> 5 frames active \-\> 20 frames recovery.  
* **Risk:** Player is rooted (cannot move) for the 5 active frames.

## **5\. Economy & RPG Systems**

### **5.1 Item Attributes (Data Definitions)**

This section defines the **Product Attributes** that every item must possess. The technical implementation (JSON/SQL/Class) is up to the Tech Stack.

* **Unique Identifier (ID):** Must allow tracking individual item instances (to prevent duplication glitches).  
* **Display Name:** The visible name (e.g., "Rusty Iron Helmet").  
* **Equip Slot:** Must strictly map to one of the 6 defined slots (Helmet, Chest, Legs, Boots, Gloves, Ring) or a Weapon slot.  
* **Rarity Tier:** Defines the item's visual border color and stat multiplier (Common, Uncommon, Rare, Legendary).  
* **Stat Modifiers:** The item must be able to modify one or more of the following:  
  * Max HP (Flat increase).  
  * Movement Speed (Multiplier or flat increase).  
  * Attack Damage (Flat increase).  
  * Attack Speed (Cooldown reduction).  
* **Visual Asset Reference:** A pointer to the specific graphic/code function used to render the item on the player.

### **5.2 Rarity Multipliers**

* **Common:** 1.0x Stats.  
* **Uncommon:** 1.2x Stats.  
* **Rare:** 1.5x Stats \+ 1 random substat (e.g., \+2 Speed on a Sword).  
* **Legendary:** 2.0x Stats \+ Unique visual glow.

### **5.3 Starter Kit Logic**

* **Trigger:** Player enters Matchmaking with inventory array length 0 AND equipped slots empty.  
* **Grant:**  
  * 50% Chance: Common Sword \+ Common Chestplate.  
  * 25% Chance: Common Bow \+ Common Chestplate.  
  * 25% Chance: Common Scythe \+ Common Chestplate.  
* **Flag:** isTemporary: true (Cannot be unequipped into Stash, disappears on next death).

## **6\. Technical Stack & Architecture**

### **6.1 Architecture**

* **Server (Authoritative):** Node.js.  
  * Maintains "Master State" of the game loop.  
  * Receives Inputs ({up, down, attack}) from clients.  
  * Processes Physics (Movement, Collisions).  
  * Sends GameStateSnapshot (Player X/Y, HP, ActiveHitboxes) to clients 30 or 60 times/sec.  
* **Client (Renderer):** HTML5 Canvas.  
  * **Prediction:** Client moves the stickman immediately on keypress (to feel responsive).  
  * **Reconciliation:** If Server says "You are actually at X:50", Client smooths correction to X:50.  
  * **Interpolation:** Client draws "Enemy" stickman by smoothing between the last two updates received from Server.

### **6.2 Browser Compatibility**

* **Primary:** Chrome (ChromeOS).  
* **Rendering Context:** CanvasRenderingContext2D.  
* **WebSocket:** Socket.io v4.x.  
* **Storage:** localStorage for Guest session tokens; Memory for active game state.

### **6.3 Security / Anti-Cheat**

* **Input Validation:** Server rejects inputs that are mathematically impossible (e.g., moving 100px in 1 frame).  
* **Cooldown Check:** Server tracks lastAttackTime. If Client sends "Attack" packet during cooldown, ignore it.  
* **Inventory Verification:** Server holds the "Truth" of what items a player has. Client cannot say "I have a Legendary Sword" if the DB says "Empty".

## **7\. Open Questions / Placeholder Logic**

* $$TBD$$  
  Sound Effects: Need list of assets (Swing.mp3, Hit.mp3, Step.mp3).  
* $$TBD$$  
  Networking Tick Rate: Start at 30 ticks/sec for bandwidth safety. Upgrade to 60 if stable.  
* $$TBD$$  
  Scythe Deadzone: Playtest required. If "Handle Hit" feels too bad, remove deadzone and just reduce damage.