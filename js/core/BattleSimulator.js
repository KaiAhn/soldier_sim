// Battle Simulator - Main game loop and simulation management
class BattleSimulator {
    constructor() {
        this.canvas = document.getElementById('battleCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.logContainer = document.getElementById('logContainer');
        
        this.units = [];
        this.running = false;
        this.paused = false;
        this.lastTime = 0;
        this.timeScale = 1.0;
        this.elapsedTime = 0;

        // Camera system
        this.cameraX = 0;
        this.cameraY = 0;
        this.cameraZoom = 1.0;
        this.minZoom = 0.1;
        this.maxZoom = 3.0;
        this.cameraSpeed = 300; // pixels per second
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.dragCameraStartX = 0;
        this.dragCameraStartY = 0;
        this.keysPressed = {}; // For arrow key navigation

        this.settingsManager = new SettingsManager();
        this.initPresets();
        this.setupAutoSave();
        this.setupCamera();
        this.resize();
        window.addEventListener('resize', () => this.resize());
        
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space') { e.preventDefault(); this.togglePause(); }
            // Arrow keys
            if (e.code === 'ArrowLeft' || e.code === 'ArrowRight' || 
                e.code === 'ArrowUp' || e.code === 'ArrowDown') {
                this.keysPressed[e.code] = true;
                e.preventDefault();
            }
        });
        
        window.addEventListener('keyup', (e) => {
            if (e.code === 'ArrowLeft' || e.code === 'ArrowRight' || 
                e.code === 'ArrowUp' || e.code === 'ArrowDown') {
                this.keysPressed[e.code] = false;
            }
        });
        
        // Start render loop for camera (even when not running)
        this.lastTime = performance.now();
        requestAnimationFrame((t) => this.loop(t));
    }

    setupCamera() {
        // Mouse drag
        this.canvas.addEventListener('mousedown', (e) => {
            if (e.button === 0) { // Left mouse button
                this.isDragging = true;
                this.dragStartX = e.clientX;
                this.dragStartY = e.clientY;
                this.dragCameraStartX = this.cameraX;
                this.dragCameraStartY = this.cameraY;
                this.canvas.style.cursor = 'grabbing';
            }
        });

        this.canvas.addEventListener('mousemove', (e) => {
            if (this.isDragging) {
                const deltaX = e.clientX - this.dragStartX;
                const deltaY = e.clientY - this.dragStartY;
                this.cameraX = this.dragCameraStartX + deltaX;
                this.cameraY = this.dragCameraStartY + deltaY;
            }
        });

        this.canvas.addEventListener('mouseup', (e) => {
            if (e.button === 0) {
                this.isDragging = false;
                this.canvas.style.cursor = 'default';
            }
        });

        this.canvas.addEventListener('mouseleave', () => {
            this.isDragging = false;
            this.canvas.style.cursor = 'default';
        });

        // Touch support (for mobile)
        this.canvas.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                const touch = e.touches[0];
                this.isDragging = true;
                this.dragStartX = touch.clientX;
                this.dragStartY = touch.clientY;
                this.dragCameraStartX = this.cameraX;
                this.dragCameraStartY = this.cameraY;
            }
            e.preventDefault();
        });

        this.canvas.addEventListener('touchmove', (e) => {
            if (this.isDragging && e.touches.length === 1) {
                const touch = e.touches[0];
                const deltaX = touch.clientX - this.dragStartX;
                const deltaY = touch.clientY - this.dragStartY;
                this.cameraX = this.dragCameraStartX + deltaX;
                this.cameraY = this.dragCameraStartY + deltaY;
            }
            e.preventDefault();
        });

        this.canvas.addEventListener('touchend', (e) => {
            this.isDragging = false;
            e.preventDefault();
        });

        // Mouse wheel zoom
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            
            const zoomFactor = 0.1;
            const delta = e.deltaY > 0 ? -zoomFactor : zoomFactor;
            const newZoom = Math.max(this.minZoom, Math.min(this.maxZoom, this.cameraZoom + delta));
            
            if (newZoom !== this.cameraZoom) {
                // Zoom towards mouse position
                const rect = this.canvas.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                const mouseY = e.clientY - rect.top;
                
                // Convert screen coordinates to world coordinates
                const worldX = (mouseX - this.cameraX) / this.cameraZoom;
                const worldY = (mouseY - this.cameraY) / this.cameraZoom;
                
                // Update zoom
                const oldZoom = this.cameraZoom;
                this.cameraZoom = newZoom;
                
                // Adjust camera position so the point under the mouse stays in the same screen position
                const newWorldX = (mouseX - this.cameraX) / this.cameraZoom;
                const newWorldY = (mouseY - this.cameraY) / this.cameraZoom;
                this.cameraX += (newWorldX - worldX) * this.cameraZoom;
                this.cameraY += (newWorldY - worldY) * this.cameraZoom;
            }
        }, { passive: false });
    }

    updateCamera(dt) {
        // Arrow key navigation (speed adjusted by zoom level)
        const moveSpeed = this.cameraSpeed / this.cameraZoom;
        if (this.keysPressed['ArrowLeft']) {
            this.cameraX -= moveSpeed * dt;
        }
        if (this.keysPressed['ArrowRight']) {
            this.cameraX += moveSpeed * dt;
        }
        if (this.keysPressed['ArrowUp']) {
            this.cameraY -= moveSpeed * dt;
        }
        if (this.keysPressed['ArrowDown']) {
            this.cameraY += moveSpeed * dt;
        }
    }

    setupAutoSave() {
        const inputIds = [
            'count_A', 'hp_A', 'atk_A', 'as_A', 'rng_A', 'spd_A', 'shd_A', 'arm_A', 'mst_A', 'mor_A', 'mass_A',
            'count_B', 'hp_B', 'atk_B', 'as_B', 'rng_B', 'spd_B', 'shd_B', 'arm_B', 'mst_B', 'mor_B', 'mass_B',
            'preset_A', 'preset_B',
            'cfg_atk_prob_max', 'cfg_atk_prob_min', 'cfg_morale_threshold', 'cfg_morale_inf', 'cfg_stamina_inf',
            'cfg_base_evade', 'cfg_evade_bonus', 'cfg_shield_pen', 'cfg_armor_pen', 'cfg_def_bonus',
            'cfg_shield_base_mult', 'cfg_armor_base_mult', 'cfg_defending_bonus', 'cfg_defending_duration', 'cfg_damage_reduction', 'cfg_pre_delay', 'cfg_interval_evade', 'cfg_interval_block',
            'cfg_attack_cost', 'cfg_evade_cost', 'cfg_stamina_regen', 'cfg_interval_stamina_bonus', 'cfg_enemy_block_area', 'cfg_enemy_max_slow',
            'cfg_ally_pass_area', 'cfg_ally_max_slow', 'cfg_knockback_max_dist', 'cfg_death_knockback_mult',
            'cfg_knockback_force_mult', 'cfg_knockback_decay', 'cfg_knockback_collision_threshold'
        ];

        inputIds.forEach(id => {
            const elem = document.getElementById(id);
            if (elem) {
                elem.addEventListener('change', () => {
                    this.settingsManager.saveCurrentSettings();
                });
                elem.addEventListener('input', () => {
                    clearTimeout(elem._saveTimeout);
                    elem._saveTimeout = setTimeout(() => {
                        this.settingsManager.saveCurrentSettings();
                    }, 500);
                });
            }
        });
    }

    updatePresetSelectors() {
        const selA = document.getElementById('preset_A');
        const selB = document.getElementById('preset_B');
        
        selA.innerHTML = '<option value="">선택...</option>';
        selB.innerHTML = '<option value="">선택...</option>';
        
        for (let name in UNIT_PRESETS) {
            let optA = document.createElement('option');
            optA.value = name; optA.innerText = name;
            selA.appendChild(optA);
            
            let optB = document.createElement('option');
            optB.value = name; optB.innerText = name;
            selB.appendChild(optB);
        }
    }

    async initPresets() {
        this.updatePresetSelectors();
        
        // Try to load settings from file or LocalStorage
        const loaded = await this.settingsManager.loadFromFile();
        if (loaded) {
            this.settingsManager.applySettings();
            // If preset is selected in settings, load it
            const settings = this.settingsManager.getSettings();
            if (settings && settings.teamA && settings.teamA.selectedPreset) {
                // Preset is already applied via applySettings, but we ensure it's selected
                const presetA = document.getElementById('preset_A');
                if (presetA && presetA.value !== settings.teamA.selectedPreset) {
                    presetA.value = settings.teamA.selectedPreset;
                }
            }
            if (settings && settings.teamB && settings.teamB.selectedPreset) {
                const presetB = document.getElementById('preset_B');
                if (presetB && presetB.value !== settings.teamB.selectedPreset) {
                    presetB.value = settings.teamB.selectedPreset;
                }
            }
        } else {
            // Fallback to default values
            this.loadPreset('A', '징집병');
            this.loadPreset('B', '중보병');
            this.settingsManager.saveCurrentSettings();
        }
    }

    loadPreset(team, presetName) {
        if (!presetName) return;
        const stats = UNIT_PRESETS[presetName];
        const setVal = (id, val) => {
            const elem = document.getElementById(id);
            if (elem) elem.value = val;
        };
        
        setVal(`preset_${team}`, presetName);
        setVal(`hp_${team}`, stats.hp);
        setVal(`atk_${team}`, stats.atk);
        setVal(`as_${team}`, stats.as);
        setVal(`rng_${team}`, stats.rng);
        setVal(`spd_${team}`, stats.spd);
        setVal(`shd_${team}`, stats.shd);
        setVal(`arm_${team}`, stats.arm);
        setVal(`mst_${team}`, stats.mst);
        setVal(`mor_${team}`, stats.mor);
        if (stats.mass !== undefined) {
            setVal(`mass_${team}`, stats.mass);
        }
        
        this.settingsManager.saveCurrentSettings();
    }

    resize() {
        this.canvas.width = this.canvas.parentElement.clientWidth;
        this.canvas.height = this.canvas.parentElement.clientHeight;
        this.render();
    }

    log(msg, className = '') {
        const time = `[${(this.elapsedTime).toFixed(1)}s] `;
        const div = document.createElement('div');
        div.className = `log-entry ${className}`;
        div.innerHTML = `<span class="text-slate-500 text-[10px]">${time}</span> ${msg}`;
        this.logContainer.appendChild(div);
        this.logContainer.scrollTop = this.logContainer.scrollHeight;
    }

    getStats(team) {
        const stats = {
            hp: Number(document.getElementById(`hp_${team}`).value),
            atk: Number(document.getElementById(`atk_${team}`).value),
            as: Number(document.getElementById(`as_${team}`).value),
            rng: Number(document.getElementById(`rng_${team}`).value),
            spd: Number(document.getElementById(`spd_${team}`).value),
            shd: Number(document.getElementById(`shd_${team}`).value),
            arm: Number(document.getElementById(`arm_${team}`).value),
            mst: Number(document.getElementById(`mst_${team}`).value),
            mor: Number(document.getElementById(`mor_${team}`).value),
        };
        
        // 병종별 질량 자동 계산 (인간 기본 질량 10 + 장비 질량)
        // 프리셋에서 가져오거나, 없으면 UI 값 또는 계산값 사용
        const presetSelect = document.getElementById(`preset_${team}`);
        const presetName = presetSelect ? presetSelect.value : null;
        if (presetName && UNIT_PRESETS[presetName] && UNIT_PRESETS[presetName].mass) {
            stats.mass = UNIT_PRESETS[presetName].mass;
        } else {
            // UI에서 직접 입력한 값이 있으면 사용
            const uiMass = Number(document.getElementById(`mass_${team}`).value);
            if (uiMass && uiMass > 0) {
                stats.mass = uiMass;
            } else {
                // 기본값: 인간 기본 질량 10 + 방패와 갑옷을 고려한 장비 질량
                const baseHumanMass = 10;
                const equipmentMass = 1 + (stats.shd * 0.5) + (stats.arm * 0.3);
                stats.mass = baseHumanMass + equipmentMass;
            }
        }
        
        return stats;
    }

    applyStats() {
        this.reset();
        const cx = this.canvas.width / 2;
        const cy = this.canvas.height / 2;
        
        const statsA = this.getStats('A');
        const statsB = this.getStats('B');
        const countA = Math.max(1, Math.min(10, Number(document.getElementById('count_A').value) || 1));
        const countB = Math.max(1, Math.min(10, Number(document.getElementById('count_B').value) || 1));
        
        const spawnDist = (statsA.rng * RANGE_SCALE) + (statsB.rng * RANGE_SCALE) + 100;
        
        this.units = [];
        let unitId = 1;
        
        const spacingA = 50;
        const startYA = cy - ((countA - 1) * spacingA / 2);
        for (let i = 0; i < countA; i++) {
            const unit = new Unit(unitId++, 'A', cx - spawnDist/2, startYA + i * spacingA, statsA);
            unit.angle = 0;
            this.units.push(unit);
        }
        
        const spacingB = 50;
        const startYB = cy - ((countB - 1) * spacingB / 2);
        for (let i = 0; i < countB; i++) {
            const unit = new Unit(unitId++, 'B', cx + spawnDist/2, startYB + i * spacingB, statsB);
            unit.angle = Math.PI;
            this.units.push(unit);
        }
        
        this.log(`전투 시작 (Blue: ${countA}명 vs Red: ${countB}명)`, "font-bold text-center mt-2 mb-2 bg-slate-700");
        this.start();
    }
    
    findNearestEnemy(unit) {
        let nearest = null;
        let nearestDist = Infinity;
        
        for (let enemy of this.units) {
            if (enemy.team === unit.team || enemy.state === STATES.DEAD) continue;
            
            const dist = unit.distanceTo(enemy);
            if (dist < nearestDist) {
                nearestDist = dist;
                nearest = enemy;
            }
        }
        
        return nearest;
    }

    start() {
        if (this.running) return;
        this.running = true;
        this.paused = false;
        this.lastTime = performance.now();
        document.getElementById('winnerOverlay').classList.add('hidden');
        requestAnimationFrame((t) => this.loop(t));
    }

    reset() {
        this.running = false;
        this.elapsedTime = 0;
        this.units = [];
        this.cameraX = 0;
        this.cameraY = 0;
        this.cameraZoom = 1.0;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.logContainer.innerHTML = '';
        document.getElementById('btnPause').innerText = "일시정지";
        document.getElementById('winnerOverlay').classList.add('hidden');
    }

    togglePause() {
        this.paused = !this.paused;
        const btn = document.getElementById('btnPause');
        btn.innerText = this.paused ? "재개" : "일시정지";
        btn.classList.toggle('bg-yellow-600');
        btn.classList.toggle('bg-green-600');
        if (!this.paused) {
            this.lastTime = performance.now();
            requestAnimationFrame((t) => this.loop(t));
        }
    }

    setSpeed(val) { this.timeScale = parseFloat(val); }

    endGame(winnerTeam) {
        this.running = false;
        const overlay = document.getElementById('winnerOverlay');
        const statsDiv = document.getElementById('resultStats');
        overlay.classList.remove('hidden');
        
        const teamAUnits = this.units.filter(u => u.team === 'A');
        const teamBUnits = this.units.filter(u => u.team === 'B');
        
        let statsHTML = '<div class="grid grid-cols-2 gap-4">';
        
        if (teamAUnits.length > 0) {
            const avgHp = teamAUnits.reduce((sum, u) => sum + u.hp, 0) / teamAUnits.length;
            const avgMorale = teamAUnits.reduce((sum, u) => sum + u.morale, 0) / teamAUnits.length;
            const avgStamina = teamAUnits.reduce((sum, u) => sum + u.stamina, 0) / teamAUnits.length;
            const maxHp = teamAUnits[0].maxHp;
            const maxMorale = teamAUnits[0].maxMorale;
            const maxStamina = teamAUnits[0].maxStamina;
            const aliveCount = teamAUnits.filter(u => u.state !== STATES.DEAD).length;
            const isWinner = winnerTeam === 'A';
            
            statsHTML += `<div class="bg-blue-900/50 p-3 rounded border border-blue-700">
                <h3 class="font-bold text-blue-300 mb-2 text-center text-sm">${isWinner ? '승리팀 ' : ''}Blue Team</h3>
                <div class="space-y-1 text-sm">
                    <div class="flex justify-between"><span>생존:</span><span class="font-bold">${aliveCount}명</span></div>
                    <div class="flex justify-between"><span>평균 체력:</span><span class="font-bold">${avgHp.toFixed(1)} / ${maxHp}</span></div>
                    <div class="flex justify-between"><span>평균 사기:</span><span class="font-bold">${avgMorale.toFixed(1)} / ${maxMorale}</span></div>
                    <div class="flex justify-between"><span>평균 스테미너:</span><span class="font-bold">${avgStamina.toFixed(1)} / ${maxStamina}</span></div>
                </div>
            </div>`;
        }
        
        if (teamBUnits.length > 0) {
            const avgHp = teamBUnits.reduce((sum, u) => sum + u.hp, 0) / teamBUnits.length;
            const avgMorale = teamBUnits.reduce((sum, u) => sum + u.morale, 0) / teamBUnits.length;
            const avgStamina = teamBUnits.reduce((sum, u) => sum + u.stamina, 0) / teamBUnits.length;
            const maxHp = teamBUnits[0].maxHp;
            const maxMorale = teamBUnits[0].maxMorale;
            const maxStamina = teamBUnits[0].maxStamina;
            const aliveCount = teamBUnits.filter(u => u.state !== STATES.DEAD).length;
            const isWinner = winnerTeam === 'B';
            
            statsHTML += `<div class="bg-red-900/50 p-3 rounded border border-red-700">
                <h3 class="font-bold text-red-300 mb-2 text-center text-sm">${isWinner ? '승리팀 ' : ''}Red Team</h3>
                <div class="space-y-1 text-sm">
                    <div class="flex justify-between"><span>생존:</span><span class="font-bold">${aliveCount}명</span></div>
                    <div class="flex justify-between"><span>평균 체력:</span><span class="font-bold">${avgHp.toFixed(1)} / ${maxHp}</span></div>
                    <div class="flex justify-between"><span>평균 사기:</span><span class="font-bold">${avgMorale.toFixed(1)} / ${maxMorale}</span></div>
                    <div class="flex justify-between"><span>평균 스테미너:</span><span class="font-bold">${avgStamina.toFixed(1)} / ${maxStamina}</span></div>
                </div>
            </div>`;
        }
        
        statsHTML += '</div>';
        statsDiv.innerHTML = statsHTML;
    }

    loop(timestamp) {
        const dtRaw = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;
        const dt = Math.min(dtRaw, 0.1);
        
        // Update camera (always, even when paused)
        this.updateCamera(dt);

        if (!this.running || this.paused) {
            this.render();
            requestAnimationFrame((t) => this.loop(t));
            return;
        }
        
        const dtScaled = dt * this.timeScale;
        this.elapsedTime += dtScaled;

        const config = GlobalConfig.get();
        
        for (let unit of this.units) {
            if (unit.state !== STATES.DEAD) {
                unit.update(dtScaled, this.units, config);
            }
        }
        
        this.resolveCollisions(dtScaled, config);
        
        const teamAAlive = this.units.filter(u => u.team === 'A' && u.state !== STATES.DEAD).length;
        const teamBAlive = this.units.filter(u => u.team === 'B' && u.state !== STATES.DEAD).length;
        
        if (teamAAlive === 0 && teamBAlive > 0) {
            this.endGame('B');
        } else if (teamBAlive === 0 && teamAAlive > 0) {
            this.endGame('A');
        }

        this.render();
        requestAnimationFrame((t) => this.loop(t));
    }
    
    resolveCollisions(dt, config) {
        const maxIterations = 3;
        
        for (let iter = 0; iter < maxIterations; iter++) {
            let hasCollision = false;
            
            for (let i = 0; i < this.units.length; i++) {
                const unitA = this.units[i];
                if (unitA.state === STATES.DEAD) continue;
                
                if (unitA.knockbackVel > config.knockbackCollisionThreshold) continue;
                
                const radiusA = unitA.getOccupancyRadius();
                
                for (let j = i + 1; j < this.units.length; j++) {
                    const unitB = this.units[j];
                    if (unitB.state === STATES.DEAD) continue;
                    
                    if (unitB.knockbackVel > config.knockbackCollisionThreshold) continue;
                    
                    const radiusB = unitB.getOccupancyRadius();
                    const dx = unitB.x - unitA.x;
                    const dy = unitB.y - unitA.y;
                    const dist = Math.hypot(dx, dy);
                    const minDist = radiusA + radiusB;
                    
                    if (dist < minDist && dist > 0) {
                        hasCollision = true;
                        
                        const overlap = minDist - dist;
                        const separationX = (dx / dist) * overlap * 0.5;
                        const separationY = (dy / dist) * overlap * 0.5;
                        
                        const weightA = unitA.mass || 1.0;
                        const weightB = unitB.mass || 1.0;
                        const totalWeight = weightA + weightB;
                        
                        unitA.x -= separationX * (weightB / totalWeight);
                        unitA.y -= separationY * (weightB / totalWeight);
                        unitB.x += separationX * (weightA / totalWeight);
                        unitB.y += separationY * (weightA / totalWeight);
                    }
                }
            }
            
            if (!hasCollision) break;
        }
    }

    render() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Apply camera transform
        ctx.save();
        ctx.translate(this.cameraX, this.cameraY);
        ctx.scale(this.cameraZoom, this.cameraZoom);
        
        // Calculate grid bounds with camera offset and zoom
        const gridSize = 40;
        const visibleWidth = this.canvas.width / this.cameraZoom;
        const visibleHeight = this.canvas.height / this.cameraZoom;
        const cameraWorldX = -this.cameraX / this.cameraZoom;
        const cameraWorldY = -this.cameraY / this.cameraZoom;
        
        // Calculate visible world bounds
        const worldLeft = cameraWorldX - visibleWidth * 0.5;
        const worldRight = cameraWorldX + visibleWidth * 0.5;
        const worldTop = cameraWorldY - visibleHeight * 0.5;
        const worldBottom = cameraWorldY + visibleHeight * 0.5;
        
        // Align grid to gridSize boundaries
        const startX = Math.floor(worldLeft / gridSize) * gridSize;
        const endX = Math.ceil(worldRight / gridSize) * gridSize + gridSize;
        const startY = Math.floor(worldTop / gridSize) * gridSize;
        const endY = Math.ceil(worldBottom / gridSize) * gridSize + gridSize;
        
        // Draw grid
        ctx.strokeStyle = "#334155";
        ctx.lineWidth = 1 / this.cameraZoom; // Scale line width with zoom
        ctx.beginPath();
        for(let i = startX; i <= endX; i += gridSize) {
            ctx.moveTo(i, startY);
            ctx.lineTo(i, endY);
        }
        for(let i = startY; i <= endY; i += gridSize) {
            ctx.moveTo(startX, i);
            ctx.lineTo(endX, i);
        }
        ctx.stroke();

        // Draw target lines
        this.units.forEach(u => {
            if (u.target && u.state !== STATES.DEAD && u.target.state !== STATES.DEAD) {
                ctx.save();
                ctx.strokeStyle = u.team === 'A' ? 'rgba(59, 130, 246, 0.5)' : 'rgba(239, 68, 68, 0.5)';
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 5]);
                ctx.beginPath();
                ctx.moveTo(u.x, u.y);
                ctx.lineTo(u.target.x, u.target.y);
                ctx.stroke();
                ctx.setLineDash([]);
                ctx.restore();
            }
        });

        // Draw units
        this.units.forEach(u => {
            u.draw(ctx);
        });
        
        ctx.restore();
    }
}

