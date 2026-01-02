// Settings Manager - Handles loading and saving settings
class SettingsManager {
    constructor() {
        this.STORAGE_KEY = 'war_sim_settings';
        this.settings = null;
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

        // Update UNIT_PRESETS
        if (this.settings.unitPresets) {
            Object.assign(UNIT_PRESETS, this.settings.unitPresets);
        }

        // Apply Team A settings
        if (this.settings.teamA) {
            const teamA = this.settings.teamA;
            console.log('Applying teamA settings:', teamA);
            setVal('count_A', teamA.count || 10);
            if (teamA.selectedPreset) {
                setVal('preset_A', teamA.selectedPreset);
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

        // Preserve unitPresets if exists
        if (!this.settings.unitPresets) {
            this.settings.unitPresets = UNIT_PRESETS;
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
}

