// Settings Manager - Main entry point, handles all settings, setup, and unit creation
class SettingsManager {
    constructor() {
        this.STORAGE_KEY = 'war_sim_settings';
        this.settings = null;
        this.sim = null; // BattleSimulator instance (will be created after initialization)
        this.camera = null; // Camera instance (will be initialized after settings loaded)
        
        // Global references (will be initialized)
        this.UNIT_PRESETS = typeof UNIT_PRESETS !== 'undefined' ? UNIT_PRESETS : {};
        this.GlobalConfig = typeof GlobalConfig !== 'undefined' ? GlobalConfig : null;
        this.FORMATION_TYPES = typeof FORMATION_TYPES !== 'undefined' ? FORMATION_TYPES : {};
    }

    async loadFromFile() {
        try {
            // 캐시 무시를 위해 타임스탬프 추가
            const response = await fetch('settings.json?' + Date.now(), {
                cache: 'no-cache'
            });
            if (!response.ok) throw new Error('Failed to load settings.json');
            this.settings = await response.json();
            console.log('Loaded settings from file:', this.settings);
            this.saveToLocalStorage();
            return this.settings;
        } catch (error) {
            console.warn('Failed to load settings.json, trying LocalStorage:', error);
            const localSettings = this.loadFromLocalStorage();
            if (localSettings) {
                console.log('Loaded settings from LocalStorage:', localSettings);
                return localSettings;
            }
            return null;
        }
    }

    loadFromLocalStorage() {
        try {
            const stored = localStorage.getItem(this.STORAGE_KEY);
            if (stored) {
                this.settings = JSON.parse(stored);
                return this.settings;
            }
        } catch (error) {
            console.warn('Failed to load from LocalStorage:', error);
        }
        return null;
    }

    saveToLocalStorage() {
        if (!this.settings) return;
        try {
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.settings));
        } catch (error) {
            console.warn('Failed to save to LocalStorage:', error);
        }
    }

    getSettings() {
        return this.settings;
    }

    updateSettings(newSettings) {
        this.settings = { ...this.settings, ...newSettings };
        this.saveToLocalStorage();
    }

    applySettings() {
        if (!this.settings) return;

        const setVal = (id, val) => {
            const elem = document.getElementById(id);
            if (elem) elem.value = val;
        };

        // Update UNIT_PRESETS (squadSize가 없으면 기본값 60으로 설정)
        if (this.settings.unitPresets) {
            for (let presetName in this.settings.unitPresets) {
                if (this.UNIT_PRESETS[presetName]) {
                    this.UNIT_PRESETS[presetName] = {
                        ...this.UNIT_PRESETS[presetName], // 기본값 유지 (squadSize 포함)
                        ...this.settings.unitPresets[presetName] // settings.json 값으로 덮어쓰기
                    };
                    // squadSize가 없으면 기본값 60 설정
                    if (this.UNIT_PRESETS[presetName].squadSize === undefined) {
                        this.UNIT_PRESETS[presetName].squadSize = 60;
                    }
                }
            }
        }

        // Apply Team A settings
        if (this.settings.teamA) {
            const teamA = this.settings.teamA;
            console.log('Applying teamA settings:', teamA);
            setVal('count_A', teamA.count || 10);
            if (teamA.selectedPreset) {
                setVal('preset_A', teamA.selectedPreset);
                setVal('squad1_preset_A', teamA.selectedPreset);
            }
            if (teamA.formation) {
                setVal('squad1_formation_A', teamA.formation);
            }
            setVal('hp_A', teamA.hp);
            setVal('atk_A', teamA.atk);
            setVal('as_A', teamA.as);
            setVal('rng_A', teamA.rng);
            setVal('spd_A', teamA.spd);
            setVal('shd_A', teamA.shd);
            setVal('arm_A', teamA.arm);
            setVal('mst_A', teamA.mst);
            setVal('mor_A', teamA.mor);
            setVal('mass_A', teamA.mass || 1);
        }

        // Apply Team B settings
        if (this.settings.teamB) {
            const teamB = this.settings.teamB;
            console.log('Applying teamB settings:', teamB);
            setVal('count_B', teamB.count || 1);
            if (teamB.selectedPreset) {
                setVal('preset_B', teamB.selectedPreset);
                setVal('squad1_preset_B', teamB.selectedPreset);
            }
            if (teamB.formation) {
                setVal('squad1_formation_B', teamB.formation);
            }
            setVal('hp_B', teamB.hp);
            setVal('atk_B', teamB.atk);
            setVal('as_B', teamB.as);
            setVal('rng_B', teamB.rng);
            setVal('spd_B', teamB.spd);
            setVal('shd_B', teamB.shd);
            setVal('arm_B', teamB.arm);
            setVal('mst_B', teamB.mst);
            setVal('mor_B', teamB.mor);
            setVal('mass_B', teamB.mass || 1);
        }

        // Apply Global Config
        if (this.settings.globalConfig) {
            const cfg = this.settings.globalConfig;
            setVal('cfg_atk_prob_max', cfg.atkProbMax);
            setVal('cfg_atk_prob_min', cfg.atkProbMin);
            setVal('cfg_morale_threshold', cfg.moraleThreshold);
            setVal('cfg_morale_inf', cfg.moraleInf);
            setVal('cfg_stamina_inf', cfg.staminaInf);
            setVal('cfg_base_evade', cfg.baseEvade);
            setVal('cfg_evade_bonus', cfg.evadeBonus);
            setVal('cfg_shield_pen', cfg.shieldPen);
            setVal('cfg_armor_pen', cfg.armorPen);
            setVal('cfg_def_bonus', cfg.defBonus);
            setVal('cfg_shield_base_mult', cfg.shieldBaseMult);
            setVal('cfg_armor_base_mult', cfg.armorBaseMult);
            setVal('cfg_defending_bonus', cfg.defendingBonus);
            setVal('cfg_defending_duration', cfg.defendingDuration);
            setVal('cfg_damage_reduction', cfg.damageReduction);
            setVal('cfg_pre_delay', cfg.preDelay);
            setVal('cfg_interval_evade', cfg.intervalEvade);
            setVal('cfg_interval_block', cfg.intervalBlock);
            setVal('cfg_attack_cost', cfg.attackCost);
            setVal('cfg_evade_cost', cfg.evadeCost);
            setVal('cfg_stamina_regen', cfg.staminaRegen);
            setVal('cfg_interval_stamina_bonus', cfg.intervalStaminaBonus);
            setVal('cfg_enemy_block_area', cfg.enemyBlockArea);
            setVal('cfg_enemy_max_slow', cfg.enemyMaxSlow);
            setVal('cfg_ally_pass_area', cfg.allyPassArea);
            setVal('cfg_ally_max_slow', cfg.allyMaxSlow);
            setVal('cfg_knockback_max_dist', cfg.knockbackMaxDist);
            setVal('cfg_death_knockback_mult', cfg.deathKnockbackMult);
            setVal('cfg_knockback_force_mult', cfg.knockbackForceMult);
            setVal('cfg_knockback_decay', cfg.knockbackDecay);
            setVal('cfg_knockback_collision_threshold', cfg.knockbackCollisionThreshold);
        }
        
        // 슬라이더 값 업데이트
        this.updateSquadSizeSlider('A');
        this.updateSquadSizeSlider('B');
    }

    saveCurrentSettings() {
        if (!this.settings) this.settings = {};

        const getVal = (id, def = 0) => {
            const elem = document.getElementById(id);
            return elem ? Number(elem.value) : def;
        };

        const getSelectVal = (id) => {
            const elem = document.getElementById(id);
            return elem ? elem.value : '';
        };

        // Save Team A
        this.settings.teamA = {
            selectedPreset: getSelectVal('preset_A') || '',
            count: getVal('count_A', 10),
            hp: getVal('hp_A'),
            atk: getVal('atk_A'),
            as: getVal('as_A'),
            rng: getVal('rng_A'),
            spd: getVal('spd_A'),
            shd: getVal('shd_A'),
            arm: getVal('arm_A'),
            mst: getVal('mst_A'),
            mor: getVal('mor_A'),
            mass: getVal('mass_A', 1)
        };

        // Save Team B
        this.settings.teamB = {
            selectedPreset: getSelectVal('preset_B') || '',
            count: getVal('count_B', 1),
            hp: getVal('hp_B'),
            atk: getVal('atk_B'),
            as: getVal('as_B'),
            rng: getVal('rng_B'),
            spd: getVal('spd_B'),
            shd: getVal('shd_B'),
            arm: getVal('arm_B'),
            mst: getVal('mst_B'),
            mor: getVal('mor_B'),
            mass: getVal('mass_B', 1)
        };

        // Save Global Config
        this.settings.globalConfig = {
            atkProbMax: getVal('cfg_atk_prob_max', 1.0),
            atkProbMin: getVal('cfg_atk_prob_min', 0.3),
            moraleThreshold: getVal('cfg_morale_threshold', 0.2),
            moraleInf: getVal('cfg_morale_inf', 0.4),
            staminaInf: getVal('cfg_stamina_inf', 0.3),
            baseEvade: getVal('cfg_base_evade', 0.1),
            evadeBonus: getVal('cfg_evade_bonus', 2.0),
            shieldPen: getVal('cfg_shield_pen', 0.5),
            armorPen: getVal('cfg_armor_pen', 0.5),
            defBonus: getVal('cfg_def_bonus', 1.5),
            shieldBaseMult: getVal('cfg_shield_base_mult', 1.5),
            armorBaseMult: getVal('cfg_armor_base_mult', 1.0),
            defendingBonus: getVal('cfg_defending_bonus', 1.3),
            defendingDuration: getVal('cfg_defending_duration', 2.0),
            damageReduction: getVal('cfg_damage_reduction', 0.5),
            preDelay: getVal('cfg_pre_delay', 0.5),
            intervalEvade: getVal('cfg_interval_evade', 0.5),
            intervalBlock: getVal('cfg_interval_block', 0.8),
            attackCost: getVal('cfg_attack_cost', 10),
            evadeCost: getVal('cfg_evade_cost', 5),
            staminaRegen: getVal('cfg_stamina_regen', 1),
            intervalStaminaBonus: getVal('cfg_interval_stamina_bonus', 2.0),
            enemyBlockArea: getVal('cfg_enemy_block_area', 90),
            enemyMaxSlow: getVal('cfg_enemy_max_slow', 70),
            allyPassArea: getVal('cfg_ally_pass_area', 60),
            allyMaxSlow: getVal('cfg_ally_max_slow', 20),
            knockbackMaxDist: getVal('cfg_knockback_max_dist', 1.0),
            deathKnockbackMult: getVal('cfg_death_knockback_mult', 1.5),
            knockbackForceMult: getVal('cfg_knockback_force_mult', 600),
            knockbackDecay: getVal('cfg_knockback_decay', 0.90),
            knockbackCollisionThreshold: getVal('cfg_knockback_collision_threshold', 1.0)
        };

        // 현재 선택된 병종의 인원수를 UNIT_PRESETS에 업데이트
        const presetA = getSelectVal('squad1_preset_A');
        const presetB = getSelectVal('squad1_preset_B');
        const sizeInputA = document.getElementById('squad1_size_A_input');
        const sizeInputB = document.getElementById('squad1_size_B_input');
        
        if (presetA && sizeInputA && this.UNIT_PRESETS[presetA]) {
            this.UNIT_PRESETS[presetA].squadSize = parseInt(sizeInputA.value) || 60;
        }
        if (presetB && sizeInputB && this.UNIT_PRESETS[presetB]) {
            this.UNIT_PRESETS[presetB].squadSize = parseInt(sizeInputB.value) || 60;
        }
        
        // 병종 설정 탭에서 수정한 스탯을 UNIT_PRESETS에 반영
        // 부대 설정에서 사용하는 모든 병종의 스탯을 UI에서 읽어와서 반영
        // 병종 설정 탭의 preset_select를 변경하지 않고, 각 병종의 스탯을 직접 읽어옴
        // 사용자가 수정한 값이 UI에 남아있어야 하므로, preset_select를 변경하지 않음
        
        const presetSelect = document.getElementById('preset_select');
        const originalPreset = presetSelect ? presetSelect.value : '';
        
        // 부대 A의 병종 스탯 업데이트
        if (presetA && this.UNIT_PRESETS[presetA]) {
            // 병종 설정 탭에서 해당 병종을 선택하여 UI 필드를 업데이트
            // 하지만 사용자가 수정한 값이 있다면 그 값을 우선 사용
            if (presetSelect && presetSelect.value !== presetA) {
                presetSelect.value = presetA;
                this.loadPresetStats(presetA);
            }
            
            // UI에서 스탯 읽어서 UNIT_PRESETS에 반영
            // UI 필드에 값이 있으면 그 값을 사용, 없으면 UNIT_PRESETS의 현재 값 사용
            this.UNIT_PRESETS[presetA] = {
                hp: getVal('hp_preset', this.UNIT_PRESETS[presetA].hp),
                atk: getVal('atk_preset', this.UNIT_PRESETS[presetA].atk),
                as: getVal('as_preset', this.UNIT_PRESETS[presetA].as),
                rng: getVal('rng_preset', this.UNIT_PRESETS[presetA].rng),
                spd: getVal('spd_preset', this.UNIT_PRESETS[presetA].spd),
                shd: getVal('shd_preset', this.UNIT_PRESETS[presetA].shd),
                arm: getVal('arm_preset', this.UNIT_PRESETS[presetA].arm),
                mst: getVal('mst_preset', this.UNIT_PRESETS[presetA].mst),
                mor: getVal('mor_preset', this.UNIT_PRESETS[presetA].mor),
                mass: getVal('mass_preset', this.UNIT_PRESETS[presetA].mass || 11),
                squadSize: sizeInputA ? parseInt(sizeInputA.value) || 60 : (this.UNIT_PRESETS[presetA].squadSize || 60)
            };
        }
        
        // 부대 B의 병종 스탯 업데이트
        if (presetB && this.UNIT_PRESETS[presetB]) {
            // 병종 설정 탭에서 해당 병종을 선택하여 UI 필드를 업데이트
            if (presetSelect && presetSelect.value !== presetB) {
                presetSelect.value = presetB;
                this.loadPresetStats(presetB);
            }
            
            // UI에서 스탯 읽어서 UNIT_PRESETS에 반영
            this.UNIT_PRESETS[presetB] = {
                hp: getVal('hp_preset', this.UNIT_PRESETS[presetB].hp),
                atk: getVal('atk_preset', this.UNIT_PRESETS[presetB].atk),
                as: getVal('as_preset', this.UNIT_PRESETS[presetB].as),
                rng: getVal('rng_preset', this.UNIT_PRESETS[presetB].rng),
                spd: getVal('spd_preset', this.UNIT_PRESETS[presetB].spd),
                shd: getVal('shd_preset', this.UNIT_PRESETS[presetB].shd),
                arm: getVal('arm_preset', this.UNIT_PRESETS[presetB].arm),
                mst: getVal('mst_preset', this.UNIT_PRESETS[presetB].mst),
                mor: getVal('mor_preset', this.UNIT_PRESETS[presetB].mor),
                mass: getVal('mass_preset', this.UNIT_PRESETS[presetB].mass || 11),
                squadSize: sizeInputB ? parseInt(sizeInputB.value) || 60 : (this.UNIT_PRESETS[presetB].squadSize || 60)
            };
        }
        
        // 원래 선택된 병종 복원
        if (presetSelect && originalPreset && presetSelect.value !== originalPreset) {
            presetSelect.value = originalPreset;
            this.loadPresetStats(originalPreset);
        }
        
        // Save unitPresets (병종별 스탯 및 부대 인원수 포함)
        this.settings.unitPresets = JSON.parse(JSON.stringify(this.UNIT_PRESETS)); // Deep copy
        
        // Save camera settings
        if (this.camera) {
            this.camera.saveSettings();
        }

        this.saveToLocalStorage();
    }

    exportToFile() {
        this.saveCurrentSettings();
        if (!this.settings) {
            console.error('No settings to export');
            return;
        }

        const jsonString = JSON.stringify(this.settings, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'settings.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // Get stats from UI for a team
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
        
        // 병종별 질량 자동 계산
        const presetSelect = document.getElementById(`preset_${team}`);
        const presetName = presetSelect ? presetSelect.value : null;
        if (presetName && this.UNIT_PRESETS[presetName] && this.UNIT_PRESETS[presetName].mass) {
            stats.mass = this.UNIT_PRESETS[presetName].mass;
        } else {
            const uiMass = Number(document.getElementById(`mass_${team}`).value);
            if (uiMass && uiMass > 0) {
                stats.mass = uiMass;
            } else {
                const baseHumanMass = 10;
                const equipmentMass = 1 + (stats.shd * 0.5) + (stats.arm * 0.3);
                stats.mass = baseHumanMass + equipmentMass;
            }
        }
        
        return stats;
    }

    // Helper: Squad 회전 변환 적용 (SettingsManager에서만 수행)
    rotateSquad(squad, angle) {
        // Squad의 angle 저장 (시각화/로직용)
        squad.angle = angle;
        
        // Formation.angle은 0으로 유지 (Squad.js는 항상 위쪽을 향함)
        // 초기 상태에서 새로운 각도로 회전 변환 (절대 각도)
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const centerX = squad.centerX;
        const centerY = squad.centerY;
        
        // 초기 상태가 없으면 현재 상태를 초기 상태로 저장 (하위 호환성)
        if (!squad.initialUnitStates || squad.initialUnitStates.length === 0) {
            squad.initialUnitStates = squad.units.map(unit => ({
                x: unit.x - centerX, // 상대 위치
                y: unit.y - centerY,
                angle: 0 // 초기 각도는 0 (Formation.angle = 0 기준)
            }));
        }
        
        // 모든 Unit의 위치와 각도를 초기 상태에서 새 각도로 회전 변환
        squad.units.forEach((unit, idx) => {
            const initialState = squad.initialUnitStates[idx];
            if (!initialState) return;
            
            // 초기 상대 위치에서 회전 변환
            const rotatedX = initialState.x * cos - initialState.y * sin;
            const rotatedY = initialState.x * sin + initialState.y * cos;
            
            // 절대 위치 설정
            unit.x = centerX + rotatedX;
            unit.y = centerY + rotatedY;
            
            // 각도 회전 변환 (초기 각도 + 새 각도)
            unit.angle = (initialState.angle + angle) % (Math.PI * 2);
            unit.targetHeading = unit.angle;
        });
    }

    // Create squads and units based on current UI settings
    createSquads() {
        if (!this.sim || !this.sim.canvas) {
            console.warn('SettingsManager.createSquads: sim or canvas not available');
            return [];
        }

        const cx = this.sim.canvas.width / 2;
        const cy = this.sim.canvas.height / 2;
        
        // Squad 설정 가져오기
        const presetA = document.getElementById('squad1_preset_A')?.value || '';
        const presetB = document.getElementById('squad1_preset_B')?.value || '';
        // 인원수는 입력 필드에서 가져오고, 없으면 병종의 squadSize에서 가져옴
        const sizeInputA = document.getElementById('squad1_size_A_input');
        const sizeInputB = document.getElementById('squad1_size_B_input');
        const countA = sizeInputA ? parseInt(sizeInputA.value) : (presetA && this.UNIT_PRESETS[presetA] ? (this.UNIT_PRESETS[presetA].squadSize || 60) : 60);
        const countB = sizeInputB ? parseInt(sizeInputB.value) : (presetB && this.UNIT_PRESETS[presetB] ? (this.UNIT_PRESETS[presetB].squadSize || 60) : 60);
        const formationA = document.getElementById('squad1_formation_A')?.value || '방진';
        const formationB = document.getElementById('squad1_formation_B')?.value || '방진';
        
        console.log('Creating squads:', { presetA, presetB, countA, countB, formationA, formationB, cx, cy });
        
        // Stats는 항상 preset에서 가져옴
        const squadPresetA = presetA || '징집병';
        const squadPresetB = presetB || '중보병';
        
        let statsA = this.UNIT_PRESETS[squadPresetA] || this.UNIT_PRESETS['징집병'];
        let statsB = this.UNIT_PRESETS[squadPresetB] || this.UNIT_PRESETS['중보병'];
        
        // Spawn distance 계산 (기존의 10배로 설정)
        const baseSpawnDist = (statsA.rng * RANGE_SCALE) + (statsB.rng * RANGE_SCALE) + 100;
        const spawnDist = baseSpawnDist * 10;
        
        console.log('Spawn distance:', spawnDist, 'Base:', baseSpawnDist, 'StatsA rng:', statsA.rng, 'StatsB rng:', statsB.rng);
        
        const squads = [];
        let squadId = 1;
        let unitId = 1;
        
        // Check if squads already exist (for formation change detection)
        const existingSquadA = this.sim.squads && this.sim.squads.length > 0 ? this.sim.squads.find(s => s.team === 'A') : null;
        const existingSquadB = this.sim.squads && this.sim.squads.length > 0 ? this.sim.squads.find(s => s.team === 'B') : null;
        
        // Team A Squad 생성 또는 업데이트
        let squadA;
        const formationChangedA = existingSquadA && existingSquadA.formation && 
            existingSquadA.formation.type !== this.getFormationTypeString(formationA);
        const countChangedA = existingSquadA && existingSquadA.unitCount !== countA;
        
        if (existingSquadA && (formationChangedA || countChangedA)) {
            // Formation 또는 인원수 변경 - 셋업 상태에서는 유닛 재생성
            const currentAngle = existingSquadA.angle;
            existingSquadA.formation = new Formation(formationA, countA);
            existingSquadA.unitCount = countA;
            // 유닛 재생성 (새로운 formation에 맞게)
            unitId = existingSquadA.createUnits(unitId, statsA);
            // 기존 각도 복원
            existingSquadA.angle = currentAngle;
            // 각도에 맞게 유닛 위치 및 방향 조정
            if (currentAngle !== 0) {
                this.rotateSquad(existingSquadA, currentAngle);
            }
            squadA = existingSquadA;
        } else if (existingSquadA) {
            // Formation과 인원수가 같으면 기존 squad 유지
            // 하지만 각도는 항상 +90도로 고정
            if (existingSquadA.angle !== Math.PI / 2) {
                existingSquadA.angle = Math.PI / 2;
                this.rotateSquad(existingSquadA, Math.PI / 2);
            }
            squadA = existingSquadA;
         } else {
             // Create new squad (Formation.angle = 0, 항상 위쪽을 향함)
             squadA = new Squad(squadId++, 'A', cx - spawnDist/2, cy, squadPresetA, countA, formationA);
             unitId = squadA.createUnits(unitId, statsA);
             // 블루팀은 +90도 회전 (시계방향)
             squadA.angle = Math.PI / 2; // +90도
             this.rotateSquad(squadA, Math.PI / 2);
             // 셋업 상태에서는 updateFormationPositions 호출하지 않음 (unit.angle을 변경하지 않도록)
             // initializeAI도 셋업 상태에서는 호출하지 않음
         }
        console.log('Squad A created/updated:', { 
            id: squadA.id, 
            team: squadA.team, 
            centerX: squadA.centerX, 
            centerY: squadA.centerY, 
            units: squadA.units.length,
            formation: squadA.formation.type
        });
        squads.push(squadA);
        
        // Team B Squad 생성 또는 업데이트
        let squadB;
        const formationChangedB = existingSquadB && existingSquadB.formation && 
            existingSquadB.formation.type !== this.getFormationTypeString(formationB);
        const countChangedB = existingSquadB && existingSquadB.unitCount !== countB;
        
         if (existingSquadB && (formationChangedB || countChangedB)) {
             // Formation 또는 인원수 변경 - 셋업 상태에서는 유닛 재생성
             existingSquadB.formation = new Formation(formationB, countB);
             existingSquadB.unitCount = countB;
             // 유닛 재생성 (새로운 formation에 맞게)
             unitId = existingSquadB.createUnits(unitId, statsB);
             // 레드팀은 항상 -90도 회전
             existingSquadB.angle = -Math.PI / 2; // -90도
             this.rotateSquad(existingSquadB, -Math.PI / 2);
             squadB = existingSquadB;
        } else if (existingSquadB) {
            // Formation과 인원수가 같으면 기존 squad 유지
            // 하지만 각도는 항상 -90도로 고정
            if (existingSquadB.angle !== -Math.PI / 2) {
                existingSquadB.angle = -Math.PI / 2;
                this.rotateSquad(existingSquadB, -Math.PI / 2);
            }
            squadB = existingSquadB;
         } else {
             // Create new squad (Formation.angle = 0, 항상 위쪽을 향함)
             squadB = new Squad(squadId++, 'B', cx + spawnDist/2, cy, squadPresetB, countB, formationB);
             unitId = squadB.createUnits(unitId, statsB);
             // 레드팀은 -90도 회전 (반시계방향)
             squadB.angle = -Math.PI / 2; // -90도
             this.rotateSquad(squadB, -Math.PI / 2);
             // 셋업 상태에서는 updateFormationPositions 호출하지 않음 (unit.angle을 변경하지 않도록)
             // initializeAI도 셋업 상태에서는 호출하지 않음
         }
        console.log('Squad B created/updated:', { 
            id: squadB.id, 
            team: squadB.team, 
            centerX: squadB.centerX, 
            centerY: squadB.centerY, 
            units: squadB.units.length,
            formation: squadB.formation.type
        });
        squads.push(squadB);
        
        return squads;
    }

    // Helper: Get formation type string from FORMATION_TYPES
    getFormationTypeString(formationName) {
        if (!this.FORMATION_TYPES || Object.keys(this.FORMATION_TYPES).length === 0) return formationName;
        for (let key in this.FORMATION_TYPES) {
            if (this.FORMATION_TYPES[key] === formationName) {
                return this.FORMATION_TYPES[key];
            }
        }
        return formationName;
    }

    // Create units from squads (for backward compatibility)
    createUnits() {
        const squads = this.createSquads();
        const units = [];
        
        for (const squad of squads) {
            units.push(...squad.units);
        }
        
        return units;
    }

    // Update squads and units in simulator and render
    updateUnits(shouldRender = true) {
        if (!this.sim) {
            console.warn('SettingsManager.updateUnits: sim not available');
            return;
        }
        
        const squads = this.createSquads();
        this.sim.squads = squads;
        this.sim.units = [];
        
        for (const squad of squads) {
            this.sim.units.push(...squad.units);
        }
        
        console.log('Total units created:', this.sim.units.length);
        
        // 카메라 위치는 초기 로드 시에만 설정되고, 이후 업데이트(포메이션 변경 등)에서는 유지됨
        
        // 셋업 시 렌더 (SettingsManager가 담당)
        // shouldRender가 false이면 렌더하지 않음 (초기 로드 시 카메라 설정 후 렌더하기 위해)
        if (shouldRender && this.sim && this.sim.canvas) {
            this.render();
        }
    }

    // 카메라를 모든 부대가 보이도록 설정 (초기 로드 시에만 사용)
    setupCameraForAllSquads() {
        if (!this.camera || !this.sim.squads || this.sim.squads.length === 0) {
            return;
        }

        let sumX = 0, sumY = 0;
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        
        // 모든 squad의 formation shape 중심점 및 범위 계산
        for (const squad of this.sim.squads) {
            const centerX = squad.centerX;
            const centerY = squad.centerY;
            sumX += centerX;
            sumY += centerY;
            
            // formation shape의 범위 계산 (idealPositions 기반)
            if (squad.formation && squad.formation.idealPositions) {
                for (const pos of squad.formation.idealPositions) {
                    const angle = squad.angle;
                    const cos = Math.cos(angle);
                    const sin = Math.sin(angle);
                    const worldX = centerX + (pos.x * cos - pos.y * sin);
                    const worldY = centerY + (pos.x * sin + pos.y * cos);
                    
                    if (worldX < minX) minX = worldX;
                    if (worldX > maxX) maxX = worldX;
                    if (worldY < minY) minY = worldY;
                    if (worldY > maxY) maxY = worldY;
                }
            }
        }
        
        const centerX = sumX / this.sim.squads.length;
        const centerY = sumY / this.sim.squads.length;
        
        // 카메라를 formation shape 중심으로 이동
        this.camera.x = centerX;
        this.camera.y = centerY;
        
        // 적절한 줌 레벨 계산 (formation shape들이 모두 보이도록)
        const formationsWidth = maxX - minX;
        const formationsHeight = maxY - minY;
        const canvasWidth = this.sim.canvas.width;
        const canvasHeight = this.sim.canvas.height;
        
        // 여유 공간을 위해 1.5배 여유 추가
        const padding = 1.5;
        const zoomX = canvasWidth / (formationsWidth * padding);
        const zoomY = canvasHeight / (formationsHeight * padding);
        const optimalZoom = Math.min(zoomX, zoomY, 1.0); // 최대 1.0으로 제한
        
        // 줌이 너무 작거나 크면 적절한 값으로 설정
        if (optimalZoom > 0.01 && optimalZoom <= 1.0) {
            this.camera.zoom = optimalZoom;
        } else if (this.camera.zoom < 0.1 || this.camera.zoom > 1.0) {
            // 저장된 줌이 비정상적이면 기본값으로 리셋
            this.camera.zoom = 0.5; // 기본 줌 레벨
        }
        
        console.log('Camera set to formation center (initial load):', { 
            cameraX: this.camera.x, 
            cameraY: this.camera.y, 
            cameraZoom: this.camera.zoom,
            centerX, 
            centerY,
            formationsWidth,
            formationsHeight,
            optimalZoom
        });
    }
    
    // 셋업 상태 렌더링 (SettingsManager가 담당)
    render() {
        if (!this.sim || !this.sim.canvas) return;
        
        const ctx = this.sim.ctx;
        ctx.clearRect(0, 0, this.sim.canvas.width, this.sim.canvas.height);
        
        // 배경 렌더링
        ctx.save();
        if (this.camera) {
            this.renderBackground(ctx, this.camera.x, this.camera.y, this.camera.zoom, this.camera.showGrid);
        } else {
            this.renderBackground(ctx, 0, 0, 1.0, false);
        }
        ctx.restore();
        
        // 카메라 변환 적용
        ctx.save();
        if (this.camera) {
            this.camera.applyTransform(ctx);
        } else {
            ctx.translate(this.sim.canvas.width / 2, this.sim.canvas.height / 2);
        }
        
        // Formation shapes 및 Units 렌더링 (셋업 상태)
        // Units를 먼저 렌더링하고, Formation shapes를 나중에 렌더링하여 shape가 위에 표시되도록 함
        if (this.sim.squads && this.sim.squads.length > 0) {
            // 1단계: Units 렌더링 (먼저)
            this.sim.squads.forEach(squad => {
                if (squad.units) {
                    squad.units.forEach(unit => {
                        if (unit && typeof unit.draw === 'function') {
                            unit.draw(ctx);
                        }
                    });
                }
            });
            
            // 2단계: Formation shapes 렌더링 (나중에 - 가장 위 레이어)
            const cameraZoom = this.camera ? this.camera.zoom : 1.0;
            this.sim.squads.forEach(squad => {
                if (squad && typeof squad.drawFormationShape === 'function') {
                    squad.drawFormationShape(ctx, cameraZoom);
                }
            });
        }
        
        ctx.restore();
    }

    // Main initialization method - called from main.js
    async initialize() {
        // 1. Update preset selectors
        this.updatePresetSelectors();
        
        // 2. Load settings from file or LocalStorage
        const loaded = await this.loadFromFile();
        if (loaded) {
            this.applySettings();
            // 설정이 로드되었지만 병종이 선택되지 않은 경우 기본값 설정
            const presetA = document.getElementById('squad1_preset_A')?.value || '';
            const presetB = document.getElementById('squad1_preset_B')?.value || '';
            if (!presetA) {
                this.setSquadPreset('A', 1, '징집병');
            }
            if (!presetB) {
                this.setSquadPreset('B', 1, '중보병');
            }
        } else {
            // Fallback to default values
            this.setSquadPreset('A', 1, '징집병');
            this.setSquadPreset('B', 1, '중보병');
            this.saveCurrentSettings();
        }
        
        // 3. Create BattleSimulator instance
        if (!this.sim && typeof BattleSimulator !== 'undefined') {
            this.sim = new BattleSimulator(this);
        }
        
        // 4. Initialize Camera (must be done after settings are loaded)
        if (typeof Camera !== 'undefined' && !this.camera) {
            this.camera = new Camera(this.sim, this);
        }
        
        // 5. Create initial units
        this.updateUnits(false); // 초기 로드 시에는 render하지 않음
        
        // 6. 초기 로드 시 카메라를 모든 부대가 보이도록 설정
        this.setupCameraForAllSquads();
        
        // 7. 초기 로드 시 렌더링 (카메라 설정 후)
        if (this.sim && this.sim.canvas) {
            this.render();
        }
        
        // 8. Setup squad rotation UI (환경설정 불러온 직후)
        this.setupSquadRotationUI();
        
        // 9. 초기 슬라이더 값 설정
        this.updateSquadSizeSlider('A');
        this.updateSquadSizeSlider('B');
    }
    
    // Squad 회전 UI 설정 (임시)
    setupSquadRotationUI() {
        const sliderA = document.getElementById('squadRotation_A');
        const sliderB = document.getElementById('squadRotation_B');
        const valueA = document.getElementById('squadRotation_A_value');
        const valueB = document.getElementById('squadRotation_B_value');
        
        if (!sliderA || !sliderB || !valueA || !valueB) return;
        
        // 초기값 표시 (0도 = 0 rad, 최초 로드 시 회전 없음)
        valueA.textContent = '0°';
        valueB.textContent = '0°';
        
        // 슬라이더 이벤트 핸들러
        const handleRotation = (team, slider, valueElement) => {
            const degrees = parseFloat(slider.value);
            const radians = (degrees * Math.PI) / 180;
            valueElement.textContent = `${degrees}°`;
            
            // Squad 찾기 및 회전
            if (this.sim && this.sim.squads) {
                const squad = this.sim.squads.find(s => s.team === team);
                if (squad) {
                    this.rotateSquad(squad, radians);
                    // 렌더링 업데이트 (셋업 상태 렌더링)
                    this.render();
                }
            }
        };
        
        sliderA.addEventListener('input', () => handleRotation('A', sliderA, valueA));
        sliderB.addEventListener('input', () => handleRotation('B', sliderB, valueB));
        
        // 최초 로드 시에는 초기 회전 적용하지 않음 (아무것도 rotate 하지 않음)
    }

    // 배경 렌더링 (체스판 패턴 잔디밭)
    renderBackground(ctx, cameraX, cameraY, cameraZoom, showGrid) {
        // ctx.canvas를 사용 (더 안전함)
        if (!ctx || !ctx.canvas) {
            console.warn('SettingsManager.renderBackground: ctx or ctx.canvas is null');
            return;
        }
        
        const grassTileSize = 800; // 체커 패턴 크기 (부대 하나 크기 정도)
        // 채도 낮춤, 명도 거의 블랙에 가깝게
        const lightGrassColor = "#1a1f1a"; // 매우 어두운 초록 (밝은 쪽)
        const darkGrassColor = "#141814"; // 거의 블랙에 가까운 초록 (어두운 쪽)
        
        // 카메라 변환 전 컨텍스트이므로, 월드 좌표를 스크린 좌표로 변환
        // cameraX, cameraY는 월드 좌표에서 카메라가 보고 있는 중심점
        const worldWidth = ctx.canvas.width / cameraZoom;
        const worldHeight = ctx.canvas.height / cameraZoom;
        
        const startX = Math.floor((cameraX - worldWidth / 2) / grassTileSize) * grassTileSize;
        const startY = Math.floor((cameraY - worldHeight / 2) / grassTileSize) * grassTileSize;
        const endX = startX + worldWidth + grassTileSize * 2;
        const endY = startY + worldHeight + grassTileSize * 2;
        
        // 월드 좌표를 스크린 좌표로 변환
        const screenTileSize = grassTileSize * cameraZoom;
        
        // 체스판 패턴 렌더링 (스크린 좌표로)
        for (let worldY = startY; worldY < endY; worldY += grassTileSize) {
            for (let worldX = startX; worldX < endX; worldX += grassTileSize) {
                const tileX = Math.floor(worldX / grassTileSize);
                const tileY = Math.floor(worldY / grassTileSize);
                const isLight = (tileX + tileY) % 2 === 0;
                
                // 월드 좌표를 스크린 좌표로 변환
                const screenX = (worldX - cameraX) * cameraZoom + ctx.canvas.width / 2;
                const screenY = (worldY - cameraY) * cameraZoom + ctx.canvas.height / 2;
                
                ctx.fillStyle = isLight ? lightGrassColor : darkGrassColor;
                ctx.fillRect(screenX, screenY, screenTileSize, screenTileSize);
            }
        }
        
        // 그리드 렌더링 (토글이 켜져있을 때만)
        if (showGrid) {
            ctx.strokeStyle = "rgba(51, 65, 85, 0.3)";
            ctx.lineWidth = 1;
            ctx.beginPath();
            
            for(let worldX = startX; worldX < endX; worldX += grassTileSize) {
                const screenX = (worldX - cameraX) * cameraZoom + ctx.canvas.width / 2;
                const screenY1 = (startY - cameraY) * cameraZoom + ctx.canvas.height / 2;
                const screenY2 = (endY - cameraY) * cameraZoom + ctx.canvas.height / 2;
                ctx.moveTo(screenX, screenY1);
                ctx.lineTo(screenX, screenY2);
            }
            for(let worldY = startY; worldY < endY; worldY += grassTileSize) {
                const screenY = (worldY - cameraY) * cameraZoom + ctx.canvas.height / 2;
                const screenX1 = (startX - cameraX) * cameraZoom + ctx.canvas.width / 2;
                const screenX2 = (endX - cameraX) * cameraZoom + ctx.canvas.width / 2;
                ctx.moveTo(screenX1, screenY);
                ctx.lineTo(screenX2, screenY);
            }
            ctx.stroke();
        }
    }

    // UI 관련 기능들 (BattleSimulator에서 이동)
    updatePresetSelectors() {
        // Squad preset 선택자 업데이트
        const squadSelA = document.getElementById('squad1_preset_A');
        const squadSelB = document.getElementById('squad1_preset_B');
        
        if (squadSelA && squadSelB) {
            squadSelA.innerHTML = '<option value="">선택...</option>';
            squadSelB.innerHTML = '<option value="">선택...</option>';
            
            for (let name in this.UNIT_PRESETS) {
                let optA = document.createElement('option');
                optA.value = name; optA.innerText = name;
                squadSelA.appendChild(optA);
                
                let optB = document.createElement('option');
                optB.value = name; optB.innerText = name;
                squadSelB.appendChild(optB);
            }
        }
        
        // 병종 선택자 업데이트 (유닛 스탯 탭)
        const presetSelect = document.getElementById('preset_select');
        if (presetSelect) {
            presetSelect.innerHTML = '<option value="">선택...</option>';
            for (let name in this.UNIT_PRESETS) {
                let opt = document.createElement('option');
                opt.value = name; opt.innerText = name;
                presetSelect.appendChild(opt);
            }
        }
    }
    
    // 병종 선택 시 스탯 로드 (유닛 스탯 탭용)
    loadPresetStats(presetName) {
        if (!presetName || !this.UNIT_PRESETS[presetName]) return;
        
        const stats = this.UNIT_PRESETS[presetName];
        const setVal = (id, val) => {
            const elem = document.getElementById(id);
            if (elem) elem.value = val;
        };
        
        setVal('preset_select', presetName);
        setVal('hp_preset', stats.hp);
        setVal('atk_preset', stats.atk);
        setVal('as_preset', stats.as);
        setVal('rng_preset', stats.rng);
        setVal('spd_preset', stats.spd);
        setVal('shd_preset', stats.shd);
        setVal('arm_preset', stats.arm);
        setVal('mst_preset', stats.mst);
        setVal('mor_preset', stats.mor);
        setVal('mass_preset', stats.mass || 11);
        setVal('squadSize_preset', stats.squadSize || 60);
    }
    
    // 병종 스탯 저장 (유닛 스탯 탭용)
    savePresetStats() {
        const presetName = document.getElementById('preset_select')?.value;
        if (!presetName || !this.UNIT_PRESETS[presetName]) return;
        
        const getVal = (id, def = 0) => {
            const elem = document.getElementById(id);
            return elem ? Number(elem.value) : def;
        };
        
        this.UNIT_PRESETS[presetName] = {
            hp: getVal('hp_preset'),
            atk: getVal('atk_preset'),
            as: getVal('as_preset'),
            rng: getVal('rng_preset'),
            spd: getVal('spd_preset'),
            shd: getVal('shd_preset'),
            arm: getVal('arm_preset'),
            mst: getVal('mst_preset'),
            mor: getVal('mor_preset'),
            mass: getVal('mass_preset', 11),
            squadSize: getVal('squadSize_preset', 60)
        };
        
        // unitPresets를 settings에 저장
        this.saveCurrentSettings();
        this.updateUnits(); // 스탯 변경 시 즉시 업데이트
    }
    
    // Squad preset 설정 (부대 설정 탭용)
    setSquadPreset(team, squadIndex, presetName) {
        if (!presetName) return;
        const setVal = (id, val) => {
            const elem = document.getElementById(id);
            if (elem) elem.value = val;
        };
        
        setVal(`squad${squadIndex}_preset_${team}`, presetName);
        this.saveCurrentSettings();
        this.updateUnits();
    }
    
    // 병종 선택 시 슬라이더 값 업데이트
    updateSquadSizeSlider(team) {
        const presetSelect = document.getElementById(`squad1_preset_${team}`);
        const sizeSlider = document.getElementById(`squad1_size_${team}`);
        const sizeInput = document.getElementById(`squad1_size_${team}_input`);
        
        if (!presetSelect || !sizeSlider || !sizeInput) return;
        
        const presetName = presetSelect.value;
        if (presetName && this.UNIT_PRESETS[presetName]) {
            const squadSize = this.UNIT_PRESETS[presetName].squadSize || 60;
            sizeSlider.value = squadSize;
            sizeInput.value = squadSize;
        }
    }
    
    // 인원수 변경 시 병종 설정 창의 부대 인원수 값도 업데이트
    updatePresetSquadSize() {
        const presetSelectA = document.getElementById('squad1_preset_A');
        const presetSelectB = document.getElementById('squad1_preset_B');
        const presetSelect = document.getElementById('preset_select');
        const presetSizeInput = document.getElementById('squadSize_preset');
        
        if (!presetSizeInput) return;
        
        // 현재 선택된 병종이 부대 설정의 병종과 일치하는지 확인
        const currentPreset = presetSelect ? presetSelect.value : '';
        const squadPresetA = presetSelectA ? presetSelectA.value : '';
        const squadPresetB = presetSelectB ? presetSelectB.value : '';
        
        // 부대 설정에서 선택된 병종의 인원수 가져오기
        let squadSize = null;
        if (currentPreset === squadPresetA) {
            const sizeInputA = document.getElementById('squad1_size_A_input');
            if (sizeInputA) squadSize = parseInt(sizeInputA.value);
        } else if (currentPreset === squadPresetB) {
            const sizeInputB = document.getElementById('squad1_size_B_input');
            if (sizeInputB) squadSize = parseInt(sizeInputB.value);
        }
        
        // 병종 설정 창의 병종이 부대 설정의 병종과 일치하면 업데이트
        if (squadSize !== null && (currentPreset === squadPresetA || currentPreset === squadPresetB)) {
            presetSizeInput.value = squadSize;
            // UNIT_PRESETS도 업데이트
            if (currentPreset && this.UNIT_PRESETS[currentPreset]) {
                this.UNIT_PRESETS[currentPreset].squadSize = squadSize;
            }
        }
    }
}

