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

// ── Sun Object (Visual) ────────────────────────────────────────────────────
let sunSphere = null;
const matSun = new THREE.MeshBasicMaterial({ color: 0xffffff, emissive: 0xffff00, emissiveIntensity: 1 });
const sunGeo = new THREE.SphereGeometry(3, 32, 32);
sunSphere = new THREE.Mesh(sunGeo, matSun);
sunSphere.position.set(0, 80, 0);
scene.add(sunSphere);

// ── Trees (Scattered Flora) ──────────────────────────────────────────────────
function createTree(x, z) {
    // Trunk
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x654321 });
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(1, 1.5, 8), trunkMat);
    trunk.position.set(x, 4, z);
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    scene.add(trunk);
    
    // Foliage (dome)
    const foliageMat = new THREE.MeshStandardMaterial({ color: 0x228b22 });
    const foliage = new THREE.Mesh(new THREE.SphereGeometry(5, 16, 16), foliageMat);
    foliage.position.set(x, 12, z);
    foliage.castShadow = true;
    foliage.receiveShadow = true;
    scene.add(foliage);
}

// Plant trees around the residential and school areas
createTree(-40, -40); createTree(-30, -45); createTree(-35, -30);
createTree(50, -35); createTree(55, -25); createTree(48, -30);
createTree(40, 35); createTree(35, 40); createTree(45, 38);
createTree(-45, 30); createTree(-38, 35); createTree(-42, 25);

// ── City Builder ────────────────────────────────────────────────────────────

// We store the specific window materials for each zone so we can light them up
const zoneWindows = {
    hospital: [], school: [], industry: [], residential: [], battery: []
};
const floatingLabels = [];

// Track clickable zone meshes for raycasting
const clickableZones = {
    hospital: null,
    school: null,
    industry: null,
    residential: null,
    battery: null
};

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
hospMain.userData = { zoneId: "hospital" };
attachWindows(hospMain, 16, 20, 12, matWinHosp, "hospital");
hospGroup.add(hospMain);

const hospCross = new THREE.Mesh(new THREE.BoxGeometry(6, 6, 2), matWinHosp);
hospCross.position.set(-20, 23, -20);
hospGroup.add(hospCross);
const hospCross2 = new THREE.Mesh(new THREE.BoxGeometry(2, 6, 6), matWinHosp);
hospCross2.position.set(-20, 23, -20);
hospGroup.add(hospCross2);
scene.add(hospGroup);
clickableZones.hospital = hospMain;
addLabel('label-hospital', -20, 28, -20);


// 2. RESIDENTIAL (Top Right Grid)
let residentialMainBuilding = null;
for(let rx = 15; rx <= 45; rx += 10) {
    for(let rz = -35; rz <= -10; rz += 10) {
        // Little house
        const w = 6, h = 6, d = 6;
        const house = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), matRes);
        house.position.set(rx, h/2, rz);
        house.castShadow = true; house.receiveShadow = true;
        house.userData = { zoneId: "residential" };
        
        // Windows
        attachWindows(house, w, h, d, matWinRes, "residential");
        
        if(!residentialMainBuilding) residentialMainBuilding = house;
        scene.add(house);
    }
}
clickableZones.residential = residentialMainBuilding;
addLabel('label-residential', 30, 10, -20);


// 3. INDUSTRIAL ZONE (Bottom Left)
const indW = 12, indH = 8, indD = 20;
const factory = new THREE.Mesh(new THREE.BoxGeometry(indW, indH, indD), matInd);
factory.position.set(-20, indH/2, 20);
factory.castShadow = true; factory.receiveShadow = true;
factory.userData = { zoneId: "industry" };
attachWindows(factory, indW, indH, indD, matWinInd, "industry");
scene.add(factory);
clickableZones.industry = factory;
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
school.userData = { zoneId: "school" };
attachWindows(school, sW, sH, sD, matWinSchool, "school");
scene.add(school);
clickableZones.school = school;

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
battMesh.userData = { zoneId: "battery" };
attachWindows(battMesh, 6, 6, 6, matWinBatt, "battery"); // re-using tracking but custom handled
scene.add(battMesh);
clickableZones.battery = battMesh;
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
    const sunX = Math.cos(angle) * -radius;
    const sunY = Math.sin(angle) * radius;
    const sunZ = Math.cos(angle) * 30;
    
    // Update sun light position
    sunLight.position.x = sunX;
    sunLight.position.y = sunY;
    sunLight.position.z = sunZ;
    
    // Move sun sphere with the light
    if (sunSphere) {
        sunSphere.position.set(sunX, sunY, sunZ);
        // Glow effect: brighter during day, dimmer at night
        const isNight = (hour < 6 || hour > 18);
        sunSphere.material.emissiveIntensity = isNight ? 0.2 : 1;
    }
    
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

    // Evaluate time-based activity status for each zone
    let isActive = false;
    let activityIntensity = 0;
    
    switch(zoneId) {
        case "hospital":
            // Hospital: Always active (24/7 operations)
            isActive = true;
            activityIntensity = 1.0;
            break;
        case "school":
            // School: Active 8 AM - 5 PM (08:00 - 17:00)
            isActive = (currentHour >= 8 && currentHour < 17);
            activityIntensity = isActive ? 1.0 : 0.1;
            break;
        case "industry":
            // Factory: Active 6 AM - 6 PM (06:00 - 18:00)
            isActive = (currentHour >= 6 && currentHour < 18);
            activityIntensity = isActive ? 1.0 : 0.3;
            break;
        case "residential":
            // Residential: More active evening/night (6 PM - 11 PM), sleeping (11 PM - 6 AM)
            const isEvening = (currentHour >= 18 && currentHour < 24) || (currentHour >= 0 && currentHour < 6);
            const isSleeping = (currentHour >= 23 || currentHour < 6);
            isActive = !isSleeping;
            activityIntensity = isSleeping ? 0.05 : (isEvening ? 1.0 : 0.3);
            break;
    }

    // Default to OFF during day, ON during night
    let baseIntensity = (currentHour < 7 || currentHour > 18) ? 1.0 : activityIntensity;
    
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
        // Normal power - color reflects activity
        if (!isActive && currentHour >= 7 && currentHour <= 18) {
            // Inactive during day - dim the lights
            mat.emissive.setHex(0x888888);
            mat.emissiveIntensity = 0.2;
        } else {
            // Normal operation
            mat.emissive.copy(mat.color); // Revert to healthy yellow
            mat.emissiveIntensity = baseIntensity;
        }
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

// Activity status elements
const elActHospital = document.getElementById("act-hospital");
const elActSchool = document.getElementById("act-school");
const elActIndustry = document.getElementById("act-industry");
const elActResidential = document.getElementById("act-residential");

function updateActivityStatus(hour) {
    // Hospital: Always active
    elActHospital.textContent = "24/7 Operations";
    elActHospital.className = "act-active";
    
    // School: Open 8 AM - 5 PM
    if (hour >= 8 && hour < 17) {
        elActSchool.textContent = "🎓 Classes Active";
        elActSchool.className = "act-busy";
    } else if (hour >= 17 && hour < 19) {
        elActSchool.textContent = "🚌 After-school";
        elActSchool.className = "act-idle";
    } else {
        elActSchool.textContent = "🔒 Closed";
        elActSchool.className = "act-closed";
    }
    
    // Industry: Working 6 AM - 6 PM
    if (hour >= 6 && hour < 18) {
        const isShift1 = hour < 12;
        elActIndustry.textContent = isShift1 ? "⚙️ Morning Shift" : "⚙️ Evening Shift";
        elActIndustry.className = "act-busy";
    } else {
        elActIndustry.textContent = "🛑 Standby";
        elActIndustry.className = "act-idle";
    }
    
    // Residential: Variable activity
    if (hour >= 23 || hour < 6) {
        elActResidential.textContent = "😴 Sleeping";
        elActResidential.className = "act-closed";
    } else if (hour >= 6 && hour < 8) {
        elActResidential.textContent = "🌅 Morning Rush";
        elActResidential.className = "act-busy";
    } else if (hour >= 8 && hour < 17) {
        elActResidential.textContent = "💼 Daytime";
        elActResidential.className = "act-idle";
    } else if (hour >= 17 && hour < 22) {
        elActResidential.textContent = "🍳 Evening Peak";
        elActResidential.className = "act-busy";
    } else {
        elActResidential.textContent = "🌙 Night Mode";
        elActResidential.className = "act-idle";
    }
}

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
        updateActivityStatus(hr);

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

// ── Zone Click Detection (Raycasting) ───────────────────────────────────────

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let currentState = {};

window.addEventListener('click', (event) => {
    // Only detect clicks on the canvas, not on UI panels
    if (event.target !== renderer.domElement) return;
    
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    raycaster.setFromCamera(mouse, camera);
    
    const clickableObjects = Object.values(clickableZones).filter(z => z !== null);
    const intersects = raycaster.intersectObjects(clickableObjects);
    
    if (intersects.length > 0) {
        let clickedZone = null;
        let obj = intersects[0].object;
        
        // Traverse up the hierarchy to find the zone ID
        while (obj && !clickedZone) {
            if (obj.userData && obj.userData.zoneId) {
                clickedZone = obj.userData.zoneId;
            }
            obj = obj.parent;
        }
        
        if (clickedZone) {
            openZoneModal(clickedZone, currentState);
        }
    }
});

// ── Zone Dashboard Generators ───────────────────────────────────────────────

function generateZoneDashboard(zoneId, state) {
    const zoneData = {
        hospital: {
            title: '🏥 Hospital Zone Details',
            color: '#fff',
            icon: '🏥',
            operatingHours: '24/7',
            demand: state.demand?.hospital || 0,
            supplied: state.supplied?.hospital || 0,
            priority: 'CRITICAL',
            load: [80, 85, 90, 100, 95, 85, 90, 85],
            details: ['Intensive Care', 'Emergency Department', 'Surgical Suite', 'Lab Services'],
            status: 'Always Active',
            efficiency: '98%'
        },
        school: {
            title: '🏫 School Zone Details',
            color: '#b45309',
            icon: '🏫',
            operatingHours: '08:00 - 17:00',
            demand: state.demand?.school || 0,
            supplied: state.supplied?.school || 0,
            priority: 'HIGH',
            load: [8, 15, 95, 125, 100, 85, 25, 8],
            details: ['Classrooms', 'HVAC System', 'Computer Lab', 'Sports Facility'],
            status: currentHour >= 8 && currentHour < 17 ? 'Active' : 'Closed',
            efficiency: '94%'
        },
        industry: {
            title: '🏭 Industrial Zone Details',
            color: '#334155',
            icon: '🏭',
            operatingHours: '06:00 - 18:00',
            demand: state.demand?.industry || 0,
            supplied: state.supplied?.industry || 0,
            priority: 'MEDIUM',
            load: [25, 35, 140, 160, 155, 140, 60, 25],
            details: ['Machine Ops', 'Conveyor Systems', 'Welding Station', 'Quality Control'],
            status: currentHour >= 6 && currentHour < 18 ? 'Operating' : 'Standby',
            efficiency: '91%'
        },
        residential: {
            title: '🏘️ Residential Zone Details', 
            color: '#475569',
            icon: '🏘️',
            operatingHours: '24/7 Variable',
            demand: state.demand?.residential || 0,
            supplied: state.supplied?.residential || 0,
            priority: 'LOW',
            load: [35, 65, 70, 50, 50, 155, 190, 80],
            details: ['Homes', 'HVAC', 'Cooking', 'Entertainment'],
            status: 'Variable Activity',
            efficiency: '85%'
        },
        battery: {
            title: '🔋 Battery Storage System',
            color: '#1e3a8a',
            icon: '🔋',
            operatingHours: 'On Demand',
            demand: state.battery_energy || 0,
            supplied: state.battery_delta || 0,
            priority: 'CRITICAL',
            load: [50, 50, 50, 60, 80, 100, 150, 100],
            details: ['Li-Ion Cells', 'Power Conditioning', 'Safety Systems', 'Cooling'],
            status: state.battery_delta > 0 ? 'Charging' : state.battery_delta < 0 ? 'Discharging' : 'Idle',
            efficiency: '97%'
        }
    };
    
    const zone = zoneData[zoneId];
    if (!zone) return '';
    
    const demandPercentage = Math.min(100, (zone.demand / 350) * 100);
    const suppliedPercentage = zone.demand > 0 ? (zone.supplied / zone.demand * 100) : 100;
    
    return `
        <div class="zone-dashboard">
            <div class="zone-section">
                <h3>${zone.title}</h3>
                <div class="zone-stat">
                    <span class="zone-stat-label">Operating Hours</span>
                    <span class="zone-stat-value">${zone.operatingHours}</span>
                </div>
                <div class="zone-stat">
                    <span class="zone-stat-label">Current Status</span>
                    <span class="zone-stat-value">${zone.status}</span>
                </div>
                <div class="zone-stat">
                    <span class="zone-stat-label">Priority Level</span>
                    <span class="zone-stat-value" style="color: ${zone.priority === 'CRITICAL' ? '#ef4444' : zone.priority === 'HIGH' ? '#f59e0b' : '#22c55e'}">${zone.priority}</span>
                </div>
                <div class="zone-stat">
                    <span class="zone-stat-label">System Efficiency</span>
                    <span class="zone-stat-value">${zone.efficiency}</span>
                </div>
            </div>
            
            <div class="zone-section">
                <h3>Power Metrics</h3>
                <div class="zone-stat">
                    <span class="zone-stat-label">Current Demand</span>
                    <span class="zone-stat-value">${zone.demand.toFixed(1)} MW</span>
                </div>
                <div class="zone-bar">
                    <div class="zone-bar-fill" style="width: ${demandPercentage}%"></div>
                </div>
                <div class="zone-stat" style="margin-top: 12px;">
                    <span class="zone-stat-label">Power Supplied</span>
                    <span class="zone-stat-value ${zone.supplied < zone.demand ? 'high' : 'low'}">${zone.supplied.toFixed(1)} MW</span>
                </div>
                <div class="zone-bar">
                    <div class="zone-bar-fill" style="width: ${Math.min(100, suppliedPercentage)}%; background: ${zone.supplied >= zone.demand ? '#22c55e' : '#ef4444'};"></div>
                </div>
                <div class="zone-stat" style="margin-top: 12px; color: #94a3b8;">
                    <span class="zone-stat-label">Supply Rate</span>
                    <span class="zone-stat-value">${suppliedPercentage.toFixed(0)}%</span>
                </div>
            </div>
            
            <div class="zone-section">
                <h3>Infrastructure Components</h3>
                ${zone.details.map(d => `<div style="padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05); color: #e2e8f0; font-size: 0.9rem;">▪ ${d}</div>`).join('')}
            </div>
            
            <div class="zone-section">
                <h3>Daily Load Curve (kW)</h3>
                <div style="display: grid; grid-template-columns: repeat(8, 1fr); gap: 4px;">
                    ${zone.load.map(l => `<div style="background: rgba(59,130,246,0.3); height: ${(l/160)*80}px; border-radius: 4px; min-height: 10px;"></div>`).join('')}
                </div>
                <div style="margin-top: 8px; display: flex; justify-content: space-between; font-size: 0.75rem; color: #94a3b8;">
                    <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span>
                </div>
            </div>
            
            <div class="zone-simulator-panel">
                <h3>Live Simulator Data</h3>
                <div class="zone-stat">
                    <span class="zone-stat-label">Simulate Load Change</span>
                </div>
                <div class="zone-controls">
                    <button class="zone-btn" onclick="adjustZoneLoad('${zoneId}', 0.9)">↓ -10%</button>
                    <button class="zone-btn" onclick="adjustZoneLoad('${zoneId}', 1.1)">↑ +10%</button>
                    <button class="zone-btn danger" onclick="triggerBlackout('${zoneId}')">⚡ Fault</button>
                </div>
                <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.1); font-size: 0.8rem; color: #94a3b8;">
                    <p>Use these controls to simulate real-world scenarios and test grid response.</p>
                </div>
            </div>
        </div>
    `;
}

function openZoneModal(zoneId, state) {
    const modal = document.getElementById('zone-modal');
    const modalTitle = document.getElementById('zone-title');
    const modalContent = document.getElementById('zone-modal-content');
    
    const zoneNames = {
        hospital: '🏥 Hospital Zone',
        school: '🏫 School Zone',
        industry: '🏭 Industrial Zone',
        residential: '🏘️ Residential Zone',
        battery: '🔋 Battery System'
    };
    
    modalTitle.textContent = zoneNames[zoneId] || 'Zone Details';
    modalContent.innerHTML = generateZoneDashboard(zoneId, state);
    modal.classList.add('active');
}

function closeZoneModal() {
    const modal = document.getElementById('zone-modal');
    modal.classList.remove('active');
}

function adjustZoneLoad(zoneId, factor) {
    alert(`Simulator: ${zoneId} load adjusted to ${(factor * 100).toFixed(0)}% of baseline.\nDemo mode - implement actual simulator integration.`);
}

function triggerBlackout(zoneId) {
    alert(`Simulator: Triggering fault condition for ${zoneId}.\nDemo mode - implement actual simulator integration.`);
}

// Close modal when clicking outside
document.getElementById('zone-modal').addEventListener('click', (e) => {
    if (e.target.id === 'zone-modal') closeZoneModal();
});

// ── DASHBOARD PAGE SWITCHING ────────────────────────────────────────────────

let charts = {};
let currentState = {};

function showViewMode(mode) {
    // Hide all view modes
    document.querySelectorAll('.view-mode').forEach(el => el.classList.remove('active'));
    document.getElementById(`view-${mode}`).classList.add('active');
    
    // Update nav tabs
    document.querySelectorAll('.nav-tab').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    if (mode === 'visualization') {
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
}

function showPage(pageId) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(`page-${pageId}`).classList.add('active');
    
    // Show dashboard container
    document.getElementById('view-visualization').style.display = 'none';
    document.getElementById('dashboard-container').style.display = 'block';
    
    // Update nav tabs
    document.querySelectorAll('.nav-tab').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    // Initialize or update charts for this page
    if (pageId === 'dashboard') {
        setTimeout(() => {
            buildEnergyChart();
            buildSocChart();
            buildMixChart();
            updateDashboardKPIs();
        }, 100);
    } else if (pageId === 'monitoring') {
        setTimeout(() => {
            buildNodeMap();
            buildSensorChart();
            buildDeviceTable();
        }, 100);
    } else if (pageId === 'forecast') {
        setTimeout(() => {
            buildForecastChart();
            buildErrorChart();
        }, 100);
    } else if (pageId === 'battery') {
        setTimeout(() => {
            buildSocChart();
            buildWeeklyChart();
            buildSavingsChart();
        }, 100);
    } else if (pageId === 'control') {
        setTimeout(() => {
            buildScheduleTable();
            renderAlerts();
        }, 100);
    } else if (pageId === 'simulation') {
        setTimeout(() => {
            buildPeakChart();
        }, 100);
    }
}

// ── CHART BUILDERS ──────────────────────────────────────────────────────────

function buildEnergyChart() {
    const ctx = document.getElementById('energyChart');
    if (!ctx || charts.energy) return;
    
    const hours = Array.from({length:24}, (_,i) => i.toString().padStart(2,'0')+':00');
    const demands = Array.from({length:24}, (_,i) => {
        const h = i;
        let d = 80;
        if (h >= 6 && h < 9) d = 120 + Math.random()*40;
        else if (h >= 18 && h < 22) d = 150 + Math.random()*50;
        else if (h >= 22 || h < 6) d = 50 + Math.random()*30;
        else d = 80 + Math.random()*30;
        return d;
    });
    
    charts.energy = new Chart(ctx, {
        type: 'line',
        data: {
            labels: hours,
            datasets: [{
                label: 'Grid Demand (MW)',
                data: demands,
                borderColor: '#00d4ff',
                backgroundColor: 'rgba(0,212,255,0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 3,
                pointBackgroundColor: '#00d4ff'
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function buildSocChart() {
    const ctx = document.getElementById('socChart');
    if (!ctx || charts.soc) return;
    
    const hours = Array.from({length:24}, (_,i) => i.toString().padStart(2,'0')+':00');
    const soc = Array.from({length:24}, (_,i) => 50 + Math.sin(i/4)*20 + Math.random()*10);
    
    charts.soc = new Chart(ctx, {
        type: 'line',
        data: {
            labels: hours,
            datasets: [{
                label: 'Battery SoC (%)',
                data: soc,
                borderColor: '#00ff88',
                backgroundColor: 'rgba(0,255,136,0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function buildMixChart() {
    const ctx = document.getElementById('mixChart');
    if (!ctx || charts.mix) return;
    
    charts.mix = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Hospital', 'School', 'Industry', 'Residential'],
            datasets: [{
                data: [100, 60, 120, 80],
                backgroundColor: ['#64748b', '#b45309', '#334155', '#475569']
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function buildNodeMap() {
    const ctx = document.getElementById('nodeMap');
    if (!ctx) return;
    charts.nodeMap = new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [{
                label: 'Sensor Nodes',
                data: [{x:1,y:2},{x:3,y:4},{x:5,y:6},{x:7,y:3},{x:2,y:8}],
                backgroundColor: '#00d4ff'
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function buildSensorChart() {
    const ctx = document.getElementById('sensorChart');
    if (!ctx || charts.sensor) return;
    
    charts.sensor = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Voltage', 'Frequency', 'Power Factor', 'THD'],
            datasets: [{
                label: 'Values',
                data: [231, 50.02, 0.97, 2.3],
                backgroundColor: '#00d4ff'
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function buildForecastChart() {
    const ctx = document.getElementById('forecastChart');
    if (!ctx || charts.forecast) return;
    
    const hours = Array.from({length:24}, (_,i) => i.toString().padStart(2,'0')+':00');
    const actual = Array.from({length:24}, (_,i) => 80 + Math.sin(i/4)*40);
    const predicted = actual.map(v => v + (Math.random()-0.5)*20);
    
    charts.forecast = new Chart(ctx, {
        type: 'line',
        data: {
            labels: hours,
            datasets: [
                {
                    label: 'Actual',
                    data: actual,
                    borderColor: '#00d4ff',
                    backgroundColor: 'rgba(0,212,255,0.1)',
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Forecast',
                    data: predicted,
                    borderColor: '#00ff88',
                    borderDash: [5, 5],
                    tension: 0.4
                }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function buildErrorChart() {
    const ctx = document.getElementById('errorChart');
    if (!ctx || charts.error) return;
    
    const hours = Array.from({length:24}, (_,i) => i.toString().padStart(2,'0')+':00');
    const errors = Array.from({length:24}, () => Math.random()*5);
    
    charts.error = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: hours,
            datasets: [{
                label: 'Forecast Error (%)',
                data: errors,
                backgroundColor: 'rgba(255,64,96,0.5)'
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function buildWeeklyChart() {
    const ctx = document.getElementById('weeklyChart');
    if (!ctx || charts.weekly) return;
    
    charts.weekly = new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                label: 'Discharge (MWh)',
                data: [50, 45, 55, 60, 70, 40, 35],
                borderColor: '#00d4ff',
                backgroundColor: 'rgba(0,212,255,0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function buildSavingsChart() {
    const ctx = document.getElementById('savingsChart');
    if (!ctx || charts.savings) return;
    
    charts.savings = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Peak Shaving', 'Load Shifting', 'Arbitrage'],
            datasets: [{
                label: 'Monthly Savings ($)',
                data: [12000, 8500, 6200],
                backgroundColor: '#00ff88'
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function buildPeakChart() {
    const ctx = document.getElementById('peakChart');
    if (!ctx || charts.peak) return;
    
    const hours = Array.from({length:24}, (_,i) => i.toString().padStart(2,'0')+':00');
    const peaks = Array.from({length:24}, (_,i) => 100 + Math.sin(i/4)*50);
    
    charts.peak = new Chart(ctx, {
        type: 'line',
        data: {
            labels: hours,
            datasets: [{
                label: 'Peak Load (MW)',
                data: peaks,
                borderColor: '#ffc000',
                backgroundColor: 'rgba(255,192,0,0.1)',
                fill: true,
                tension: 0.4
            }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function updateDashboardKPIs() {
    const c = currentState;
    document.getElementById('kpi-demand').textContent = (c.total_demand || 0).toFixed(0);
    document.getElementById('kpi-supplied').textContent = (c.supplied || 0).toFixed(0);
    document.getElementById('kpi-soc').textContent = (c.battery_energy || 50).toFixed(0);
    document.getElementById('kpi-status').textContent = c.status_code || 'NORMAL';
}

function buildDeviceTable() {
    const devices = [
        {id: 'SENS001', zone: 'Hospital', type: 'Voltage Sensor', status: '✓ Online', last: 'Now', val: '231V'},
        {id: 'SENS002', zone: 'School', type: 'Current Meter', status: '✓ Online', last: '2s', val: '45A'},
        {id: 'SENS003', zone: 'Industry', type: 'Power Analyzer', status: '✓ Online', last: '1s', val: '120kW'},
        {id: 'SENS004', zone: 'Residential', type: 'Energy Counter', status: '✓ Online', last: '3s', val: '2.5kWh'}
    ];
    
    const tbody = document.getElementById('device-tbody');
    tbody.innerHTML = devices.map(d => `
        <tr>
            <td classname="mono">${d.id}</td>
            <td>${d.zone}</td>
            <td>${d.type}</td>
            <td>${d.status}</td>
            <td classname="mono">${d.last}</td>
            <td classname="mono"><strong>${d.val}</strong></td>
        </tr>
    `).join('');
}

function buildScheduleTable() {
    const schedule = [
        {time: '14:00', event: 'Peak Demand Expected', zone: 'Residential', action: 'Prepare'},
        {time: '16:00', event: 'Battery Charging', zone: 'BESS', action: 'Auto'},
        {time: '18:00', event: 'Evening Load Peak', zone: 'All', action: 'Monitor'},
        {time: '22:00', event: 'Night Mode', zone: 'Residential', action: 'Reduce'}
    ];
    
    const tbody = document.getElementById('schedule-tbody');
    tbody.innerHTML = schedule.map(s => `
        <tr>
            <td><strong>${s.time}</strong></td>
            <td>${s.event}</td>
            <td>${s.zone}</td>
            <td>${s.action}</td>
        </tr>
    `).join('');
}

function renderAlerts() {
    const alerts = [
        {type: 'info', icon: '📊', msg: 'Grid operating normally', time: 'Now'},
        {type: 'warn', icon: '⚠️', msg: 'Battery SoC below 60%', time: '2m ago'},
        {type: 'success', icon: '✓', msg: 'Load shedding avoided', time: '5m ago'}
    ];
    
    const list = document.getElementById('alerts-list');
    list.innerHTML = alerts.map(a => `
        <div class="alert-item ${a.type}">
            <div class="alert-icon">${a.icon}</div>
            <div class="alert-text">
                <div class="alert-msg">${a.msg}</div>
                <div class="alert-time">${a.time}</div>
            </div>
        </div>
    `).join('');
}

// ── SIMULATION CONTROLS ─────────────────────────────────────────────────────

function setSimulationTime(hour) {
    document.getElementById('sim-time-display').textContent = 
        String(Math.floor(hour)).padStart(2,'0') + ':' + 
        String(Math.floor((hour%1)*60)).padStart(2,'0');
    elSlider.value = hour;
}

function updateSimSpeed(speed) {
    document.getElementById('sim-speed-display').textContent = speed + 'x Speed';
}

function playSimulation() {
    alert('Simulation playback started (Demo)');
}

function pauseSimulation() {
    alert('Simulation paused (Demo)');
}

function resetSimulation() {
    setSimulationTime(6);
}

function setMode(mode) {
    document.getElementById('current-mode').textContent = mode.toUpperCase();
    alert(`Grid mode set to: ${mode.toUpperCase()}`);
}

function updateShedThreshold(val) {
    document.getElementById('shed-value').textContent = val + '%';
}

function simulateZoneFault(zone) {
    alert(`Simulating +50% load spike for ${zone}`);
}

function simulateZoneBlackout(zone) {
    alert(`Simulating blackout condition for ${zone}`);
}

function resetZone(zone) {
    alert(`${zone} zone reset to normal operation`);
}

// ── INITIALIZATION ──────────────────────────────────────────────────────────

animate();

setInterval(() => {
    fetchState().then(() => {
        // Store state for dashboard
        fetch(`${API}/optimize`).then(r => r.json()).then(state => {
            currentState = state;
            
            // Update dashboard elements
            document.getElementById('time-display').textContent = 
                String(Math.floor(state.simulated_hour)).padStart(2,'0') + ':' +
                String(Math.floor((state.simulated_hour%1)*60)).padStart(2,'0');
            
            // Update KPIs
            const demand = state.total_demand || 0;
            const supplied = state.supplied || 100;
            document.getElementById('kpi-demand').textContent = demand.toFixed(0);
            document.getElementById('kpi-supplied').textContent = supplied.toFixed(0);
            document.getElementById('kpi-soc').textContent = (state.battery_energy || 50).toFixed(0);
            document.getElementById('kpi-status').textContent = state.status_code || 'NORMAL';
            
            // Update zone load bars
            const zones = ['hospital', 'school', 'industry', 'residential'];
            zones.forEach(z => {
                const load = (state[`demand_${z}`] || 0);
                document.getElementById(`zone-${z}-load`).textContent = load.toFixed(1) + ' MW';
                document.getElementById(`zone-${z}-bar`).style.width = Math.min(100, (load/200)*100) + '%';
            });
            
            // Update battery visuals
            const socPct = (state.battery_energy / 200) * 100;
            document.getElementById('battery-visual').style.width = socPct + '%';
            document.getElementById('battery-pct-text').textContent = socPct.toFixed(0) + '%';
            document.getElementById('battery-energy').textContent = state.battery_energy.toFixed(1);
            
            // Update status dot
            const statusDot = document.getElementById('status-dot');
            if (state.status_code === 'CRITICAL') {
                statusDot.style.background = '#ff4060';
            } else if (state.status_code === 'WARNING') {
                statusDot.style.background = '#ffc000';
            } else {
                statusDot.style.background = '#00ff88';
            }
            
            // Modal updates
            const modal = document.getElementById('zone-modal');
            if (modal.classList.contains('active')) {
                const title = document.getElementById('zone-title').textContent.toLowerCase();
                const zoneId = title.includes('hospital') ? 'hospital' : 
                              title.includes('school') ? 'school' :
                              title.includes('industrial') ? 'industry' :
                              title.includes('residential') ? 'residential' : 'battery';
                openZoneModal(zoneId, currentState);
            }
        }).catch(e => console.warn('Dashboard update failed', e));
    });
}, 1000);

fetchState();
