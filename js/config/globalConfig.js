// Global Configuration Manager
const GlobalConfig = {
    get: () => ({
        atkProbMax: Number(document.getElementById('cfg_atk_prob_max').value),
        atkProbMin: Number(document.getElementById('cfg_atk_prob_min').value),
        moraleThreshold: Number(document.getElementById('cfg_morale_threshold').value),
        moraleInf: Number(document.getElementById('cfg_morale_inf').value),
        staminaInf: Number(document.getElementById('cfg_stamina_inf').value),
        baseEvade: Number(document.getElementById('cfg_base_evade').value),
        evadeBonus: Number(document.getElementById('cfg_evade_bonus').value),
        shieldPen: Number(document.getElementById('cfg_shield_pen').value),
        armorPen: Number(document.getElementById('cfg_armor_pen').value),
        defBonus: Number(document.getElementById('cfg_def_bonus').value),
        shieldBaseMult: Number(document.getElementById('cfg_shield_base_mult').value),
        armorBaseMult: Number(document.getElementById('cfg_armor_base_mult').value),
        defendingBonus: Number(document.getElementById('cfg_defending_bonus').value),
        defendingDuration: Number(document.getElementById('cfg_defending_duration').value),
        damageReduction: Number(document.getElementById('cfg_damage_reduction').value),
        preDelay: Number(document.getElementById('cfg_pre_delay').value),
        intervalEvade: Number(document.getElementById('cfg_interval_evade').value),
        intervalBlock: Number(document.getElementById('cfg_interval_block').value),
        attackCost: Number(document.getElementById('cfg_attack_cost').value),
        evadeCost: Number(document.getElementById('cfg_evade_cost').value),
        staminaRegen: Number(document.getElementById('cfg_stamina_regen').value),
        intervalStaminaBonus: Number(document.getElementById('cfg_interval_stamina_bonus').value),
        moveMult: 1.5,
        enemyBlockArea: Number(document.getElementById('cfg_enemy_block_area').value) / 100,
        enemyMaxSlow: Number(document.getElementById('cfg_enemy_max_slow').value) / 100,
        allyPassArea: Number(document.getElementById('cfg_ally_pass_area').value) / 100,
        allyMaxSlow: Number(document.getElementById('cfg_ally_max_slow').value) / 100,
        knockbackMaxDist: Number(document.getElementById('cfg_knockback_max_dist').value),
        deathKnockbackMult: Number(document.getElementById('cfg_death_knockback_mult').value),
        knockbackForceMult: Number(document.getElementById('cfg_knockback_force_mult').value),
        knockbackDecay: Number(document.getElementById('cfg_knockback_decay').value),
        knockbackCollisionThreshold: Number(document.getElementById('cfg_knockback_collision_threshold').value)
    })
};

