# Crystal Garden browser edition

Static browser adaptation using all 13 models from the original Unity/Blender project, converted to GLB with Blender 4.2. This is not a Unity WebGL executable.

Serve `dist` over HTTP. No installation or build is required. The Three.js renderer and GLTF loader are vendored locally with their license. Desktop controls: WASD/arrows to move, Space to jump, Shift to run, drag the scene to orbit, Escape to pause. Touch directional and jump buttons appear on touch devices. Sound is opt-in.

Collect six crystals, avoid three drones, and reach the far island's portal. Falling or being hit consumes one life and returns you to the start. Crystals remain collected. Three hits end the run. Restart resets all progress.

Validation: `node verify.mjs` tests the shared gameplay state machine (movement, jump, pause, pickups, damage, win/loss, reset, connected paths). All 13 GLB files checked for valid headers, meshes, embedded buffers and local module imports. Browser rendering and WebMCP execution were not run in this environment. WebMCP's optional read-only state tool is feature-detected and uses the same game state.

## Vercel deployment

Import the GitHub repository into Vercel with the repository root as Root Directory. `vercel.json` selects the Other framework preset, skips install/build commands, and serves the included `dist` directory. No environment variables or API keys are required by the game.

Configuration reference: https://vercel.com/docs/project-configuration/vercel-json
