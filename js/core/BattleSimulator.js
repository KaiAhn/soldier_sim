// Battle Simulator - Simulation loop and rendering only
class BattleSimulator {
    constructor(settingsManager) {
        this.canvas = document.getElementById('battleCanvas');
        if (!this.canvas) {
            console.error('BattleSimulator: battleCanvas element not found!');
            return;
        }
        this.ctx = this.canvas.getContext('2d');
        this.logContainer = document.getElementById('logContainer');
        
        this.units = [];
        this.squads = [];
        this.running = false;
        this.paused = false;
        this.lastTime = 0;
        this.timeScale = 1.0;
        this.elapsedTime = 0;

        this.settingsManager = settingsManager; // Reference to SettingsManager
        this.setupAutoSave();
        this.resize();
        window.addEventListener('resize', () => this.resize());
        
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space') { e.preventDefault(); this.togglePause(); }
        });
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

    
    applyStatsAndStart() {
        // SettingsManager가 units를 생성하고, 여기서는 시작만
        this.applyStats();
    }

    resize() {
        if (!this.canvas) return;
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

    applyStats() {
        // 모든 세팅 작업은 SettingsManager에서 처리
        // 여기서는 단순히 SettingsManager가 생성한 units를 받아서 사용
        this.reset();
        this.settingsManager.updateUnits();
        
        const countA = this.units.filter(u => u.team === 'A').length;
        const countB = this.units.filter(u => u.team === 'B').length;
        
        this.log(`전투 시작: Team A (${countA}명) vs Team B (${countB}명)`, 'log-attack font-bold');
        this.start();
    }

    reset() {
        this.units = [];
        this.squads = [];
        this.running = false;
        this.paused = false;
        this.elapsedTime = 0;
        this.logContainer.innerHTML = '';
    }

    start() {
        this.running = true;
        this.lastTime = performance.now();
        this.loop(this.lastTime);
    }

    togglePause() {
        this.paused = !this.paused;
        if (!this.paused && this.running) {
            this.lastTime = performance.now();
            this.loop(this.lastTime);
        }
    }

    setSpeed(speed) {
        this.timeScale = parseFloat(speed) || 1.0;
    }

    endGame(winnerTeam) {
        this.running = false;
        this.paused = false;
        
        const winnerText = winnerTeam === 'A' ? 'Team A 승리!' : 'Team B 승리!';
        this.log(winnerText, 'log-attack font-bold text-yellow-400');
        
        this.showEndGameOverlay(winnerTeam);
    }

    showEndGameOverlay(winnerTeam) {
        const overlay = document.getElementById('winnerOverlay');
        const statsDiv = document.getElementById('resultStats');
        
        if (!overlay || !statsDiv) return;
        
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
        
        overlay.classList.remove('hidden');
    }

    loop(timestamp) {
        if (!this.running || this.paused) return;
        const dtRaw = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;
        const dt = Math.min(dtRaw, 0.1) * this.timeScale;
        this.elapsedTime += dt;

        const config = GlobalConfig.get();
        
        // Update squads (SquadAI, FormationManager)
        for (let squad of this.squads) {
            squad.update(dt, this.squads, config);
        }
        
        for (let unit of this.units) {
            if (unit.state !== STATES.DEAD) {
                unit.update(dt, this.units, config);
            }
        }
        
        this.resolveCollisions(dt, config);
        
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
        
        // 배경 렌더링 (카메라 변환 전에 처리, 카메라 변환 적용하지 않은 컨텍스트에서)
        ctx.save();
        if (this.settingsManager && this.settingsManager.renderBackground) {
            if (this.settingsManager.camera) {
                const camera = this.settingsManager.camera;
                this.settingsManager.renderBackground(ctx, camera.x, camera.y, camera.zoom, camera.showGrid);
            } else {
                // Fallback: 카메라가 없을 때 기본값 사용
                this.settingsManager.renderBackground(ctx, 0, 0, 1.0, false);
            }
        }
        ctx.restore();
        
        // 카메라 변환 적용 (유닛/포메이션 렌더링용)
        ctx.save();
        if (this.settingsManager && this.settingsManager.camera) {
            this.settingsManager.camera.applyTransform(ctx);
        } else {
            // Fallback if camera not initialized
            ctx.translate(this.canvas.width / 2, this.canvas.height / 2);
        }

        // Formation shapes (before units for proper layering)
        this.squads.forEach(squad => {
            if (!squad.formationManager || !squad.currentSlots || squad.currentSlots.length < 3) return;
            
            const points = squad.currentSlots.map(s => ({ x: s.x, y: s.y }));
            const hull = getConvexHull(points);
            
            if (hull.length === 0) return;
            
            ctx.save();
            
            // Transition 중에는 주황색, 아니면 노란색
            const isTransitioning = squad.formationManager.isInTransition();
            ctx.fillStyle = isTransitioning ? "rgba(249, 115, 22, 0.1)" : "rgba(234, 179, 8, 0.15)"; 
            ctx.strokeStyle = isTransitioning ? "rgba(249, 115, 22, 0.5)" : "rgba(234, 179, 8, 0.4)";
            const cameraZoom = this.settingsManager && this.settingsManager.camera ? this.settingsManager.camera.zoom : 1.0;
            ctx.lineWidth = 2 / cameraZoom;
            ctx.setLineDash([5 / cameraZoom, 5 / cameraZoom]);
            
            ctx.beginPath();
            ctx.moveTo(hull[0].x, hull[0].y);
            for (let i = 1; i < hull.length; i++) {
                ctx.lineTo(hull[i].x, hull[i].y);
            }
            ctx.closePath();
            
            ctx.fill(); 
            ctx.stroke();
            ctx.setLineDash([]);
            ctx.restore();
        });

        // 타겟팅 라인
        this.units.forEach(u => {
            if (u.target && u.state !== STATES.DEAD && u.target.state !== STATES.DEAD) {
                ctx.save();
                ctx.strokeStyle = u.team === 'A' ? 'rgba(59, 130, 246, 0.5)' : 'rgba(239, 68, 68, 0.5)';
                const cameraZoom = this.settingsManager && this.settingsManager.camera ? this.settingsManager.camera.zoom : 1.0;
                ctx.lineWidth = 2 / cameraZoom;
                ctx.setLineDash([5 / cameraZoom, 5 / cameraZoom]);
                ctx.beginPath();
                ctx.moveTo(u.x, u.y);
                ctx.lineTo(u.target.x, u.target.y);
                ctx.stroke();
                ctx.setLineDash([]);
                ctx.restore();
            }
        });

        // 유닛 렌더링
        if (this.units.length === 0) {
            console.warn('BattleSimulator.render: No units to render!');
        } else {
            // Debug: 첫 번째 유닛의 위치 확인
            if (this.units.length > 0 && this.units[0]) {
                const firstUnit = this.units[0];
                if (!firstUnit._debugLogged) {
                    console.log('First unit position:', { 
                        x: firstUnit.x, 
                        y: firstUnit.y, 
                        team: firstUnit.team,
                        cameraX: this.settingsManager?.camera?.x,
                        cameraY: this.settingsManager?.camera?.y,
                        cameraZoom: this.settingsManager?.camera?.zoom
                    });
                    firstUnit._debugLogged = true;
                }
            }
        }
        this.units.forEach(u => {
            if (u && typeof u.draw === 'function') {
                u.draw(ctx);
            } else {
                console.warn('BattleSimulator.render: Unit missing or invalid:', u);
            }
        });
        
        ctx.restore();
    }
}