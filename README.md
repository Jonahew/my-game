# Crystal Garden — Solar System Adventure

An expansive 3D browser adventure built on the original *Crystal Garden* project. The player pilots a customizable Explorer across an 8-destination sequential Solar System campaign, recovering energy crystals, evading location-specific robotic inhabitants, and activating ancient warp portals.

Powered by Three.js with zero build step, fully compatible with Vercel and standard static web hosts.

---

## 🚀 8-Destination Sequential Campaign

Following an authentic outward route from Earth's celestial sanctuary:

| Level | Destination | Environment & Celestial Landmarks | Gravity | Robotic Inhabitant & Behavior |
|:---:|:---|:---|:---:|:---|
| **1** | **Crystal Garden** | Floating garden sanctuaries, ancient stone bridges, and sky islands | $g=20\,\text{m/s}^2$ | **UFO Patrols**: Balanced elliptical flyovers with fair 3D saucer hitboxes and vertical clearance. |
| **2** | **Moon** | Desolate gray regolith, impact craters, boulders, and bright Earthrise in the black sky | $g=10\,\text{m/s}^2$ *(Low)* | **Lunar Hoppers**: Mechanical jumpers that project pulsating ground target decals before leaping and slamming down. |
| **3** | **Mars** | Rust-red oxidised dunes, canyons, rocks, and silhouettes of Olympus Mons | $g=16\,\text{m/s}^2$ | **Survey Rovers**: Autonomous rovers projecting sweeping yellow scanning cones, sounding alarms and initiating high-speed pursuit on detection. |
| **4** | **Jupiter** | High-altitude floating research platforms suspended above violent cloud bands and the Great Red Spot *(strictly orbital platforms; no solid planetary ground)* | $g=20\,\text{m/s}^2$ | **Storm Drones**: Electro-static drones that hover, charge energy with electric crackles, and discharge expanding shock rings. |
| **5** | **Saturn** | Sleek orbital gantries directly overlooking Saturn's expansive icy rings and shadow gradients | $g=20\,\text{m/s}^2$ | **Ring Skimmers**: Aerodynamic orbital crafts swooping along illuminated curved arcs with visible flight path ribbons. |
| **6** | **Uranus** | Aerostat scientific outposts suspended over pale cyan hydrogen-methane cloud decks with vertical ring planes | $g=18\,\text{m/s}^2$ | **Wind Sentinels**: Rotorcrafts that telegraph directional air vortices before firing pushing wind gusts. |
| **7** | **Neptune** | Deep azure stations floating over supersonic atmospheric storms and dark storm vortices | $g=20\,\text{m/s}^2$ | **Tempest Hunters**: Sleek interceptors that lock on, flash danger beams, and perform high-speed directional dashes with long recovery cool-downs. |
| **8** | **Pluto** | Ancient nitrogen ice plains, towering jagged water-ice peaks, distant pinprick Sun, and deep Kuiper Belt space *(accurately designated as a dwarf planet)* | $g=8\,\text{m/s}^2$ *(Ultra-Low)* | **Frost Crawlers**: Cryogenic quadrupeds that lay glowing, temporary slippery ice patches that alter traction. |

---

## 🎨 Modular Explorer Customization

Accessible from the main menu, pause menu, and solar system map (**Key G** or **Customize** button):

- **6 Cosmetic Categories**:
  - **Body Finishes**: Standard Garden, Lunar Regolith, Martian Ochre, Jovian Amber, Cassini Gold, Aquamarine Glaze, Abyssal Azure, Cryo Frost.
  - **Visor Glows**: Amber Glow, Lunar Blue, Scanner Crimson, Storm Electric, Solar Aurora, Deep Void.
  - **Headgear**: Beacon Antenna, Satellite Dish, Ring Crown.
  - **Backpacks**: Explorer Pack, Rover Unit, Cloud Collector, Insulated Pack.
  - **Suit Badges**: Standard Insignia, Earthrise Badge, Olympus Badge, Great Spot Insignia, Ring Badge, Voyager Badge, Dwarf Planet Crest, Flawless Crown.
  - **Particle Trails**: None, Lunar Dust, Martian Sands, Lightning Sparks, Saturnian Stardust, Ice Crystals.
- **Interactive 3D Turntable**:
  - Live 3D character viewport rendered with Three.js.
  - Drag-to-rotate preview with smooth dampening.
  - Live equipment readout and equipped badge indicators.
- **Fair Gameplay Unlocks (No Paywalls or RNG)**:
  - 100% deterministic progression unlocks:
    - **World Completion**: Beat a destination to unlock its native planetary finish and basic gear.
    - **Hidden Relics**: Uncover hidden navigation beacons located in optional off-path exploration routes.
    - **Speedrun Challenges**: Beat target par completion times.
    - **Flawless Victory**: Complete levels without losing a single heart.
  - Restore Default option to quickly revert to original attire.

---

## 🗺️ Solar System Navigation Map

- **Full Campaign Route Map**: Responsive interactive SVG orbital map displaying all 8 worlds.
- **Mission Briefing Dossiers**: Selecting any world opens its full operational briefing:
  - Atmospheric & gravitational data.
  - Crystal quota and mission overview.
  - Robotic inhabitant profile with tactical evasion advice.
  - Challenge progress medals (Completed, Flawless, Speedrun, Relic).
  - Cosmetic rewards unlocked and remaining.
  - Direct Play / Replay deployment.

---

## 🛡️ Fair Physics & Collision Mechanics

- **Fair Robotic Hitboxes**:
  - 3D bounding geometry closely tailored to visual meshes.
  - Borderline contact favors the player.
  - Vertical clearance allows jumping over ground attacks or running beneath elevated drones.
  - Every attack features: **Visible Warning (Telegraph)** $\rightarrow$ **Evasion Window** $\rightarrow$ **Active Hazard** $\rightarrow$ **Recovery / Cooldown Period**.
  - 2-second invulnerability on damage with shield aura and character flash to prevent multi-hit deaths.
- **Continuous Surface Navigation**:
  - Gapless bridge-to-island collision meshes.
  - Multi-point footprint support ($R = 0.28$) keeps the player grounded when near borders.
  - Deliberate fall detection when stepping off edges without invisible walls.
- **Low-Gravity Physics**:
  - Moon ($g=10$) and Pluto ($g=8$) offer floaty, responsive leaping while keeping horizontal momentum tightly controllable.
  - Dynamic camera scaling smoothly pulls back on low-gravity worlds to maintain sightlines.
- **Developer Collision Overlay**:
  - Press **O** or click `Overlay: Off/ON` in the HUD to reveal real-time wireframe volumes for the Explorer cylinder, robot hitboxes, telegraph circles, ice patches, and platform bounds.

---

## 💾 Versioned Storage & Data Portability

- Stored in browser `localStorage` under `crystal_garden_save_v3`.
- Seamless automatic migration from `crystal_garden_save_v2` and `v1` preserving all completed stages.
- Graceful degradation if `localStorage` is disabled or blocked.
- Independent **Reset Equipped Appearance** and **Reset All Progression** (with confirmation dialog).

---

## 🎮 Controls

| Action | Keyboard / Mouse | Touch Controls |
|:---|:---|:---|
| **Move** | `W`, `A`, `S`, `D` or Arrow Keys | On-screen virtual D-Pad |
| **Jump** | `Spacebar` | On-screen Jump button |
| **Sprint** | `Shift` (hold) | Automatic with full D-Pad deflection |
| **Camera Orbit** | Click & Drag Mouse / Trackpad | Touch Drag on screen background |
| **Customize Gear** | `G` or Gear button | Tap Gear button in HUD / Pause Menu |
| **Solar Map** | `M` or Map button | Tap Map button in HUD |
| **Pause / Resume** | `Escape` or `P` | Tap Pause button in HUD |
| **Collision Overlay** | `O` | Tap Overlay button in HUD |
| **Restart Level** | `R` (when completed or fallen) | Tap Restart button on modal |

---

## 📦 Asset Credits & Provenance

1. **Original Unity/Blender Models (Blender 4.2 GLTF/GLB)**:
   - `Island1.glb`, `Island2.glb`, `Island3.glb`, `Island4.glb`
   - `Bridge.glb`, `Arch.glb`, `Bench.glb`, `Fence.glb`, `Shrub.glb`
   - `Crystal.glb`, `Portal.glb`, `UFO.glb`
   - Original Character: `Character.glb`
2. **Solar Campaign Models (Blender 5.1 Procedural GLB Assets)**:
   - Enemies: `Hopper.glb`, `Rover.glb`, `StormDrone.glb`, `RingSkimmer.glb`, `WindSentinel.glb`, `TempestHunter.glb`, `FrostCrawler.glb`
   - Exploration: `Relic.glb` (Hidden Solar Artifact)
   - Cosmetics: `AntennaDish.glb`, `RingCrown.glb`, `RoverPack.glb`, `CloudPack.glb`, `FrostPack.glb`
3. **Libraries**:
   - Three.js r128 (MIT License, vendored in `dist/three.min.js`)
   - GLTFLoader (MIT License, vendored in `dist/GLTFLoader.js`)

---

## 🧪 Testing & Verification

- **Unit & Logic Suite**:
  ```bash
  node verify.mjs
  ```
  Validates all 8 destinations, dynamic gravity formulas, robotic enemy telegraph timing, cosmetic unlock evaluation, and storage migrations.
- **End-to-End Headless Browser Test**:
  ```bash
  node browser_gameplay_test.mjs
  ```
  Launches Playwright Firefox against a local server, verifying canvas rendering, character movement, low-gravity jumping, hazard collisions, damage invulnerability, solar map navigation, and cosmetics modal interactions.
