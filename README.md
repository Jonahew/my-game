# Crystal Garden — Iteration 2

Static browser 3D game using all 13 models from the original Unity/Blender project, converted to GLB with Blender 4.2. Powered by Three.js with zero build step, fully compatible with Vercel and standard static web hosts.

Serve `dist` over HTTP. No installation or build is required. The Three.js renderer and GLTF loader are vendored locally with their license.

## Iteration 2 Improvements

1. **Fair UFO & Sentinel Hitboxes**:
   - Replaced oversized 2D bounding radius with true 3D body collision calculations closely matching the visible UFO saucer and explorer torso.
   - Borderline contact slightly favors the player.
   - Accounts for vertical separation: safely jumping over or walking below elevated patrols does not cause damage.
   - Prevents a single encounter from removing multiple lives.
   - Grants approximately 2 seconds of invulnerability after damage with clear visual feedback (blinking character + luminous energy shield aura + HUD indicator).
   - Configurable collision shapes, patrol speeds, and invulnerability duration via `COLLISION_CONFIG`.
   - **Developer Collision Overlay**: Press **O** or click the `Overlay: Off/ON` button in the HUD to display real-time 3D wireframe hitboxes (player cylinder, footprint support ring, UFO saucer shapes, island perimeters, and bridge deck boundaries) along with a live debug stats panel.

2. **Continuous Bridge & Island Collisions**:
   - Fixed ground detection mismatch where players could fall through bridge edges while still standing on the deck.
   - Bridge collision covers the entire visible deck (2.0 unit width) and connects continuously with island collisions (radius 6.0) with zero gaps.
   - Multi-point footprint support calculation ($R = 0.28$) keeps the player supported when standing or walking near edges.
   - Genuine falls remain possible when moving beyond the supported footprint without artificial invisible walls.
   - Platform rendering and collision surfaces are generated from shared level definitions (`dist/levels.js`).

3. **Level Map & Progression System**:
   - Complete gameplay loop: Level map → Select unlocked level → Collect all crystals → Awaken portal → Enter portal → Complete level → Unlock next level.
   - Interactive Celestial Archipelago map with floating garden islands and progression pathways.
   - Distinct states for each level: **Locked** 🔒 (with explanation of unlock requirement), **Unlocked** ✦ (playable), and **Completed** ✓ (with best completion time displayed).
   - Level Detail Card displaying name, subtitle, description, crystal count, and Play / Replay button.
   - Level Completion screen displaying recovered crystals, completion time, best time, and announcing newly unlocked levels.
   - Grand Adventure-Complete screen celebrating the restoration of all three gardens upon completing Level 3.
   - Map accessible from start screen, pause menu, victory screens, and HUD / keyboard shortcut (**M**).

4. **Three Playable Levels**:
   - **Level 1 — Crystal Garden**: The classic 4-island square layout with 6 crystals, corrected collisions, and balanced bridge patrols.
   - **Level 2 — Skyway Crossing**: A 5-island zigzag archipelago with deliberate, readable UFO patrol rhythms and 6 crystals.
   - **Level 3 — The Far Garden**: A grand 6-island celestial garden with branching routes, 7 crystals, and the apex summit portal.

5. **Versioned Storage & Persistence**:
   - Stores unlocked levels, completed levels, and best completion times in browser `localStorage` (`crystal_garden_save_v2`).
   - Resilient error handling for restricted, disabled, or corrupted storage.
   - Restarting a level attempt resets only the current run without wiping unlocked levels.
   - Includes "Reset Progress" with confirmation modal.

## Controls

- **WASD / Arrows**: Move explorer
- **Space**: Jump
- **Shift**: Run (speed boost)
- **Mouse / Pointer Drag**: Orbit third-person camera
- **Escape / P**: Pause game
- **M**: Open / close Level Map
- **O**: Toggle Developer Collision Overlay
- **R**: Restart level (when won or lost)
- **Touch**: On-screen directional d-pad and jump button on touch devices

## Validation & Testing

- Automated tests: `node verify.mjs` validates core physics, bridge edges, footprint support, fair UFO collisions, vertical clearance, invulnerability, multi-level progression, and storage resilience.
- Browser test: `node browser_gameplay_test.mjs` executes full automated browser gameplay flows via Playwright.

## Vercel Deployment

Import the repository root into Vercel. `vercel.json` serves the `dist` directory with zero build requirements.
