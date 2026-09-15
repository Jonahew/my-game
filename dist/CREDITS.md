# Crystal Garden — Browser edition

This is a JavaScript/WebGL adaptation of the Crystal Garden Unity prototype, using the same Blender-created models. It is not a compiled Unity WebGL build.

Bracken, Bluebell and Bench originate from the official Blender.org Cube Diorama demo:
https://download.blender.org/demo/bundles/bundles-3.0/asset-demo-bundle-3.0-cube-diorama.zip

The source file's embedded README states License: CC-0. The original download is preserved in the separately delivered Unity/Blender project package. These three models were exported via Blender to FBX and then GLB for this browser edition.

Explorer, Drone, Crystal, Portal, Tree, Rock, Island, Path, Crate and Lamp were created in Blender for Crystal Garden, guided by ChatGPT-generated concept art. The web edition uses those same meshes.

Rendering uses Three.js 0.169.0, licensed under MIT. See vendor/LICENSE-three.txt. Its GLTFLoader import path was adjusted for local hosting. Assets and rendering libraries are hosted with this game; no external asset CDN is required at play time.
