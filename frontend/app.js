/**
 * app.js - Advanced Three.js Voxel City Simulation
 */

const API = "http://localhost:8000";

// Global object references for animation
let windmillRotor = null;

// ── 3D Scene Setup ──────────────────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87CEEB);
scene.fog = new THREE.Fog(0x87CEEB, 300, 2000); // Minimal fog - pushed far out for clear view

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 1000);
// Positioned to look over the city like an isometric god game
camera.position.set(-60, 50, 60);
camera.lookAt(10, 0, -10);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.8; // Reduced exposure for more realistic brightness
document.getElementById('canvas-container').appendChild(renderer.domElement);

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// ── Lighting (Sun cycle) ────────────────────────────────────────────────────
const ambientLight = new THREE.AmbientLight(0x606070, 0.4); // Balanced ambient light
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xffeedd, 1.0); // Realistic sun intensity
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 2048;
sunLight.shadow.mapSize.height = 2048;
sunLight.shadow.camera.left = -60;
sunLight.shadow.camera.right = 60;
sunLight.shadow.camera.top = 60;
sunLight.shadow.camera.bottom = -60;
sunLight.shadow.camera.far = 200;
scene.add(sunLight);

// ── Enhanced Lighting for Reflections ──────────────────────────────────────
// Add additional lights to enhance reflections and realism
const topLight = new THREE.DirectionalLight(0xffffff, 0.4); // Subtle top light
topLight.position.set(50, 100, 30);
topLight.castShadow = true;
scene.add(topLight);

const rimLight = new THREE.DirectionalLight(0x3b82f6, 0.25); // Subtle rim light
rimLight.position.set(-50, 30, -50);
scene.add(rimLight);

const fillLight = new THREE.DirectionalLight(0xffffff, 0.15); // Subtle fill light
fillLight.position.set(50, 30, -50);
scene.add(fillLight);

// ── Materials ───────────────────────────────────────────────────────────────
const matGround = new THREE.MeshStandardMaterial({ 
    color: 0x111827,
    metalness: 0.1,
    roughness: 0.8
});

const matRoad = new THREE.MeshStandardMaterial({ 
    color: 0x1f2937,
    metalness: 0.0,
    roughness: 0.9
});

const matLine = new THREE.MeshBasicMaterial({ color: 0xffffee });

// Building Shells with enhanced refection
const matRes = new THREE.MeshStandardMaterial({ 
    color: 0x475569,
    metalness: 0.1,
    roughness: 0.7
});

const matHosp = new THREE.MeshStandardMaterial({ 
    color: 0xf8fafc,
    metalness: 0.2,
    roughness: 0.6
});

const matInd = new THREE.MeshStandardMaterial({ 
    color: 0x334155,
    metalness: 0.15,
    roughness: 0.75
});

const matFactoryRoof = new THREE.MeshStandardMaterial({ 
    color: 0x1e293b,
    metalness: 0.4,
    roughness: 0.5
});

const matSchool = new THREE.MeshStandardMaterial({ 
    color: 0xb45309,
    metalness: 0.05,
    roughness: 0.8
});

const matBatt = new THREE.MeshStandardMaterial({ 
    color: 0x1e3a8a,
    metalness: 0.5,
    roughness: 0.3
});

// Window Materials with realistic reflections
const matWinHosp = new THREE.MeshStandardMaterial({ 
    color: 0xffe600, 
    emissive: 0xffe600, 
    emissiveIntensity: 0,
    metalness: 0.3,
    roughness: 0.1
});

const matWinSchool = new THREE.MeshStandardMaterial({ 
    color: 0xffe600, 
    emissive: 0xffe600, 
    emissiveIntensity: 0,
    metalness: 0.3,
    roughness: 0.1
});

const matWinInd = new THREE.MeshStandardMaterial({ 
    color: 0xffe600, 
    emissive: 0xffe600, 
    emissiveIntensity: 0,
    metalness: 0.3,
    roughness: 0.1
});

const matWinRes = new THREE.MeshStandardMaterial({ 
    color: 0xffea80, 
    emissive: 0xffea80, 
    emissiveIntensity: 0,
    metalness: 0.3,
    roughness: 0.1
});

const matWinBatt = new THREE.MeshStandardMaterial({ 
    color: 0x22c55e, 
    emissive: 0x22c55e, 
    emissiveIntensity: 0,
    metalness: 0.4,
    roughness: 0.05
});

const windowMats = {
    hospital: matWinHosp,
    school: matWinSchool,
    industry: matWinInd,
    residential: matWinRes,
    battery: matWinBatt
};

// ── Infrastructure (Ground & Roads) ─────────────────────────────────────────

// Massive ground
const ground = new THREE.Mesh(new THREE.BoxGeometry(200, 2, 200), matGround);
ground.position.y = -1;
ground.receiveShadow = true;
scene.add(ground);

function createRoad(x, z, w, d) {
    const road = new THREE.Mesh(new THREE.PlaneGeometry(w, d), matRoad);
    road.rotation.x = -Math.PI / 2;
    road.position.set(x, 0.05, z);
    road.receiveShadow = true;
    scene.add(road);
    
    // Center line
    const isHorizontal = w > d;
    const lineW = isHorizontal ? w * 0.9 : 0.5;
    const lineD = isHorizontal ? 0.5 : d * 0.9;
    const line = new THREE.Mesh(new THREE.PlaneGeometry(lineW, lineD), matLine);
    line.rotation.x = -Math.PI / 2;
    line.position.set(x, 0.08, z);
    scene.add(line);
    
    // Road boundary markers (white dashes on sides)
    const boundaryMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.0, roughness: 0.9 });
    const sideOffset = d / 2 - 0.3;
    if (isHorizontal) {
        // Top and bottom boundaries
        for (let i = -w/2; i <= w/2; i += 4) {
            const marker = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.05, 0.2), boundaryMat);
            marker.position.set(x + i, 0.09, z + sideOffset);
            scene.add(marker);
            const marker2 = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.05, 0.2), boundaryMat);
            marker2.position.set(x + i, 0.09, z - sideOffset);
            scene.add(marker2);
        }
    } else {
        // Left and right boundaries
        for (let i = -d/2; i <= d/2; i += 4) {
            const marker = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.05, 1.2), boundaryMat);
            marker.position.set(x + w/2 - 0.3, 0.09, z + i);
            scene.add(marker);
            const marker2 = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.05, 1.2), boundaryMat);
            marker2.position.set(x - w/2 + 0.3, 0.09, z + i);
            scene.add(marker2);
        }
    }
}

// Build Main Grid Roads
createRoad(15, 0, 100, 8); // Horizontal Main St
createRoad(0, 5, 8, 80);   // Vertical Ave

// ── City Builder ────────────────────────────────────────────────────────────

// We store the specific window materials for each zone so we can light them up
const zoneWindows = {
    hospital: [], school: [], industry: [], residential: [], battery: []
};
const floatingLabels = [];

function addLabel(elementId, x, y, z) {
    floatingLabels.push({
        el: document.getElementById(elementId),
        pos: new THREE.Vector3(x, y, z)
    });
}

function attachWindows(buildingMesh, w, h, d, windowMat, zoneId) {
    // We create tiny planes slightly outside the building bounds
    const winGeo = new THREE.PlaneGeometry(1, 1);
    const yOffsets = [];
    for(let i = 2; i < h; i+= 3) yOffsets.push(i - h/2);

    // Front/Back
    for(let px = -w/2 + 1.5; px <= w/2 - 1.5; px += 2) {
        yOffsets.forEach(py => {
            const wf = new THREE.Mesh(winGeo, windowMat);
            wf.position.set(px, py, d/2 + 0.01);
            buildingMesh.add(wf);
            zoneWindows[zoneId].push(wf);

            const wb = new THREE.Mesh(winGeo, windowMat);
            wb.rotation.y = Math.PI;
            wb.position.set(px, py, -d/2 - 0.01);
            buildingMesh.add(wb);
            zoneWindows[zoneId].push(wb);
        });
    }
    // Left/Right
    for(let pz = -d/2 + 1.5; pz <= d/2 - 1.5; pz += 2) {
        yOffsets.forEach(py => {
            const wl = new THREE.Mesh(winGeo, windowMat);
            wl.rotation.y = -Math.PI/2;
            wl.position.set(-w/2 - 0.01, py, pz);
            buildingMesh.add(wl);
            zoneWindows[zoneId].push(wl);

            const wr = new THREE.Mesh(winGeo, windowMat);
            wr.rotation.y = Math.PI/2;
            wr.position.set(w/2 + 0.01, py, pz);
            buildingMesh.add(wr);
            zoneWindows[zoneId].push(wr);
        });
    }
}

// 1. HOSPITAL ZONE (Top Left)
const hospGroup = new THREE.Group();
const hospMain = new THREE.Mesh(new THREE.BoxGeometry(16, 20, 12), matHosp);
hospMain.position.set(-20, 10, -20);
hospMain.castShadow = true; hospMain.receiveShadow = true;
attachWindows(hospMain, 16, 20, 12, matWinHosp, "hospital");
hospGroup.add(hospMain);

// Hospital roof (red cross on top)
const roofMat = new THREE.MeshStandardMaterial({ color: 0xe53e3e, roughness: 0.8 });
const hospRoof = new THREE.Mesh(new THREE.BoxGeometry(18, 1.5, 14), roofMat);
hospRoof.position.set(-20, 21, -20);
hospRoof.castShadow = true;
hospGroup.add(hospRoof);

const hospCross = new THREE.Mesh(new THREE.BoxGeometry(6, 1, 2), roofMat);
hospCross.position.set(-20, 22.5, -20);
hospGroup.add(hospCross);
const hospCross2 = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 6), roofMat);
hospCross2.position.set(-20, 22.5, -20);
hospGroup.add(hospCross2);

scene.add(hospGroup);
addLabel('label-hospital', -20, 28, -20);


// 2. RESIDENTIAL (Top Right Grid) - Enhanced with variety
const roofMatRes = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.85 });
const solarPanelMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2e, metalness: 0.6, roughness: 0.3 });

for(let rx = 15; rx <= 45; rx += 10) {
    for(let rz = -35; rz <= -10; rz += 10) {
        // Vary the house colors slightly
        const colorVariation = [0x475569, 0x5a6c7d, 0x334155][Math.floor(Math.random() * 3)];
        const matResVaried = new THREE.MeshStandardMaterial({ color: colorVariation, metalness: 0.1, roughness: 0.7 });
        
        // Little house
        const w = 6, h = 6, d = 6;
        const house = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), matResVaried);
        house.position.set(rx, h/2, rz);
        house.castShadow = true; house.receiveShadow = true;
        
        // Windows
        attachWindows(house, w, h, d, matWinRes, "residential");
        
        // Roof (angled)
        const roofGroup = new THREE.Group();
        const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 1, 0.8, d + 1), roofMatRes);
        roof.position.set(0, h/2 + 0.4, 0);
        roof.castShadow = true;
        roofGroup.add(roof);
        
        // Solar panels on roof (slightly smaller than roof)
        const solarW = w - 0.5, solarH = 0.15, solarD = d - 0.5;
        const solarPanel = new THREE.Mesh(new THREE.BoxGeometry(solarW, solarH, solarD), solarPanelMat);
        solarPanel.position.set(0, h/2 + 0.9, 0);
        solarPanel.castShadow = true;
        roofGroup.add(solarPanel);
        
        house.add(roofGroup);
        
        scene.add(house);
    }
}
addLabel('label-residential', 30, 10, -20);


// 3. INDUSTRIAL ZONE (Pulled back - Bottom zone) - Enhanced
const indW = 12, indH = 8, indD = 20;
const factory = new THREE.Mesh(new THREE.BoxGeometry(indW, indH, indD), matInd);
factory.position.set(-20, indH/2, 50);
factory.castShadow = true; factory.receiveShadow = true;
attachWindows(factory, indW, indH, indD, matWinInd, "industry");

// Factory roof
const factoryRoofGeo = new THREE.BoxGeometry(indW + 1, 1.2, indD + 1);
const factoryRoof = new THREE.Mesh(factoryRoofGeo, matFactoryRoof);
factoryRoof.position.set(0, indH/2 + 0.6, 0);
factoryRoof.castShadow = true;
factory.add(factoryRoof);

scene.add(factory);

// Smokestacks - enhanced with more detail
for (let i = 0; i < 3; i++) {
    const stack = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 2, 15, 16), matFactoryRoof);
    stack.position.set(-24 + i * 4, 12, 45);
    stack.castShadow = true;
    scene.add(stack);
}

addLabel('label-industry', -20, 18, 50);


// 4. SCHOOL / EDU (Bottom Right) - Enhanced
const schoolRoofMat = new THREE.MeshStandardMaterial({ color: 0x7c2d12, roughness: 0.8 });
const sW = 20, sH = 6, sD = 8;
const school = new THREE.Mesh(new THREE.BoxGeometry(sW, sH, sD), matSchool);
school.position.set(25, sH/2, 20);
school.castShadow = true; school.receiveShadow = true;
attachWindows(school, sW, sH, sD, matWinSchool, "school");

// School roof
const schoolRoof = new THREE.Mesh(new THREE.BoxGeometry(sW + 2, 1, sD + 2), schoolRoofMat);
schoolRoof.position.set(0, sH/2 + 0.5, 0);
schoolRoof.castShadow = true;
school.add(schoolRoof);

// Solar panels on school roof
const schoolSolarW = sW - 1, schoolSolarH = 0.2, schoolSolarD = sD - 1;
const schoolSolarPanel = new THREE.Mesh(new THREE.BoxGeometry(schoolSolarW, schoolSolarH, schoolSolarD), solarPanelMat);
schoolSolarPanel.position.set(0, sH/2 + 1.2, 0);
schoolSolarPanel.castShadow = true;
school.add(schoolSolarPanel);

// Flag pole on school
const flagPole = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 3, 8), new THREE.MeshStandardMaterial({ color: 0x1e3a8a }));
flagPole.position.set(sW/2 - 1, sH + 1.5, 0);
flagPole.castShadow = true;
school.add(flagPole);

scene.add(school);

// School wings with roofs
const wingGeo = new THREE.BoxGeometry(6, 6, 12);
const wing1 = new THREE.Mesh(wingGeo, matSchool);
wing1.position.set(18, 3, 26); wing1.castShadow = true;
attachWindows(wing1, 6, 6, 12, matWinSchool, "school");

const wing1Roof = new THREE.Mesh(new THREE.BoxGeometry(7, 1, 13), schoolRoofMat);
wing1Roof.position.set(0, 3.5, 0);
wing1Roof.castShadow = true;
wing1.add(wing1Roof);

// Solar panels on wing1 roof
const wingSolarPanel1 = new THREE.Mesh(new THREE.BoxGeometry(6, 0.15, 11.5), solarPanelMat);
wingSolarPanel1.position.set(0, 4.2, 0);
wingSolarPanel1.castShadow = true;
wing1.add(wingSolarPanel1);

scene.add(wing1);

const wing2 = new THREE.Mesh(wingGeo, matSchool);
wing2.position.set(32, 3, 26); wing2.castShadow = true;
attachWindows(wing2, 6, 6, 12, matWinSchool, "school");

const wing2Roof = new THREE.Mesh(new THREE.BoxGeometry(7, 1, 13), schoolRoofMat);
wing2Roof.position.set(0, 3.5, 0);
wing2Roof.castShadow = true;
wing2.add(wing2Roof);

// Solar panels on wing2 roof
const wingSolarPanel2 = new THREE.Mesh(new THREE.BoxGeometry(6, 0.15, 11.5), solarPanelMat);
wingSolarPanel2.position.set(0, 4.2, 0);
wingSolarPanel2.castShadow = true;
wing2.add(wingSolarPanel2);

scene.add(wing2);

addLabel('label-school', 25, 12, 20);

// MOUNTAIN with WINDMILL behind school
const mountainGeo = new THREE.ConeGeometry(20, 25, 32);
const mountainMat = new THREE.MeshStandardMaterial({ color: 0x4b5563, roughness: 0.9 });
const mountain = new THREE.Mesh(mountainGeo, mountainMat);
mountain.position.set(25, 12.5, 60);
mountain.castShadow = true;
mountain.receiveShadow = true;
scene.add(mountain);

// Windmill on top of mountain
const windmillBase = new THREE.Mesh(new THREE.CylinderGeometry(1, 1.5, 4, 8), new THREE.MeshStandardMaterial({ color: 0x8b7355 }));
windmillBase.position.set(25, 38, 60);
windmillBase.castShadow = true;
scene.add(windmillBase);

// Windmill rotor (spinning blades)
const rotorGroup = new THREE.Group();
rotorGroup.position.set(25, 40.5, 60);
scene.add(rotorGroup);

// Create 3 windmill blades
for (let i = 0; i < 3; i++) {
    const bladeGeo = new THREE.BoxGeometry(1.5, 0.15, 8);
    const bladeMat = new THREE.MeshStandardMaterial({ color: 0xf5f5f5, metalness: 0.3, roughness: 0.4 });
    const blade = new THREE.Mesh(bladeGeo, bladeMat);
    blade.castShadow = true;
    blade.rotation.z = (Math.PI * 2 / 3) * i;
    rotorGroup.add(blade);
}

// Store rotor for animation
windmillRotor = rotorGroup;

// 5. BATTERY SUBSTATION (Energy Reserve - Previously Industrial Zone)
const battMesh = new THREE.Mesh(new THREE.BoxGeometry(8, 8, 8), matBatt);
battMesh.position.set(-20, 4, 20);
battMesh.castShadow = true; battMesh.receiveShadow = true;
attachWindows(battMesh, 8, 8, 8, matWinBatt, "battery");
scene.add(battMesh);
addLabel('label-battery', -20, 14, 20);

// 6. POWER PLANTS (Generation) - Arranged neatly to avoid overlaps (closer together)
const plantMat = new THREE.MeshStandardMaterial({ color: 0x64748b });
const pp1 = new THREE.Mesh(new THREE.CylinderGeometry(3, 5, 12), plantMat);
pp1.position.set(-48, 6, 35);
pp1.castShadow = true; pp1.receiveShadow = true;
scene.add(pp1);
addLabel('label-plant1', -48, 15, 35);

const pp2 = new THREE.Mesh(new THREE.CylinderGeometry(3, 5, 12), plantMat);
pp2.position.set(-48, 6, 55);
pp2.castShadow = true; pp2.receiveShadow = true;
scene.add(pp2);
addLabel('label-plant2', -48, 15, 55);

// 7. ELECTRIC POLES (4 major distribution poles at zone corners - away from roads)
const matPole = new THREE.MeshStandardMaterial({ color: 0x8b7355, roughness: 0.9 });

function createPole(x, z) {
    const poleGroup = new THREE.Group();
    
    // Main pole (shorter - proportion to buildings)
    const poleGeom = new THREE.CylinderGeometry(0.35, 0.45, 9, 8);
    const pole = new THREE.Mesh(poleGeom, matPole);
    pole.position.y = 4.5;
    pole.castShadow = true;
    poleGroup.add(pole);
    
    // Crossarm
    const armGeom = new THREE.BoxGeometry(5, 0.25, 0.25);
    const arm = new THREE.Mesh(armGeom, matPole);
    arm.position.y = 8;
    arm.castShadow = true;
    poleGroup.add(arm);
    
    poleGroup.position.set(x, 0, z);
    scene.add(poleGroup);
    return poleGroup;
}

// Create 4 major poles near the road junction (at center coordinates but off the roads)
const poleNW = createPole(-7, -7);      // North-West of junction
const poleSW = createPole(-7, 7);       // South-West of junction
const poleNE = createPole(7, -7);       // North-East of junction
const poleSE = createPole(7, 7);        // South-East of junction

// 8. GRID LINES & TRANSMISSION NETWORK (Curved paths around buildings)
function drawCurvedTransmissionLine(startV, endV, colorHex, curveAmount = 0.3) {
    // Create curved path using quadratic bezier
    const points = [];
    const steps = 40;
    
    // Calculate control point for curve
    const midX = (startV.x + endV.x) / 2;
    const midZ = (startV.z + endV.z) / 2;
    
    // Offset the control point perpendicular to the line
    const dx = endV.x - startV.x;
    const dz = endV.z - startV.z;
    const len = Math.sqrt(dx*dx + dz*dz);
    const perpX = -dz / len * len * curveAmount;
    const perpZ = dx / len * len * curveAmount;
    
    const controlPoint = new THREE.Vector3(midX + perpX, 3, midZ + perpZ);
    
    // Generate curve points using quadratic bezier
    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const t1 = 1 - t;
        
        // Quadratic Bezier: B(t) = (1-t)²P0 + 2(1-t)tP1 + t²P2
        const x = t1*t1*startV.x + 2*t1*t*controlPoint.x + t*t*endV.x;
        const z = t1*t1*startV.z + 2*t1*t*controlPoint.z + t*t*endV.z;
        const y = 2.5 + Math.sin(t * Math.PI) * 1.5; // Add slight height variation for realism
        
        points.push(new THREE.Vector3(x, y, z));
    }
    
    const mat = new THREE.LineBasicMaterial({ color: colorHex, linewidth: 3, transparent: true, opacity: 0.85 });
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), mat);
    scene.add(line);
}

function drawTransmissionWithWaypoints(startV, waypoints, endV, colorHex) {
    // Draw transmission line through waypoints to route around buildings
    const allPoints = [startV, ...waypoints, endV];
    const points = [];
    const steps = 15; // Segments between each waypoint pair
    
    for (let i = 0; i < allPoints.length - 1; i++) {
        const p1 = allPoints[i];
        const p2 = allPoints[i + 1];
        
        for (let j = 0; j <= steps; j++) {
            const t = j / steps;
            const x = p1.x + (p2.x - p1.x) * t;
            const z = p1.z + (p2.z - p1.z) * t;
            const y = 2.5;
            
            points.push(new THREE.Vector3(x, y, z));
        }
    }
    
    const mat = new THREE.LineBasicMaterial({ color: colorHex, linewidth: 3, transparent: true, opacity: 0.85 });
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), mat);
    scene.add(line);
}

// HIGH-VOLTAGE TRANSMISSION: Power Plants -> Battery (Direct routes)
drawCurvedTransmissionLine(pp1.position, battMesh.position, 0x1e40af, 0.08);
drawCurvedTransmissionLine(pp2.position, battMesh.position, 0x1e40af, 0.08);

// DISTRIBUTION: Battery at (-20, 20) -> Central poles (Smart routing using roads)
// Battery now positioned where industrial was - clean radial distribution from center

// North-West pole (Hospital) - route: battery → north on vertical road → junction → to pole
drawTransmissionWithWaypoints(
    battMesh.position,
    [new THREE.Vector3(-20, 0.5, 0), new THREE.Vector3(-7, 0.5, 0)],
    poleNW.position,
    0x059669
);

// South-West pole (Industrial) - route: battery → south on vertical road → junction → to pole
drawTransmissionWithWaypoints(
    battMesh.position,
    [new THREE.Vector3(-20, 0.5, 0), new THREE.Vector3(-7, 0.5, 0)],
    poleSW.position,
    0x65a30d
);

// North-East pole (Residential) - route: battery → east on horizontal road → junction → to pole
drawTransmissionWithWaypoints(
    battMesh.position,
    [new THREE.Vector3(0, 0.5, 0), new THREE.Vector3(7, 0.5, 0)],
    poleNE.position,
    0x16a34a
);

// South-East pole (School) - route: battery → east on horizontal road → junction → to pole
drawTransmissionWithWaypoints(
    battMesh.position,
    [new THREE.Vector3(0, 0.5, 0), new THREE.Vector3(7, 0.5, 0)],
    poleSE.position,
    0x7fb81d
);

// DIRECT LINE: Battery -> Industrial Zone via SW Pole (High-priority industrial power)
drawTransmissionWithWaypoints(
    battMesh.position,
    [new THREE.Vector3(-7, 0.5, 7)],
    new THREE.Vector3(-20, 0.5, 50),
    0xff6b00
);

// ── ENVIRONMENT DETAILS (Trees, Footpaths, Vehicles) ──────────────────────

const matTreeTrunk = new THREE.MeshStandardMaterial({ color: 0x3d2f1f, roughness: 0.9 });
const matTreeLeaves = new THREE.MeshStandardMaterial({ color: 0x2d5016, roughness: 0.8 });
const matFootpath = new THREE.MeshStandardMaterial({ color: 0xb8a892, roughness: 0.9 });
const matCar = new THREE.MeshStandardMaterial({ color: 0xef4444, metalness: 0.6, roughness: 0.4 });

// Function to create a tree
function createTree(x, z) {
    const group = new THREE.Group();
    
    // Trunk
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 4, 8), matTreeTrunk);
    trunk.position.set(0, 2, 0);
    trunk.castShadow = true;
    group.add(trunk);
    
    // Foliage (cone shape)
    const foliage = new THREE.Mesh(new THREE.ConeGeometry(2.5, 5, 8), matTreeLeaves);
    foliage.position.set(0, 5, 0);
    foliage.castShadow = true;
    group.add(foliage);
    
    group.position.set(x, 0, z);
    scene.add(group);
    return group;
}

// Function to create vehicles
function createCar(x, z, rotY = 0) {
    const group = new THREE.Group();
    
    // Main body (positioned higher to sit on wheels)
    const body = new THREE.Mesh(new THREE.BoxGeometry(3, 1.5, 1.5), matCar);
    body.position.y = 1.2;
    body.castShadow = true;
    group.add(body);
    
    // Cabin
    const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1, 1.3), matCar);
    cabin.position.set(0.3, 2.2, 0);
    cabin.castShadow = true;
    group.add(cabin);
    
    // Wheels (sitting on road surface)
    const wheelGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.4, 16);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.7 });
    
    const wheel1 = new THREE.Mesh(wheelGeo, wheelMat);
    wheel1.rotation.z = Math.PI / 2;
    wheel1.position.set(-1, 0.4, 0.7);
    wheel1.castShadow = true;
    group.add(wheel1);
    
    const wheel2 = new THREE.Mesh(wheelGeo, wheelMat);
    wheel2.rotation.z = Math.PI / 2;
    wheel2.position.set(-1, 0.4, -0.7);
    wheel2.castShadow = true;
    group.add(wheel2);
    
    const wheel3 = new THREE.Mesh(wheelGeo, wheelMat);
    wheel3.rotation.z = Math.PI / 2;
    wheel3.position.set(1, 0.4, 0.7);
    wheel3.castShadow = true;
    group.add(wheel3);
    
    const wheel4 = new THREE.Mesh(wheelGeo, wheelMat);
    wheel4.rotation.z = Math.PI / 2;
    wheel4.position.set(1, 0.4, -0.7);
    wheel4.castShadow = true;
    group.add(wheel4);
    
    group.position.set(x, 0, z);
    group.rotation.y = rotY;
    // Store wheel references for animation
    group.wheels = [wheel1, wheel2, wheel3, wheel4];
    scene.add(group);
    return group;
}

// Add trees around the city (natural landscape)
createTree(-50, 50);
createTree(-55, 45);
createTree(-45, 55);
createTree(50, -45);
createTree(55, -40);
createTree(-60, -50);
createTree(60, 50);
createTree(0, 70);
createTree(-70, 0);
createTree(70, 20);

// Add footpaths connecting buildings
function createFootpath(x, z, w, d) {
    const path = new THREE.Mesh(new THREE.PlaneGeometry(w, d), matFootpath);
    path.rotation.x = -Math.PI / 2;
    path.position.set(x, 0.02, z);
    path.receiveShadow = true;
    scene.add(path);
}

createFootpath(-20, -10, 8, 5);   // Hospital area
createFootpath(30, -15, 8, 8);    // Residential area
createFootpath(25, 15, 6, 6);     // School area
createFootpath(-20, 25, 6, 10);   // Industrial area
createFootpath(-30, 30, 5, 5);    // Battery area

// Add vehicles on roads (keeping them within road boundaries)
const cars = [];
const carData = [
    { start: new THREE.Vector3(-45, 0, 0), end: new THREE.Vector3(45, 0, 0), speed: 12 },
    { start: new THREE.Vector3(0, 0, -35), end: new THREE.Vector3(0, 0, 35), speed: 12 }
];

carData.forEach((data, idx) => {
    const car = createCar(data.start.x, data.start.z, idx === 1 ? Math.PI : 0);
    cars.push({
        mesh: car,
        start: data.start,
        end: data.end,
        speed: data.speed,
        progress: 0
    });
});

// 8. ENERGY PATH VISUALIZATION (Animated Flow)
const energyPaths = [];

function createEnergyPath(startPos, endPos, color, label) {
    // Create a glowing tube showing energy flow
    const curve = new THREE.LineCurve3(
        new THREE.Vector3(startPos.x, 0.5, startPos.z),
        new THREE.Vector3(endPos.x, 0.5, endPos.z)
    );
    
    // Path glow material
    const glowMat = new THREE.LineBasicMaterial({
        color: color,
        transparent: true,
        opacity: 0,
        linewidth: 4
    });
    
    const pathGeo = new THREE.BufferGeometry().setFromPoints(
        curve.getPoints(20)
    );
    const pathLine = new THREE.Line(pathGeo, glowMat);
    scene.add(pathLine);
    
    energyPaths.push({
        line: pathLine,
        curve: curve,
        baseColor: color,
        color: color,
        label: label,
        particles: [],
        isActive: false
    });
    
    // Create particle system for energy flow
    const particleCount = 8;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = 0;
        positions[i * 3 + 1] = 0.5;
        positions[i * 3 + 2] = 0;
    }
    
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const particleMat = new THREE.PointsMaterial({
        color: color,
        size: 0.5,
        transparent: true,
        opacity: 0.8,
        sizeAttenuation: true
    });
    
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);
    
    energyPaths[energyPaths.length - 1].particles = {
        mesh: particles,
        positions: positions,
        t: new Array(particleCount).fill(0)
    };
}

// Create energy paths
createEnergyPath(pp1.position, battMesh.position, 0x3b82f6, "Plant 1 → Battery");
createEnergyPath(pp2.position, battMesh.position, 0x3b82f6, "Plant 2 → Battery");
createEnergyPath(battMesh.position, new THREE.Vector3(-20, 0, -20), 0x22c55e, "Battery → Hospital");
createEnergyPath(battMesh.position, new THREE.Vector3(25, 0, 20), 0x22c55e, "Battery → School");
createEnergyPath(battMesh.position, new THREE.Vector3(-20, 0, 20), 0x22c55e, "Battery → Industry");
createEnergyPath(battMesh.position, new THREE.Vector3(30, 0, -20), 0x22c55e, "Battery → Residential");

// ── Logic: Day/Night & Lighting ─────────────────────────────────────────────

let currentHour = 6.0;

function updateTimeOfDay(hour) {
    currentHour = hour;
    const angle = ((hour - 6) / 12) * Math.PI;
    const radius = 80;
    sunLight.position.x = Math.cos(angle) * -radius;
    sunLight.position.y = Math.sin(angle) * radius;
    sunLight.position.z = Math.cos(angle) * 30; // Slight arc
    
    let isNight = (hour < 7 || hour > 18);
    let intensityTarget = isNight ? 0.05 : 1.2;
    sunLight.intensity = sunLight.intensity * 0.9 + intensityTarget * 0.1;
    
    // Adjust ambient light based on time
    const ambientIntensity = isNight ? 0.1 : 0.3;
    ambientLight.intensity = ambientLight.intensity * 0.9 + ambientIntensity * 0.1;
    
    // Adjust fog based on time of day
    if (isNight) {
        scene.fog.near = 40; // Better visibility at night
        scene.fog.far = 200;
    } else {
        scene.fog.near = 80;  // More haze during day
        scene.fog.far = 350;
    }
    
    const skyLight = new THREE.Color(0x87CEEB);
    const dawn = new THREE.Color(0xd97755);
    const night = new THREE.Color(0x0a0a1a);
    const dusk = new THREE.Color(0x8a5c3a);

    if (isNight) {
        scene.background.lerpColors(scene.background, night, 0.05);
        scene.fog.color.lerpColors(scene.fog.color, night, 0.05);
    } else {
        let mix = 0;
        let target;
        
        if (hour < 7) {
            // Dawn (6-7)
            mix = (hour - 6) / 1;
            target = new THREE.Color().lerpColors(night, dawn, mix);
        } else if (hour < 12) {
            // Morning to noon (7-12)
            mix = (hour - 7) / 5;
            target = new THREE.Color().lerpColors(dawn, skyLight, mix);
        } else if (hour < 18) {
            // Afternoon to evening (12-18)
            mix = (hour - 12) / 6;
            target = new THREE.Color().lerpColors(skyLight, dusk, mix);
        } else {
            // Dusk (18-19)
            mix = (hour - 18) / 1;
            target = new THREE.Color().lerpColors(dusk, night, mix);
        }
        
        scene.background.lerpColors(scene.background, target, 0.05);
        scene.fog.color.lerpColors(scene.fog.color, target, 0.05);
    }
}

function updateWindowLighting(zoneId, state) {
    const mat = windowMats[zoneId];
    if (!mat) return;

    // Default to OFF during day, ON during night
    let baseIntensity = (currentHour < 7 || currentHour > 18) ? 1.0 : 0.0;
    
    // Evaluate shedding status
    const d = state.demand ? state.demand[zoneId] : 0;
    const s = state.supplied ? state.supplied[zoneId] : 0;
    
    if (d > 0 && s < d) {
        // Shedding power! Dim or turn red.
        const pct = s / d;
        if (pct < 0.1) {
            // Completely off (blackout)
            mat.emissive.setHex(0x000000);
            mat.emissiveIntensity = 0;
        } else {
            // Brownout/Emergency (Red)
            mat.emissive.setHex(0xff3300);
            mat.emissiveIntensity = 0.8;
            baseIntensity = 0.8; // forces on even in day for emergency
        }
    } else {
        // Normal power
        mat.emissive.copy(mat.color); // Revert to healthy yellow
        mat.emissiveIntensity = baseIntensity;
    }
}


// ── API Polling & Dashboard Update ──────────────────────────────────────────

const elClock = document.getElementById("clock-display");
const elSlider = document.getElementById("time-slider");
const elStatus = document.getElementById("grid-status");
const elBatt = document.getElementById("batt-val");
const elBattMeter = document.getElementById("batt-meter");
const elDemand = document.getElementById("demand-val");
const elDemandMeter = document.getElementById("demand-meter");
const elLog = document.getElementById("action-log");

async function fetchState() {
    try {
        const res = await fetch(`${API}/optimize`);
        if (!res.ok) return;
        const state = await res.json();
        
        if (!state || Object.keys(state).length === 0) return;

        // UI Updates
        const hr = state.simulated_hour !== undefined ? state.simulated_hour : 6.0;
        const mins = Math.floor((hr % 1) * 60).toString().padStart(2, '0');
        const hrs = Math.floor(hr).toString().padStart(2, '0');
        elClock.textContent = `${hrs}:${mins}`;
        
        if (document.activeElement !== elSlider) elSlider.value = hr;

        updateTimeOfDay(hr);

        // Status
        elStatus.textContent = state.status_code;
        elStatus.className = "status-" + state.status_code.toLowerCase();

        // Battery
        elBatt.textContent = state.battery_energy.toFixed(1);
        elBattMeter.style.width = `${(state.battery_energy / 400) * 100}%`;
        
        // Battery block lighting
        if (state.battery_delta > 0) {
            windowMats.battery.emissive.setHex(0x22c55e); // Charging (Green)
            windowMats.battery.emissiveIntensity = 1;
        } else if (state.battery_delta < 0) {
            windowMats.battery.emissive.setHex(0x3b82f6); // Discharging (Blue)
            windowMats.battery.emissiveIntensity = 1;
        } else {
            windowMats.battery.emissiveIntensity = 0.1; // Idle
        }
        
        elDemand.textContent = state.total_demand.toFixed(1);
        elDemandMeter.style.width = `${Math.min(100, (state.total_demand / 500) * 100)}%`;

        // Update Window Emit Logic per zone
        ["hospital", "school", "industry", "residential"].forEach(z => updateWindowLighting(z, state));
        
        // Update Energy Paths based on supply/demand
        energyPaths.forEach((path, idx) => {
            // Plant to battery paths (indices 0-1) are active if battery has supply
            if (idx < 2) {
                path.isActive = state.battery_delta > 0;
            } else {
                // Battery to zone paths (indices 2+) are active if zone has supply
                const zoneNames = ["hospital", "school", "industry", "residential"];
                const zoneIdx = idx - 2;
                if (zoneIdx < zoneNames.length) {
                    const zoneId = zoneNames[zoneIdx];
                    const supplied = state.supplied ? state.supplied[zoneId] : 0;
                    path.isActive = supplied > 0;
                }
            }
        });
        
        // Update grid line colors based on supply status
        const supplyStatusColors = {
            "green": 0x22c55e,    // Green for normal supply
            "yellow": 0xeab308,   // Yellow for low supply
            "red": 0xef4444       // Red for no supply
        };
        
        const gridColor = supplyStatusColors[state.supply_status || "green"];
        energyPaths.forEach((path, idx) => {
            // For battery-to-zone paths (idx >= 2), use the dynamic color based on supply status
            // For plant-to-battery paths (idx < 2), keep the original blue
            if (idx >= 2) {
                path.color = gridColor;
                path.line.material.color.setHex(gridColor);
            }
        });

        // Action Logs
        if (state.actions && state.actions.length > 0) {
            elLog.innerHTML = state.actions.map(a => `<li>${a}</li>`).join("");
        }

    } catch (e) {
        console.warn("Backend poll failed", e);
    }
}

elSlider.addEventListener("input", (e) => {
    const hr = parseFloat(e.target.value);
    updateTimeOfDay(hr);
    const mins = Math.floor((hr % 1) * 60).toString().padStart(2, '0');
    const hrs = Math.floor(hr).toString().padStart(2, '0');
    elClock.textContent = `${hrs}:${mins}`;
});

elSlider.addEventListener("change", async (e) => {
    const hr = parseFloat(e.target.value);
    await fetch(`${API}/set_time`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hour: hr })
    });
});

// ── Mouse Controls ──────────────────────────────────────────────────────────

let cameraState = {
    theta: Math.PI / 4,    // Angle around Y axis
    phi: Math.PI / 3,      // Angle from Y axis
    distance: 90,           // Distance from center
    target: new THREE.Vector3(10, 5, -10)
};

const mouseState = {
    isPressed: false,
    lastX: 0,
    lastY: 0,
    deltaX: 0,
    deltaY: 0
};

const canvas = renderer.domElement;

// Mouse down
canvas.addEventListener('mousedown', (e) => {
    // Only start pan if clicking on canvas (not on UI panels)
    if (e.target === canvas) {
        mouseState.isPressed = true;
        mouseState.lastX = e.clientX;
        mouseState.lastY = e.clientY;
    }
});

// Mouse move
document.addEventListener('mousemove', (e) => {
    if (mouseState.isPressed) {
        mouseState.deltaX = e.clientX - mouseState.lastX;
        mouseState.deltaY = e.clientY - mouseState.lastY;
        mouseState.lastX = e.clientX;
        mouseState.lastY = e.clientY;
        
        // Pan camera: rotate around target
        cameraState.theta += mouseState.deltaX * 0.005;
        cameraState.phi += mouseState.deltaY * 0.005;
        
        // Constrain phi to avoid flipping
        cameraState.phi = Math.max(0.1, Math.min(Math.PI - 0.1, cameraState.phi));
    }
});

// Mouse up
document.addEventListener('mouseup', () => {
    mouseState.isPressed = false;
});

// Mouse wheel: zoom in/out (on canvas only)
canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const zoomSpeed = 2;
    if (e.deltaY < 0) {
        // Zoom in
        cameraState.distance = Math.max(20, cameraState.distance - zoomSpeed);
    } else {
        // Zoom out
        cameraState.distance = Math.min(200, cameraState.distance + zoomSpeed);
    }
}, { passive: false });

// Keyboard controls: Arrow keys to pan, +/- to zoom
document.addEventListener('keydown', (e) => {
    const panSpeed = 0.05;
    const zoomSpeed = 2;
    
    switch(e.key) {
        case 'ArrowLeft':
            cameraState.theta -= panSpeed;
            break;
        case 'ArrowRight':
            cameraState.theta += panSpeed;
            break;
        case 'ArrowUp':
            cameraState.phi -= panSpeed;
            cameraState.phi = Math.max(0.1, Math.min(Math.PI - 0.1, cameraState.phi));
            break;
        case 'ArrowDown':
            cameraState.phi += panSpeed;
            cameraState.phi = Math.max(0.1, Math.min(Math.PI - 0.1, cameraState.phi));
            break;
        case '+':
        case '=':
            cameraState.distance = Math.max(20, cameraState.distance - zoomSpeed);
            break;
        case '-':
            cameraState.distance = Math.min(200, cameraState.distance + zoomSpeed);
            break;
    }
});

function updateCameraPosition() {
    const pos = new THREE.Vector3(
        cameraState.distance * Math.sin(cameraState.phi) * Math.sin(cameraState.theta),
        cameraState.distance * Math.cos(cameraState.phi),
        cameraState.distance * Math.sin(cameraState.phi) * Math.cos(cameraState.theta)
    );
    
    camera.position.copy(pos).add(cameraState.target);
    camera.lookAt(cameraState.target);
}

// ── Animation Loop ──────────────────────────────────────────────────────────

const tempV = new THREE.Vector3();

function animate() {
    requestAnimationFrame(animate);
    
    // Update camera position based on mouse/keyboard input
    updateCameraPosition();
    
    // Rotate windmill rotor
    if (typeof windmillRotor !== 'undefined' && windmillRotor) {
        windmillRotor.rotation.x += 0.02; // Smooth continuous rotation
    }
    
    // Update energy path visualization
    energyPaths.forEach((path, idx) => {
        if (path.isActive) {
            // Glow effect on active paths
            path.line.material.opacity = 0.8;
        } else {
            path.line.material.opacity = 0.1;
        }
        
        // Animate particles along the path
        if (path.particles && path.particles.mesh) {
            const positions = path.particles.positions;
            const t = path.particles.t;
            const time = Date.now() * 0.001;
            
            for (let i = 0; i < t.length; i++) {
                t[i] = (time * 0.5 + i / t.length) % 1.0;
                const point = path.curve.getPoint(t[i]);
                
                positions[i * 3] = point.x;
                positions[i * 3 + 1] = point.y;
                positions[i * 3 + 2] = point.z;
            }
            
            path.particles.mesh.geometry.attributes.position.needsUpdate = true;
            path.particles.mesh.material.opacity = path.isActive ? 0.9 : 0.1;
            
            // Update particle color to match current grid status
            path.particles.mesh.material.color.setHex(path.color);
        }
    });

    // Update car positions with improved physics (steering, acceleration & wheel rotation)
    const dt = 1 / 60; // Assuming 60 FPS
    cars.forEach(carData => {
        carData.progress += (carData.speed * dt) / carData.start.distanceTo(carData.end);
        carData.progress = carData.progress % 1.0; // Loop
        
        const path = new THREE.Vector3().lerpVectors(carData.start, carData.end, carData.progress);
        carData.mesh.position.copy(path);
        
        // Make car face the direction of travel - only rotate on Y axis to prevent tilting
        const direction = new THREE.Vector3().subVectors(carData.end, carData.start).normalize();
        carData.mesh.rotation.x = 0; // Keep car upright (no forward/backward tilt)
        carData.mesh.rotation.y = Math.atan2(direction.x, direction.z);
        carData.mesh.rotation.z = 0; // No side-to-side tilt
        
        // Rotate wheels based on movement - speed-dependent rotation
        // Wheel rotation speed: 0.3 radians per frame at 1.0 speed, scales linearly
        const wheelRotationSpeed = carData.speed * 0.3;
        if (carData.mesh.wheels) {
            carData.mesh.wheels.forEach(wheel => {
                wheel.rotation.x += wheelRotationSpeed;
            });
        }
    });

    // Update floating labels UI
    floatingLabels.forEach(lbl => {
        tempV.copy(lbl.pos);
        tempV.project(camera);
        // Convert to CSS pixels
        const x = (tempV.x *  .5 + .5) * window.innerWidth;
        const y = (tempV.y * -.5 + .5) * window.innerHeight;
        // Fade out if behind camera
        lbl.el.style.left = `${x}px`;
        lbl.el.style.top = `${y}px`;
        lbl.el.style.opacity = tempV.z > 1 ? 0 : 1;
    });

    renderer.render(scene, camera);
}
animate();

setInterval(fetchState, 1000);
fetchState();
