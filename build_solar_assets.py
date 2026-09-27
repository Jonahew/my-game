"""
Build Solar System 3D Models for Crystal Garden using Blender 5.1
Creates optimized GLB models for all 7 new enemies, planetary relic, and cosmetic attachments.
Run with: /Applications/Blender.app/Contents/MacOS/Blender -b --python build_solar_assets.py
"""
import bpy, math, pathlib
from mathutils import Vector

ROOT = pathlib.Path(__file__).resolve().parent
OUT = ROOT / 'dist/models'
OUT.mkdir(parents=True, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)

colors = {
    'Ivory': (0.88, 0.79, 0.61, 1),
    'Teal': (0.07, 0.64, 0.60, 1),
    'Dark': (0.035, 0.065, 0.10, 1),
    'Coral': (0.95, 0.23, 0.22, 1),
    'Grass': (0.40, 0.53, 0.28, 1),
    'Stone': (0.27, 0.22, 0.34, 1),
    'Path': (0.75, 0.64, 0.47, 1),
    'Wood': (0.29, 0.14, 0.08, 1),
    'Leaf': (0.20, 0.39, 0.25, 1),
    'Glow': (0.14, 0.95, 0.85, 1),
    'Gold': (1.0, 0.65, 0.22, 1),
    # Planetary palette additions
    'MoonGray': (0.72, 0.74, 0.77, 1),
    'MarsRust': (0.85, 0.32, 0.15, 1),
    'JupiterAmber': (0.92, 0.58, 0.20, 1),
    'SaturnCream': (0.92, 0.85, 0.60, 1),
    'UranusCyan': (0.35, 0.82, 0.86, 1),
    'NeptuneBlue': (0.12, 0.32, 0.85, 1),
    'PlutoIce': (0.82, 0.90, 0.98, 1),
    'FrostGlow': (0.45, 0.92, 1.0, 1),
    'PulseViolet': (0.78, 0.28, 0.95, 1),
    'WarningYellow': (1.0, 0.88, 0.15, 1)
}

mats = {}
for name, color in colors.items():
    m = bpy.data.materials.new(name)
    m.diffuse_color = color
    m.use_nodes = True
    p = m.node_tree.nodes.get('Principled BSDF')
    if p:
        p.inputs['Base Color'].default_value = color
        p.inputs['Roughness'].default_value = 0.55
        if name in ('Glow', 'Gold', 'FrostGlow', 'PulseViolet', 'WarningYellow'):
            if 'Emission Color' in p.inputs:
                p.inputs['Emission Color'].default_value = color
                p.inputs['Emission Strength'].default_value = 2.0
            elif 'Emission' in p.inputs:
                p.inputs['Emission'].default_value = color
    mats[name] = m

def part(kind, loc, scale, mat_name, rot=(0,0,0), name=''):
    if kind == 'sphere':
        bpy.ops.mesh.primitive_uv_sphere_add(segments=14, ring_count=8, location=loc)
    elif kind == 'ico':
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=1, location=loc)
    elif kind == 'cylinder':
        bpy.ops.mesh.primitive_cylinder_add(vertices=14, radius=1, depth=2, location=loc)
    elif kind == 'cone':
        bpy.ops.mesh.primitive_cone_add(vertices=10, radius1=0.2, radius2=1, depth=2, location=loc)
    else:
        bpy.ops.mesh.primitive_cube_add(size=2, location=loc)
    o = bpy.context.object
    o.name = name or mat_name
    o.scale = scale
    o.rotation_euler = rot
    if mat_name in mats:
        o.data.materials.append(mats[mat_name])
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    return o

def finish_model(filename, objs):
    bpy.ops.object.select_all(action='DESELECT')
    for o in objs:
        o.hide_set(False)
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    out_path = str(OUT / f"{filename}.glb")
    bpy.ops.export_scene.gltf(filepath=out_path, export_format='GLB', use_selection=True)
    print(f"Successfully exported {out_path}")
    for o in objs:
        o.hide_set(True)
        o.hide_render = True

# 1. Lunar Hopper (Level 2 - Moon)
# Mechanical jumping robot: dome sensor head, spring pylon, wide landing foot, solar fins
def build_hopper():
    objs = []
    # Main body pod
    objs.append(part('sphere', (0, 0, 0.95), (0.42, 0.42, 0.35), 'MoonGray'))
    # Visor dome
    objs.append(part('sphere', (0, -0.28, 0.95), (0.28, 0.16, 0.20), 'Dark'))
    objs.append(part('sphere', (0, -0.38, 0.95), (0.12, 0.04, 0.12), 'WarningYellow'))
    # Side solar ear fins
    objs.append(part('cube', (-0.48, 0, 1.05), (0.12, 0.22, 0.04), 'Dark', rot=(0, 0.3, 0)))
    objs.append(part('cube', (0.48, 0, 1.05), (0.12, 0.22, 0.04), 'Dark', rot=(0, -0.3, 0)))
    # Spring suspension piston
    objs.append(part('cylinder', (0, 0, 0.55), (0.12, 0.12, 0.25), 'Dark'))
    # Piston coil rings
    objs.append(part('cylinder', (0, 0, 0.62), (0.18, 0.18, 0.04), 'Gold'))
    objs.append(part('cylinder', (0, 0, 0.48), (0.18, 0.18, 0.04), 'Gold'))
    # Lower landing leg
    objs.append(part('cylinder', (0, 0, 0.25), (0.08, 0.08, 0.18), 'MoonGray'))
    # Broad circular landing pad foot
    objs.append(part('cylinder', (0, 0, 0.06), (0.45, 0.45, 0.05), 'Dark'))
    objs.append(part('cylinder', (0, 0, 0.08), (0.35, 0.35, 0.03), 'MoonGray'))
    # Antenna
    objs.append(part('cylinder', (0.2, 0.15, 1.35), (0.02, 0.02, 0.18), 'Dark'))
    objs.append(part('ico', (0.2, 0.15, 1.55), (0.06, 0.06, 0.06), 'WarningYellow'))
    finish_model('Hopper', objs)

# 2. Survey Rover (Level 3 - Mars)
# 6-wheeled robotic chassis, mast camera, sensor cone projector
def build_rover():
    objs = []
    # Main body chassis
    objs.append(part('cube', (0, 0, 0.45), (0.48, 0.65, 0.18), 'MarsRust'))
    objs.append(part('cube', (0, 0, 0.62), (0.36, 0.45, 0.06), 'Dark'))
    # Solar panel top deck
    objs.append(part('cube', (0, -0.1, 0.70), (0.32, 0.30, 0.02), 'Teal'))
    # 6 Wheels (3 per side)
    for x in (-0.56, 0.56):
        for y in (-0.45, 0.0, 0.45):
            objs.append(part('cylinder', (x, y, 0.26), (0.16, 0.16, 0.08), 'Dark', rot=(0, math.pi/2, 0)))
            objs.append(part('cylinder', (x * 1.05, y, 0.26), (0.08, 0.08, 0.02), 'MarsRust', rot=(0, math.pi/2, 0)))
    # Rocker-bogie suspension bars
    for x in (-0.48, 0.48):
        objs.append(part('cube', (x, 0, 0.28), (0.04, 0.42, 0.04), 'Dark'))
    # Camera Mast & Pan-Tilt Turret
    objs.append(part('cylinder', (0.22, -0.38, 0.85), (0.03, 0.03, 0.25), 'Dark'))
    objs.append(part('cube', (0.22, -0.38, 1.12), (0.12, 0.14, 0.09), 'MarsRust'))
    # High-tech glowing camera eye / sensor lens
    objs.append(part('cylinder', (0.22, -0.52, 1.12), (0.06, 0.06, 0.05), 'Dark', rot=(math.pi/2, 0, 0)))
    objs.append(part('cylinder', (0.22, -0.56, 1.12), (0.04, 0.04, 0.02), 'Coral', rot=(math.pi/2, 0, 0)))
    # Rear communication high-gain dish
    objs.append(part('cone', (-0.2, 0.4, 0.85), (0.14, 0.14, 0.06), 'Ivory', rot=(-0.4, 0, 0)))
    finish_model('Rover', objs)

# 3. Storm Drone (Level 4 - Jupiter)
# Floating drone with 4 electrical emitter ring nacelles, central pulsing energy coil
def build_storm_drone():
    objs = []
    # Central spherical chassis
    objs.append(part('sphere', (0, 0, 0.65), (0.38, 0.38, 0.32), 'JupiterAmber'))
    objs.append(part('sphere', (0, -0.28, 0.65), (0.22, 0.12, 0.18), 'Dark'))
    # Central pulsing reactor eye
    objs.append(part('sphere', (0, -0.36, 0.65), (0.10, 0.04, 0.10), 'PulseViolet'))
    # 4 Outrigger arms and electrical arc discharge rings
    for angle in (math.pi/4, 3*math.pi/4, 5*math.pi/4, 7*math.pi/4):
        dx = 0.58 * math.cos(angle)
        dy = 0.58 * math.sin(angle)
        # Strut
        objs.append(part('cube', (dx*0.5, dy*0.5, 0.65), (0.04, 0.04, 0.04), 'Dark'))
        # Ring emitter pod
        objs.append(part('cylinder', (dx, dy, 0.65), (0.16, 0.16, 0.06), 'Gold'))
        objs.append(part('cylinder', (dx, dy, 0.65), (0.12, 0.12, 0.08), 'PulseViolet'))
    # Top and bottom coil plates
    objs.append(part('cylinder', (0, 0, 0.98), (0.20, 0.20, 0.04), 'Gold'))
    objs.append(part('cylinder', (0, 0, 0.32), (0.20, 0.20, 0.04), 'Gold'))
    finish_model('StormDrone', objs)

# 4. Ring Skimmer (Level 5 - Saturn)
# Aerodynamic orbital glider with swept solar wings and dual ion engines
def build_ring_skimmer():
    objs = []
    # Sleek needle fuselage
    objs.append(part('cone', (0, -0.4, 0.5), (0.25, 0.8, 0.16), 'SaturnCream', rot=(math.pi/2, 0, 0)))
    objs.append(part('sphere', (0, -0.2, 0.54), (0.16, 0.28, 0.10), 'Dark'))
    # Golden swept glider wings
    objs.append(part('cube', (0, 0.1, 0.5), (0.95, 0.25, 0.03), 'SaturnCream'))
    objs.append(part('cube', (0, 0.2, 0.5), (0.75, 0.15, 0.04), 'Gold'))
    # Winglet stabilizers
    for x in (-0.95, 0.95):
        objs.append(part('cube', (x, 0.1, 0.62), (0.03, 0.18, 0.12), 'Dark', rot=(0, 0.2 if x > 0 else -0.2, 0)))
    # Twin rear ion thrusters
    for x in (-0.22, 0.22):
        objs.append(part('cylinder', (x, 0.65, 0.5), (0.08, 0.08, 0.18), 'Dark', rot=(math.pi/2, 0, 0)))
        objs.append(part('cylinder', (x, 0.82, 0.5), (0.06, 0.06, 0.04), 'Glow', rot=(math.pi/2, 0, 0)))
    finish_model('RingSkimmer', objs)

# 5. Wind Sentinel (Level 6 - Uranus)
# Gyroscopic sphere with ducted turbine cowling and directional pressure nozzle
def build_wind_sentinel():
    objs = []
    # Central sphere
    objs.append(part('sphere', (0, 0, 0.7), (0.35, 0.35, 0.35), 'UranusCyan'))
    # Large outer turbine cowling ring
    objs.append(part('cylinder', (0, 0, 0.7), (0.65, 0.65, 0.12), 'Dark'))
    objs.append(part('cylinder', (0, 0, 0.7), (0.58, 0.58, 0.14), 'UranusCyan'))
    objs.append(part('cylinder', (0, 0, 0.7), (0.50, 0.50, 0.16), 'Dark'))
    # Cyan glowing airflow ring
    objs.append(part('cylinder', (0, 0, 0.7), (0.46, 0.46, 0.03), 'Glow'))
    # Directional intake nozzle & sensor visor
    objs.append(part('cone', (0, -0.38, 0.7), (0.24, 0.24, 0.18), 'Dark', rot=(-math.pi/2, 0, 0)))
    objs.append(part('sphere', (0, -0.45, 0.7), (0.10, 0.05, 0.10), 'Glow'))
    # Stabilizing side aerofoils
    for x in (-0.72, 0.72):
        objs.append(part('cube', (x, 0, 0.7), (0.12, 0.18, 0.02), 'Teal'))
    finish_model('WindSentinel', objs)

# 6. Tempest Hunter (Level 7 - Neptune)
# Predatory deep-atmosphere drone, delta frame, targeting eye, rocket booster
def build_tempest_hunter():
    objs = []
    # Delta body
    objs.append(part('cone', (0, -0.45, 0.6), (0.28, 0.9, 0.18), 'NeptuneBlue', rot=(math.pi/2, 0, 0)))
    objs.append(part('cube', (0, 0.15, 0.6), (0.75, 0.40, 0.05), 'NeptuneBlue'))
    # Dark armored canopy
    objs.append(part('cube', (0, -0.15, 0.72), (0.18, 0.35, 0.08), 'Dark'))
    # Predatory glowing hunter visor
    objs.append(part('sphere', (0, -0.65, 0.6), (0.12, 0.04, 0.08), 'Coral'))
    # Dual swept angled tail fins
    for x in (-0.35, 0.35):
        objs.append(part('cube', (x, 0.45, 0.82), (0.04, 0.18, 0.20), 'NeptuneBlue', rot=(0, 0.35 if x > 0 else -0.35, 0)))
    # Massive central propulsion thruster
    objs.append(part('cylinder', (0, 0.75, 0.6), (0.14, 0.14, 0.22), 'Dark', rot=(math.pi/2, 0, 0)))
    objs.append(part('cylinder', (0, 0.96, 0.6), (0.10, 0.10, 0.04), 'Glow', rot=(math.pi/2, 0, 0)))
    finish_model('TempestHunter', objs)

# 7. Frost Crawler (Level 8 - Pluto)
# Hexagonal crawler body with 6 articulated legs and cryogenic frost canisters
def build_frost_crawler():
    objs = []
    # Main armored carapace
    objs.append(part('cylinder', (0, 0, 0.42), (0.48, 0.48, 0.16), 'PlutoIce'))
    objs.append(part('cylinder', (0, 0, 0.52), (0.36, 0.36, 0.08), 'Dark'))
    # Glowing frost eye cluster
    objs.append(part('sphere', (0, -0.45, 0.44), (0.18, 0.06, 0.08), 'FrostGlow'))
    # Cryo frost canisters on rear
    for x in (-0.26, 0.26):
        objs.append(part('cylinder', (x, 0.28, 0.58), (0.10, 0.10, 0.22), 'Dark'))
        objs.append(part('cylinder', (x, 0.28, 0.72), (0.08, 0.08, 0.04), 'FrostGlow'))
    # 6 Articulated spider/crawler legs
    for i, angle in enumerate((-2.4, -1.57, -0.74, 0.74, 1.57, 2.4)):
        lx = 0.58 * math.cos(angle)
        ly = 0.58 * math.sin(angle)
        fx = 0.85 * math.cos(angle)
        fy = 0.85 * math.sin(angle)
        # Upper hip segment
        objs.append(part('cube', (lx*0.8, ly*0.8, 0.38), (0.06, 0.06, 0.06), 'Dark'))
        # Lower leg strut pointing to ground
        objs.append(part('cylinder', (fx, fy, 0.18), (0.04, 0.04, 0.22), 'PlutoIce', rot=(0.3 if fx>0 else -0.3, 0, 0)))
    finish_model('FrostCrawler', objs)

# 8. Planetary Relic (Exploration collectible)
# Ancient celestial artifact with floating orbital gimbal rings and glowing core
def build_relic():
    objs = []
    # Central crystal core
    objs.append(part('ico', (0, 0, 0.65), (0.24, 0.24, 0.35), 'Glow'))
    # Nested golden astrolabe gimbal rings
    objs.append(part('cylinder', (0, 0, 0.65), (0.42, 0.42, 0.03), 'Gold'))
    objs.append(part('cylinder', (0, 0, 0.65), (0.36, 0.36, 0.04), 'Dark'))
    objs.append(part('cylinder', (0, 0, 0.65), (0.52, 0.52, 0.025), 'Gold', rot=(math.pi/4, 0, 0)))
    # Floating satellite beads
    for angle in (0, 2*math.pi/3, 4*math.pi/3):
        bx = 0.62 * math.cos(angle)
        by = 0.62 * math.sin(angle)
        objs.append(part('ico', (bx, by, 0.65), (0.08, 0.08, 0.08), 'Gold'))
    finish_model('Relic', objs)

# 9. Cosmetic Attachments for Player Explorer
# A. Satellite Dish Antenna (Head)
def build_satellite_dish():
    objs = []
    objs.append(part('cylinder', (0, 0, 0.08), (0.02, 0.02, 0.08), 'Dark'))
    objs.append(part('cone', (0, 0, 0.22), (0.16, 0.16, 0.08), 'Ivory', rot=(-0.4, 0, 0)))
    objs.append(part('ico', (0, -0.06, 0.26), (0.03, 0.03, 0.03), 'Glow'))
    finish_model('AntennaDish', objs)

# B. Ring Crown (Head)
def build_ring_crown():
    objs = []
    objs.append(part('cylinder', (0, 0, 0.10), (0.28, 0.28, 0.025), 'Gold', rot=(0.2, 0.1, 0)))
    objs.append(part('cylinder', (0, 0, 0.10), (0.24, 0.24, 0.03), 'Glow', rot=(0.2, 0.1, 0)))
    for angle in (0, math.pi/2, math.pi, 3*math.pi/2):
        cx = 0.26 * math.cos(angle)
        cy = 0.26 * math.sin(angle)
        objs.append(part('ico', (cx, cy, 0.13), (0.04, 0.04, 0.06), 'Glow'))
    finish_model('RingCrown', objs)

# C. Rover Survey Backpack (Backpack)
def build_rover_pack():
    objs = []
    # Main pack chassis
    objs.append(part('cube', (0, 0.20, 0.45), (0.22, 0.14, 0.24), 'MarsRust'))
    objs.append(part('cube', (0, 0.22, 0.58), (0.18, 0.08, 0.06), 'Dark'))
    # Articulated survey arm
    objs.append(part('cylinder', (0.15, 0.28, 0.68), (0.02, 0.02, 0.14), 'Dark', rot=(0.3, 0, 0)))
    objs.append(part('ico', (0.18, 0.34, 0.82), (0.05, 0.05, 0.05), 'Coral'))
    finish_model('RoverPack', objs)

# D. Atmospheric Cloud Pack (Backpack)
def build_cloud_pack():
    objs = []
    # Dual energy vapor canisters
    for x in (-0.12, 0.12):
        objs.append(part('cylinder', (x, 0.22, 0.45), (0.08, 0.08, 0.22), 'Teal'))
        objs.append(part('cylinder', (x, 0.22, 0.45), (0.06, 0.06, 0.24), 'Glow'))
        objs.append(part('cylinder', (x, 0.22, 0.68), (0.07, 0.07, 0.03), 'Gold'))
    objs.append(part('cube', (0, 0.18, 0.45), (0.14, 0.06, 0.16), 'Dark'))
    finish_model('CloudPack', objs)

# E. Frost Expedition Pack (Backpack)
def build_frost_pack():
    objs = []
    objs.append(part('cube', (0, 0.20, 0.45), (0.22, 0.14, 0.25), 'PlutoIce'))
    objs.append(part('cube', (0, 0.22, 0.45), (0.18, 0.06, 0.22), 'Dark'))
    for z in (0.35, 0.45, 0.55):
        objs.append(part('cube', (0, 0.28, z), (0.20, 0.02, 0.02), 'FrostGlow'))
    finish_model('FrostPack', objs)

print("Starting Solar System asset generation...")
build_hopper()
build_rover()
build_storm_drone()
build_ring_skimmer()
build_wind_sentinel()
build_tempest_hunter()
build_frost_crawler()
build_relic()
build_satellite_dish()
build_ring_crown()
build_rover_pack()
build_cloud_pack()
build_frost_pack()
print("All solar assets generated successfully!")
