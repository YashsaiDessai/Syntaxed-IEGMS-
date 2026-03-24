/**
 * app.js - Integrated IEGMS & DERMS Dashboard with 3D Visualization
 * Full integration with multiple pages, charts, and real-time updates
 */

const API = "http://localhost:8000";

// Global state
let currentState = {};
let charts = {};
let currentHour = 6;

// Chart.js defaults
Chart.defaults.color = '#94a3b8';
Chart.defaults.borderColor = 'rgba(255,255,255,0.1)';
Chart.defaults.font.family = "'Inter', sans-serif";
Chart.defaults.font.size = 11;

// ════════════════════════════════════════════════════════════════════════════
// PART 1: 3D VISUALIZATION SETUP
// ════════════════════════════════════════════════════════════════════════════

// Scene Setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0b0f19);
scene.fog = new THREE.Fog(0x0b0f19, 20, 150);

const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 1, 1000);
camera.position.set(-60, 50, 60);
camera.lookAt(10, 0, -10);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

// Get canvas container - with error handling
document.addEventListener('DOMContentLoaded', () => {
    const canvasContainer = document.getElementById('canvas-container');
    if (canvasContainer) {
        canvasContainer.appendChild(renderer.domElement);
    }
}, { once: true });

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// Lighting
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

// Materials
const matGround = new THREE.MeshStandardMaterial({ color: 0x111827 });
const matRoad = new THREE.MeshStandardMaterial({ color: 0x1f2937 });
const matLine = new THREE.MeshBasicMaterial({ color: 0xffffee });
const matRes = new THREE.MeshStandardMaterial({ color: 0x475569 });
const matHosp = new THREE.MeshStandardMaterial({ color: 0xf8fafc });
const matInd = new THREE.MeshStandardMaterial({ color: 0x334155 });
const matFactoryRoof = new THREE.MeshStandardMaterial({ color: 0x1e293b });
const matSchool = new THREE.MeshStandardMaterial({ color: 0xb45309 });
const matBatt = new THREE.MeshStandardMaterial({ color: 0x1e3a8a });

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

const zoneWindows = { hospital: [], school: [], industry: [], residential: [], battery: [] };
const floatingLabels = [];
const clickableZones = { hospital: null, school: null, industry: null, residential: null, battery: null };

// Ground
const ground = new THREE.Mesh(new THREE.BoxGeometry(200, 2, 200), matGround);
ground.position.y = -1;
ground.receiveShadow = true;
scene.add(ground);

// Roads
function createRoad(x, z, w, d) {
    const road = new THREE.Mesh(new THREE.PlaneGeometry(w, d), matRoad);
    road.rotation.x = -Math.PI / 2;
    road.position.set(x, 0.05, z);
    road.receiveShadow = true;
    scene.add(road);
    const isHorizontal = w > d;
    const lineW = isHorizontal ? w * 0.9 : 0.5;
    const lineD = isHorizontal ? 0.5 : d * 0.9;
    const line = new THREE.Mesh(new THREE.PlaneGeometry(lineW, lineD), matLine);
    line.rotation.x = -Math.PI / 2;
    line.position.set(x, 0.08, z);
    scene.add(line);
}

createRoad(15, 0, 100, 8);
createRoad(0, 5, 8, 80);

// Sun sphere
let sunSphere = null;
const matSun = new THREE.MeshBasicMaterial({ color: 0xffffff, emissive: 0xffff00, emissiveIntensity: 1 });
const sunGeo = new THREE.SphereGeometry(3, 32, 32);
sunSphere = new THREE.Mesh(sunGeo, matSun);
sunSphere.position.set(0, 80, 0);
scene.add(sunSphere);

// Trees
function createTree(x, z) {
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x654321 });
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(1, 1.5, 8), trunkMat);
    trunk.position.set(x, 4, z);
    trunk.castShadow = true;
    trunk.receiveShadow = true;
    scene.add(trunk);
    const foliageMat = new THREE.MeshStandardMaterial({ color: 0x228b22 });
    const foliage = new THREE.Mesh(new THREE.SphereGeometry(5, 16, 16), foliageMat);
    foliage.position.set(x, 12, z);
    foliage.castShadow = true;
    foliage.receiveShadow = true;
    scene.add(foliage);
}

createTree(-40, -40); createTree(-30, -45); createTree(-35, -30);
createTree(50, -35); createTree(55, -25); createTree(48, -30);
createTree(40, 35); createTree(35, 40); createTree(45, 38);
createTree(-45, 30); createTree(-38, 35); createTree(-42, 25);

// Utility functions
function addLabel(elementId, x, y, z) {
    floatingLabels.push({ el: document.getElementById(elementId), pos: new THREE.Vector3(x, y, z) });
}

function attachWindows(buildingMesh, w, h, d, windowMat, zoneId) {
    const winGeo = new THREE.PlaneGeometry(1, 1);
    const yOffsets = [];
    for(let i = 2; i < h; i+= 3) yOffsets.push(i - h/2);
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

// Buildings
const hospGroup = new THREE.Group();
const hospMain = new THREE.Mesh(new THREE.BoxGeometry(16, 20, 12), matHosp);
hospMain.position.set(-20, 10, -20);
hospMain.castShadow = true; hospMain.receiveShadow = true;
hospMain.userData = { zoneId: "hospital" };
attachWindows(hospMain, 16, 20, 12, matWinHosp, "hospital");
hospGroup.add(hospMain);
scene.add(hospGroup);
clickableZones.hospital = hospMain;
addLabel('label-hospital', -20, 28, -20);

let residentialMainBuilding = null;
for(let rx = 15; rx <= 45; rx += 10) {
    for(let rz = -35; rz <= -10; rz += 10) {
        const w = 6, h = 6, d = 6;
        const house = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), matRes);
        house.position.set(rx, h/2, rz);
        house.castShadow = true; house.receiveShadow = true;
        house.userData = { zoneId: "residential" };
        attachWindows(house, w, h, d, matWinRes, "residential");
        if(!residentialMainBuilding) residentialMainBuilding = house;
        scene.add(house);
    }
}
clickableZones.residential = residentialMainBuilding;
addLabel('label-residential', 30, 10, -20);

const factory = new THREE.Mesh(new THREE.BoxGeometry(12, 8, 20), matInd);
factory.position.set(-20, 4, 20);
factory.castShadow = true; factory.receiveShadow = true;
factory.userData = { zoneId: "industry" };
attachWindows(factory, 12, 8, 20, matWinInd, "industry");
scene.add(factory);
clickableZones.industry = factory;
const s1 = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 2, 12), matFactoryRoof);
s1.position.set(-22, 12, 15); s1.castShadow=true; scene.add(s1);
const s2 = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 2, 12), matFactoryRoof);
s2.position.set(-22, 12, 23); s2.castShadow=true; scene.add(s2);
addLabel('label-industry', -20, 18, 20);

const school = new THREE.Mesh(new THREE.BoxGeometry(20, 6, 8), matSchool);
school.position.set(25, 3, 20);
school.castShadow = true; school.receiveShadow = true;
school.userData = { zoneId: "school" };
attachWindows(school, 20, 6, 8, matWinSchool, "school");
scene.add(school);
clickableZones.school = school;
addLabel('label-school', 25, 12, 20);

const battMesh = new THREE.Mesh(new THREE.BoxGeometry(6, 6, 6), matBatt);
battMesh.position.set(-8, 3, -2);
battMesh.castShadow = true; battMesh.receiveShadow = true;
battMesh.userData = { zoneId: "battery" };
attachWindows(battMesh, 6, 6, 6, matWinBatt, "battery");
scene.add(battMesh);
clickableZones.battery = battMesh;
addLabel('label-battery', -8, 10, -2);

// 3D Camera & Raycasting
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

window.addEventListener('click', (event) => {
    if (event.target !== renderer.domElement) return;
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const clickableObjects = Object.values(clickableZones).filter(z => z !== null);
    const intersects = raycaster.intersectObjects(clickableObjects);
    if (intersects.length > 0) {
        let clickedZone = null;
        let obj = intersects[0].object;
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

// ════════════════════════════════════════════════════════════════════════════
// PART 2: PAGE & VIEW NAVIGATION
// ════════════════════════════════════════════════════════════════════════════

function showViewMode(mode) {
    document.querySelectorAll('.view-mode').forEach(el => el.classList.remove('active'));
    const viewEl = document.getElementById(`view-${mode}`);
    if (viewEl) viewEl.classList.add('active');
    document.querySelectorAll('.nav-tab').forEach(btn => btn.classList.remove('active'));
    if (event && event.target) event.target.classList.add('active');
    if (mode === 'visualization') {
        window.setTimeout(() => window.dispatchEvent(new Event('resize')), 100);
    }
}

function showPage(pageId) {
    document.querySelectorAll('.view-mode').forEach(el => el.classList.remove('active'));
    document.getElementById('dashboard-container').classList.add('active');
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const pageEl = document.getElementById(`page-${pageId}`);
    if (pageEl) pageEl.classList.add('active');
    document.querySelectorAll('.nav-tab').forEach(btn => btn.classList.remove('active'));
    if (event && event.target) event.target.classList.add('active');
    window.setTimeout(() => {
        if (pageId === 'dashboard') {
            buildEnergyChart(); buildSocChart(); buildMixChart(); updateDashboardKPIs();
        } else if (pageId === 'monitoring') {
            buildNodeMap(); buildSensorChart(); buildDeviceTable();
        } else if (pageId === 'forecast') {
            buildForecastChart(); buildErrorChart();
        } else if (pageId === 'battery') {
            buildSocChart(); buildWeeklyChart(); buildSavingsChart();
        } else if (pageId === 'control') {
            buildScheduleTable(); renderAlerts();
        } else if (pageId === 'simulation') {
            buildPeakChart();
        }
    }, 200);
}

// ════════════════════════════════════════════════════════════════════════════
// PART 3: CHART BUILDERS
// ════════════════════════════════════════════════════════════════════════════

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
    if (tbody) {
        tbody.innerHTML = devices.map(d => `
            <tr>
                <td class="mono">${d.id}</td>
                <td>${d.zone}</td>
                <td>${d.type}</td>
                <td>${d.status}</td>
                <td class="mono">${d.last}</td>
                <td class="mono"><strong>${d.val}</strong></td>
            </tr>
        `).join('');
    }
}

function buildScheduleTable() {
    const schedule = [
        {time: '14:00', event: 'Peak Demand Expected', zone: 'Residential', action: 'Prepare'},
        {time: '16:00', event: 'Battery Charging', zone: 'BESS', action: 'Auto'},
        {time: '18:00', event: 'Evening Load Peak', zone: 'All', action: 'Monitor'},
        {time: '22:00', event: 'Night Mode', zone: 'Residential', action: 'Reduce'}
    ];
    const tbody = document.getElementById('schedule-tbody');
    if (tbody) {
        tbody.innerHTML = schedule.map(s => `
            <tr>
                <td><strong>${s.time}</strong></td>
                <td>${s.event}</td>
                <td>${s.zone}</td>
                <td>${s.action}</td>
            </tr>
        `).join('');
    }
}

function renderAlerts() {
    const alerts = [
        {type: 'info', icon: '📊', msg: 'Grid operating normally', time: 'Now'},
        {type: 'warn', icon: '⚠️', msg: 'Battery SoC below 60%', time: '2m ago'},
        {type: 'success', icon: '✓', msg: 'Load shedding avoided', time: '5m ago'}
    ];
    const list = document.getElementById('alerts-list');
    if (list) {
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
}

// ════════════════════════════════════════════════════════════════════════════
// PART 4: SIMULATION & CONTROL FUNCTIONS
// ════════════════════════════════════════════════════════════════════════════

function setSimulationTime(hour) {
    document.getElementById('sim-time-display').textContent = 
        String(Math.floor(hour)).padStart(2,'0') + ':' + 
        String(Math.floor((hour%1)*60)).padStart(2,'0');
    const elSlider = document.getElementById('time-slider');
    if (elSlider) elSlider.value = hour;
}

function updateSimSpeed(speed) {
    document.getElementById('sim-speed-display').textContent = speed + 'x Speed';
}

function playSimulation() { alert('Simulation playback started (Demo)'); }
function pauseSimulation() { alert('Simulation paused (Demo)'); }
function resetSimulation() { setSimulationTime(6); }
function setMode(mode) { document.getElementById('current-mode').textContent = mode.toUpperCase(); }
function updateShedThreshold(val) { document.getElementById('shed-value').textContent = val + '%'; }
function simulateZoneFault(zone) { alert(`Simulating +50% load spike for ${zone}`); }
function simulateZoneBlackout(zone) { alert(`Simulating blackout condition for ${zone}`); }
function resetZone(zone) { alert(`${zone} zone reset to normal operation`); }

// ════════════════════════════════════════════════════════════════════════════
// PART 5: 3D VISUALIZATION & ZONE MODAL
// ════════════════════════════════════════════════════════════════════════════

function generateZoneDashboard(zoneId, state) {
    const zoneData = {
        hospital: {
            title: '🏥 Hospital Zone Details',
            demand: state.total_demand || 0,
            supplied: state.supplied || 0,
            operatingHours: '24/7',
            priority: 'CRITICAL',
            details: ['Intensive Care', 'Emergency Dept', 'Surgical Suite']
        },
        school: {
            title: '🏫 School Zone Details',
            demand: (state.total_demand || 0) * 0.3,
            supplied: (state.supplied || 0) * 0.3,
            operatingHours: '08:00 - 17:00',
            priority: 'HIGH',
            details: ['Classrooms', 'HVAC System', 'Computer Lab']
        },
        industry: {
            title: '🏭 Industrial Zone Details',
            demand: (state.total_demand || 0) * 0.4,
            supplied: (state.supplied || 0) * 0.4,
            operatingHours: '06:00 - 18:00',
            priority: 'MEDIUM',
            details: ['Machine Ops', 'Conveyor Systems', 'Quality Control']
        },
        residential: {
            title: '🏘️ Residential Zone Details',
            demand: (state.total_demand || 0) * 0.3,
            supplied: (state.supplied || 0) * 0.3,
            operatingHours: '24/7 Variable',
            priority: 'LOW',
            details: ['Homes', 'HVAC', 'Cooking', 'Entertainment']
        },
        battery: {
            title: '🔋 Battery Storage System',
            demand: state.battery_energy || 0,
            supplied: state.battery_delta || 0,
            operatingHours: 'On Demand',
            priority: 'CRITICAL',
            details: ['Li-Ion Cells', 'Power Conditioning', 'Safety Systems']
        }
    };
    
    const zone = zoneData[zoneId];
    if (!zone) return '<div>Zone not found</div>';
    
    return `
        <div class="zone-dashboard">
            <div class="zone-section">
                <h3>${zone.title}</h3>
                <div class="zone-stat">
                    <span class="zone-stat-label">Operating Hours</span>
                    <span class="zone-stat-value">${zone.operatingHours}</span>
                </div>
                <div class="zone-stat">
                    <span class="zone-stat-label">Priority Level</span>
                    <span class="zone-stat-value" style="color: ${zone.priority === 'CRITICAL' ? '#ef4444' : zone.priority === 'HIGH' ? '#f59e0b' : '#22c55e'}">${zone.priority}</span>
                </div>
            </div>
            <div class="zone-section">
                <h3>Power Metrics</h3>
                <div class="zone-stat">
                    <span class="zone-stat-label">Current Demand</span>
                    <span class="zone-stat-value">${zone.demand.toFixed(1)} MW</span>
                </div>
                <div class="zone-stat">
                    <span class="zone-stat-label">Power Supplied</span>
                    <span class="zone-stat-value">${zone.supplied.toFixed(1)} MW</span>
                </div>
            </div>
            <div class="zone-section">
                <h3>Infrastructure</h3>
                ${zone.details.map(d => `<div style="padding: 6px 0; color: #e2e8f0; font-size: 0.9rem;">▪ ${d}</div>`).join('')}
            </div>
        </div>
    `;
}

function openZoneModal(zoneId, state) {
    const modal = document.getElementById('zone-modal');
    const modalTitle = document.getElementById('zone-title');
    const modalContent = document.getElementById('zone-modal-content');
    if (!modal || !modalTitle || !modalContent) return;
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
    if (modal) modal.classList.remove('active');
}

// ════════════════════════════════════════════════════════════════════════════
// PART 6: 3D ANIMATION & BACKEND SYNC
// ════════════════════════════════════════════════════════════════════════════

const elClock = document.getElementById('clock-display');
const elSlider = document.getElementById('time-slider');
const elStatus = document.getElementById('grid-status');
const elBatt = document.getElementById('batt-val');
const elBattMeter = document.getElementById('batt-meter');
const elDemand = document.getElementById('demand-val');
const elDemandMeter = document.getElementById('demand-meter');
const elLog = document.getElementById('action-log');
const elActHospital = document.getElementById('act-hospital');
const elActSchool = document.getElementById('act-school');
const elActIndustry = document.getElementById('act-industry');
const elActResidential = document.getElementById('act-residential');

function updateTimeOfDay(hour) {
    currentHour = hour;
    const sunY = 50 + Math.sin((hour / 24) * Math.PI) * 40;
    const sunX = -40 + (hour / 24) * 80;
    if (sunSphere) sunSphere.position.set(sunX, sunY, 0);
    const sunlight = 0.3 + Math.sin((hour / 24) * Math.PI) * 0.9;
    sunLight.intensity = sunlight;
    const skyColor = Math.sin((hour / 24) * Math.PI);
    scene.background.setHSL(0.6, 0.4, 0.1 + skyColor * 0.4);
}

function updateWindowLighting(zone, state) {
    if (!windowMats[zone]) return;
    const isActive = (zone === 'hospital') || 
                     (zone === 'school' && currentHour >= 8 && currentHour < 17) ||
                     (zone === 'industry' && currentHour >= 6 && currentHour < 18);
    if (isActive) {
        windowMats[zone].emissiveIntensity = 0.8;
    } else {
        windowMats[zone].emissiveIntensity = 0.2;
    }
}

function updateActivityStatus(hour) {
    if (hour >= 8 && hour < 17) {
        elActSchool.textContent = "📚 Classes Active";
        elActSchool.className = "act-active";
    } else {
        elActSchool.textContent = "🏫 Closed";
        elActSchool.className = "act-idle";
    }
    
    if (hour >= 6 && hour < 18) {
        elActIndustry.textContent = "🏭 Operating";
        elActIndustry.className = "act-active";
    } else {
        elActIndustry.textContent = "🏭 Idle";
        elActIndustry.className = "act-idle";
    }
    
    if (hour >= 23 || hour < 6) {
        elActResidential.textContent = "😴 Sleeping";
        elActResidential.className = "act-idle";
    } else if (hour >= 6 && hour < 8) {
        elActResidential.textContent = "🌅 Morning Rush";
        elActResidential.className = "act-busy";
    } else if (hour >= 18 && hour < 22) {
        elActResidential.textContent = "🍳 Evening Peak";
        elActResidential.className = "act-busy";
    } else {
        elActResidential.textContent = "💼 Active";
        elActResidential.className = "act-idle";
    }
}

const tempV = new THREE.Vector3();
function animate() {
    requestAnimationFrame(animate);
    const t = Date.now() * 0.0005;
    camera.position.x = -60 + Math.sin(t) * 5;
    camera.position.z = 60 + Math.cos(t) * 5;
    camera.lookAt(10, 0, -10);
    
    floatingLabels.forEach(label => {
        if (!label.el) return;
        tempV.copy(label.pos);
        tempV.project(camera);
        const x = (tempV.x * 0.5 + 0.5) * window.innerWidth;
        const y = (tempV.y * -0.5 + 0.5) * window.innerHeight;
        label.el.style.left = x + 'px';
        label.el.style.top = y + 'px';
    });
    
    renderer.render(scene, camera);
}

async function fetchState() {
    try {
        const res = await fetch(`${API}/optimize`);
        if (!res.ok) return;
        const state = await res.json();
        if (!state || Object.keys(state).length === 0) return;
        
        currentState = state;
        const hr = state.simulated_hour !== undefined ? state.simulated_hour : 6.0;
        const mins = Math.floor((hr % 1) * 60).toString().padStart(2, '0');
        const hrs = Math.floor(hr).toString().padStart(2, '0');
        
        if (elClock) elClock.textContent = `${hrs}:${mins}`;
        if (elSlider && document.activeElement !== elSlider) elSlider.value = hr;
        
        updateTimeOfDay(hr);
        updateActivityStatus(hr);
        
        if (elStatus) {
            elStatus.textContent = state.status_code;
            elStatus.className = "status-" + state.status_code.toLowerCase();
        }
        
        if (elBatt) elBatt.textContent = state.battery_energy.toFixed(1);
        if (elBattMeter) elBattMeter.style.width = `${(state.battery_energy / 200) * 100}%`;
        
        if (state.battery_delta > 0) {
            windowMats.battery.emissive.setHex(0x22c55e);
            windowMats.battery.emissiveIntensity = 1;
        } else if (state.battery_delta < 0) {
            windowMats.battery.emissive.setHex(0x3b82f6);
            windowMats.battery.emissiveIntensity = 1;
        } else {
            windowMats.battery.emissiveIntensity = 0.1;
        }
        
        if (elDemand) elDemand.textContent = state.total_demand.toFixed(1);
        if (elDemandMeter) elDemandMeter.style.width = `${Math.min(100, (state.total_demand / 350) * 100)}%`;
        
        ["hospital", "school", "industry", "residential"].forEach(z => updateWindowLighting(z, state));
        
        if (state.actions && state.actions.length > 0 && elLog) {
            elLog.innerHTML = state.actions.map(a => `<li>${a}</li>`).join("");
        }
        
        // Update dashboard if visible
        document.getElementById('time-display').textContent = `${hrs}:${mins}`;
        
    } catch (e) {
        console.warn("Backend poll failed", e);
    }
}

// Zone modal outside click handler
const zoneModal = document.getElementById('zone-modal');
if (zoneModal) {
    zoneModal.addEventListener('click', (e) => {
        if (e.target.id === 'zone-modal') closeZoneModal();
    });
}

// ════════════════════════════════════════════════════════════════════════════
// PART 7: INITIALIZATION & EVENT LISTENERS
// ════════════════════════════════════════════════════════════════════════════

// Add slider event listeners
if (elSlider) {
    elSlider.addEventListener("input", (e) => {
        const hr = parseFloat(e.target.value);
        updateTimeOfDay(hr);
        const mins = Math.floor((hr % 1) * 60).toString().padStart(2, '0');
        const hrs = Math.floor(hr).toString().padStart(2, '0');
        if (elClock) elClock.textContent = `${hrs}:${mins}`;
    });
    
    elSlider.addEventListener("change", async (e) => {
        const hr = parseFloat(e.target.value);
        await fetch(`${API}/set_time`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ hour: hr })
        });
    });
}

// Start animation loop
animate();

// Poll backend every 1 second
setInterval(fetchState, 1000);
fetchState();
