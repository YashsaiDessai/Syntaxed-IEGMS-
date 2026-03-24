/**
 * app.js - Advanced Three.js Voxel City Simulation
 */

const API = "http://localhost:8000";

// ── 3D Scene Setup ──────────────────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0f19);
scene.fog = new THREE.Fog(0x0b0f19, 20, 150);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 1000);
// Positioned to look over the city like an isometric god game
camera.position.set(-60, 50, 60);
camera.lookAt(10, 0, -10);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('canvas-container').appendChild(renderer.domElement);

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// ── Lighting (Sun cycle) ────────────────────────────────────────────────────
const ambientLight = new THREE.AmbientLight(0x404050, 0.3);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xffeedd, 1.2);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 2048;
sunLight.shadow.mapSize.height = 2048;
sunLight.shadow.camera.left = -60;
sunLight.shadow.camera.right = 60;
sunLight.shadow.camera.top = 60;
sunLight.shadow.camera.bottom = -60;
sunLight.shadow.camera.far = 200;
scene.add(sunLight);

// ── Materials ───────────────────────────────────────────────────────────────
const matGround = new THREE.MeshStandardMaterial({ color: 0x111827 });
const matRoad = new THREE.MeshStandardMaterial({ color: 0x1f2937 });
const matLine = new THREE.MeshBasicMaterial({ color: 0xffffee });

// Building Shells
const matRes = new THREE.MeshStandardMaterial({ color: 0x475569 }); // grey houses
const matHosp = new THREE.MeshStandardMaterial({ color: 0xf8fafc }); // white hospital
const matInd = new THREE.MeshStandardMaterial({ color: 0x334155 }); // dark factories
const matFactoryRoof = new THREE.MeshStandardMaterial({ color: 0x1e293b });
const matSchool = new THREE.MeshStandardMaterial({ color: 0xb45309 }); // brick school
const matBatt = new THREE.MeshStandardMaterial({ color: 0x1e3a8a }); // blue battery

// Window Materials (Emissive controlled by logic)
const matWinHosp = new THREE.MeshStandardMaterial({ color: 0xffe600, emissive: 0xffe600, emissiveIntensity: 0 });
const matWinSchool = new THREE.MeshStandardMaterial({ color: 0xffe600, emissive: 0xffe600, emissiveIntensity: 0 });
const matWinInd = new THREE.MeshStandardMaterial({ color: 0xffe600, emissive: 0xffe600, emissiveIntensity: 0 });
const matWinRes = new THREE.MeshStandardMaterial({ color: 0xffea80, emissive: 0xffea80, emissiveIntensity: 0 });
const matWinBatt = new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x22c55e, emissiveIntensity: 0 });

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

const hospCross = new THREE.Mesh(new THREE.BoxGeometry(6, 6, 2), matWinHosp);
hospCross.position.set(-20, 23, -20);
hospGroup.add(hospCross);
const hospCross2 = new THREE.Mesh(new THREE.BoxGeometry(2, 6, 6), matWinHosp);
hospCross2.position.set(-20, 23, -20);
hospGroup.add(hospCross2);
scene.add(hospGroup);
addLabel('label-hospital', -20, 28, -20);


// 2. RESIDENTIAL (Top Right Grid)
for(let rx = 15; rx <= 45; rx += 10) {
    for(let rz = -35; rz <= -10; rz += 10) {
        // Little house
        const w = 6, h = 6, d = 6;
        const house = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), matRes);
        house.position.set(rx, h/2, rz);
        house.castShadow = true; house.receiveShadow = true;
        
        // Windows
        attachWindows(house, w, h, d, matWinRes, "residential");
        
        scene.add(house);
    }
}
addLabel('label-residential', 30, 10, -20);


// 3. INDUSTRIAL ZONE (Bottom Left)
const indW = 12, indH = 8, indD = 20;
const factory = new THREE.Mesh(new THREE.BoxGeometry(indW, indH, indD), matInd);
factory.position.set(-20, indH/2, 20);
factory.castShadow = true; factory.receiveShadow = true;
attachWindows(factory, indW, indH, indD, matWinInd, "industry");
scene.add(factory);
// Smokestacks
const s1 = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 2, 12), matFactoryRoof);
s1.position.set(-22, 12, 15); s1.castShadow=true; scene.add(s1);
const s2 = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 2, 12), matFactoryRoof);
s2.position.set(-22, 12, 23); s2.castShadow=true; scene.add(s2);

addLabel('label-industry', -20, 18, 20);


// 4. SCHOOL / EDU (Bottom Right)
const sW = 20, sH = 6, sD = 8;
const school = new THREE.Mesh(new THREE.BoxGeometry(sW, sH, sD), matSchool);
school.position.set(25, sH/2, 20);
school.castShadow = true; school.receiveShadow = true;
attachWindows(school, sW, sH, sD, matWinSchool, "school");
scene.add(school);

// School wings
const wingGeo = new THREE.BoxGeometry(6, 6, 12);
const wing1 = new THREE.Mesh(wingGeo, matSchool);
wing1.position.set(18, 3, 26); wing1.castShadow = true;
attachWindows(wing1, 6, 6, 12, matWinSchool, "school");
scene.add(wing1);
const wing2 = new THREE.Mesh(wingGeo, matSchool);
wing2.position.set(32, 3, 26); wing2.castShadow = true;
attachWindows(wing2, 6, 6, 12, matWinSchool, "school");
scene.add(wing2);

addLabel('label-school', 25, 12, 20);

// 5. BATTERY SUBSTATION (Center Left)
const battMesh = new THREE.Mesh(new THREE.BoxGeometry(6, 6, 6), matBatt);
battMesh.position.set(-8, 3, -2);
battMesh.castShadow = true; battMesh.receiveShadow = true;
attachWindows(battMesh, 6, 6, 6, matWinBatt, "battery"); // re-using tracking but custom handled
scene.add(battMesh);
addLabel('label-battery', -8, 10, -2);

// 6. POWER PLANTS (Generation)
const plantMat = new THREE.MeshStandardMaterial({ color: 0x64748b });
const pp1 = new THREE.Mesh(new THREE.CylinderGeometry(3, 5, 12), plantMat);
pp1.position.set(-35, 6, 35);
pp1.castShadow = true; pp1.receiveShadow = true;
scene.add(pp1);
addLabel('label-plant1', -35, 15, 35);

const pp2 = new THREE.Mesh(new THREE.CylinderGeometry(3, 5, 12), plantMat);
pp2.position.set(-25, 6, 42);
pp2.castShadow = true; pp2.receiveShadow = true;
scene.add(pp2);
addLabel('label-plant2', -25, 15, 42);

// 7. GRID LINES (Supply network)
function drawGridLine(startV, endV, colorHex) {
    const mat = new THREE.LineBasicMaterial({ color: colorHex, linewidth: 2, transparent: true, opacity: 0.5 });
    const points = [
        new THREE.Vector3(startV.x, 0.5, startV.z),
        new THREE.Vector3(endV.x, 0.5, endV.z)
    ];
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), mat);
    scene.add(line);
}
// Connect plants to battery
drawGridLine(pp1.position, battMesh.position, 0x3b82f6);
drawGridLine(pp2.position, battMesh.position, 0x3b82f6);
// Connect battery to zones
drawGridLine(battMesh.position, new THREE.Vector3(-20, 0, -20), 0x22c55e); // Hospital
drawGridLine(battMesh.position, new THREE.Vector3(25, 0, 20), 0x22c55e);   // School
drawGridLine(battMesh.position, new THREE.Vector3(-20, 0, 20), 0x22c55e);  // Industry
drawGridLine(battMesh.position, new THREE.Vector3(30, 0, -20), 0x22c55e);  // Residential

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
    
    const skyLight = new THREE.Color(0x87CEEB);
    const dawn = new THREE.Color(0xd97755);
    const night = new THREE.Color(0x02040a);

    if (isNight) {
        scene.background.lerpColors(scene.background, night, 0.05);
        scene.fog.color.lerpColors(scene.fog.color, night, 0.05);
    } else {
        let mix = hour < 12 ? (hour - 6)/5 : (18 - hour)/5;
        mix = Math.max(0, Math.min(1, mix));
        let target = new THREE.Color().lerpColors(dawn, skyLight, mix);
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
        elDemandMeter.style.width = `${Math.min(100, (state.total_demand / 900) * 100)}%`;

        // Update Window Emit Logic per zone
        ["hospital", "school", "industry", "residential"].forEach(z => updateWindowLighting(z, state));

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

// ── Animation Loop ──────────────────────────────────────────────────────────

const tempV = new THREE.Vector3();

function animate() {
    requestAnimationFrame(animate);
    
    // Slow camera rotation / bob
    const t = Date.now() * 0.0005;
    camera.position.x = -60 + Math.sin(t) * 5;
    camera.position.z = 60 + Math.cos(t) * 5;
    camera.lookAt(10, 0, -10);

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
