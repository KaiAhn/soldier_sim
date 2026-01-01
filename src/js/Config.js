/**
 * 상수 및 설정 관리
 */

export const RANGE_SCALE = 40;

export const UNIT_PRESETS = {
    "징집병": { hp: 20, atk: 10, as: 1.0, rng: 1.0, spd: 40, shd: 0, arm: 1, mst: 60, mor: 40 },
    "경보병": { hp: 30, atk: 15, as: 0.9, rng: 1.0, spd: 45, shd: 3, arm: 2, mst: 65, mor: 60 },
    "중보병": { hp: 35, atk: 15, as: 0.7, rng: 1.2, spd: 35, shd: 5, arm: 5, mst: 75, mor: 80 }
};

export const STATES = {
    IDLE: '대기',
    MOVING: '이동',
    PRE_ATTACK: '공격준비',
    RECOVER: '휴식',
    INTERVAL: '후딜레이',
    DEFENDING: '방어태세', 
    DEAD: '사망'
};

export const INTENTS = {
    NONE: '...',
    ENGAGE: '접근',
    ATTACK: '공격!',
    DEFEND: '방어중',
    REST: '숨고르기'
};

/**
 * Global Config Manager
 * UI 요소에서 설정값을 읽어서 반환
 */
export const GlobalConfig = {
    get: () => ({
        // AI Logic
        atkProbMax: Number(document.getElementById('cfg_atk_prob_max').value),
        atkProbMin: Number(document.getElementById('cfg_atk_prob_min').value),
        moraleThreshold: Number(document.getElementById('cfg_morale_threshold').value),
        
        // Damage Influences
        moraleInf: Number(document.getElementById('cfg_morale_inf').value),
        staminaInf: Number(document.getElementById('cfg_stamina_inf').value),

        // Balance
        baseEvade: Number(document.getElementById('cfg_base_evade').value),
        evadeBonus: Number(document.getElementById('cfg_evade_bonus').value),
        defBonus: Number(document.getElementById('cfg_def_bonus').value),
        shieldPen: Number(document.getElementById('cfg_shield_pen').value),
        armorPen: Number(document.getElementById('cfg_armor_pen').value),
        
        // Intervals & Costs
        preDelay: Number(document.getElementById('cfg_pre_delay').value),
        intervalEvade: Number(document.getElementById('cfg_interval_evade').value),
        intervalBlock: Number(document.getElementById('cfg_interval_block').value),
        attackCost: Number(document.getElementById('cfg_attack_cost').value),
        evadeCost: Number(document.getElementById('cfg_evade_cost').value),
        staminaRegen: Number(document.getElementById('cfg_stamina_regen').value),
        moveMult: 1.5
    })
};

