// SquadAI - Commander AI for squad decision making
// 부대장 AI는 사용자(장군)의 명령에 따르기 위해 최선을 다하지만,
// 병사들은 부대장의 판단을 따르지 못할 때도 있습니다.

// Squad States
const SQUAD_STATES = {
    MOVING: 'MOVING',           // 진형 이동
    ENGAGING: 'ENGAGING',       // 교전 돌입
    IN_COMBAT: 'IN_COMBAT',     // 교전 중
    DEFENDING: 'DEFENDING',     // 방어 및 회피
    RETREATING: 'RETREATING',   // 교전 이탈 후 후퇴
    REORGANIZING: 'REORGANIZING', // 재정비
    ROUTING: 'ROUTING'          // 자유 퇴각 (사기 0%)
};

// Squad Tactics
const SQUAD_TACTICS = {
    FORCED_ATTACK: 'FORCED_ATTACK',         // 강제 공격
    FREE_ATTACK: 'FREE_ATTACK',             // 자유 공격
    FORMATION_ATTACK: 'FORMATION_ATTACK',    // 대형 유지 공격
    STAND_GROUND: 'STAND_GROUND',           // 엄격한 수비
    RECEDING: 'RECEDING',                   // 이탈 시도
    FALL_BACK: 'FALL_BACK'                  // 후퇴
};

class SquadAI {
    constructor(squad) {
        this.squad = squad;
        this.state = SQUAD_STATES.MOVING;
        this.currentTactic = SQUAD_TACTICS.FREE_ATTACK;
        
        // Command enforcement (명령 강제도)
        this.commandEnforcement = {
            [SQUAD_STATES.MOVING]: 0.8,
            [SQUAD_STATES.ENGAGING]: 0.9,
            [SQUAD_STATES.IN_COMBAT]: 0.7,
            [SQUAD_STATES.DEFENDING]: 0.85,
            [SQUAD_STATES.RETREATING]: 0.95,
            [SQUAD_STATES.REORGANIZING]: 0.9,
            [SQUAD_STATES.ROUTING]: 0.3
        };
        
        // Formation maintenance desire (진형 유지 욕구)
        this.formationDesire = {
            [SQUAD_STATES.MOVING]: 1.0,
            [SQUAD_STATES.ENGAGING]: 0.8,
            [SQUAD_STATES.IN_COMBAT]: 0.5,
            [SQUAD_STATES.DEFENDING]: 0.7,
            [SQUAD_STATES.RETREATING]: 0.3,
            [SQUAD_STATES.REORGANIZING]: 0.9,
            [SQUAD_STATES.ROUTING]: 0.1
        };
        
        // Tactical decision probabilities (전술 선택 확률)
        this.tacticProbabilities = {
            [SQUAD_TACTICS.FORCED_ATTACK]: 0.2,
            [SQUAD_TACTICS.FREE_ATTACK]: 0.4,
            [SQUAD_TACTICS.FORMATION_ATTACK]: 0.2,
            [SQUAD_TACTICS.STAND_GROUND]: 0.1,
            [SQUAD_TACTICS.RECEDING]: 0.05,
            [SQUAD_TACTICS.FALL_BACK]: 0.05
        };
        
        // Decision timers
        this.decisionTimer = 0;
        this.decisionInterval = 2.0; // 2초마다 전술 재판단
        this.infoCheckTimer = 0;
        this.infoCheckInterval = 1.0; // 1초마다 정보 확인
        
        // Target squad
        this.targetSquad = null;
        this.lastTargetUpdate = 0;
        this.targetUpdateInterval = 3.0; // 3초마다 타겟 재선정
        
        // Combat state
        this.inCombat = false;
        this.combatStartTime = 0;
        this.combatCooldown = 0; // 전술 변경 쿨타임
        
        // Numerical superiority check
        this.numericalAdvantage = 0; // 양수면 우위, 음수면 열세
        
        // Formation collapse (진형 와해)
        this.formationCollapse = 0; // 0~1, 1이면 완전 와해
        this.formationCollapseThreshold = 0.5; // 0.5 이상이면 와해로 간주
        
        // Charge system
        this.chargeCooldown = 0;
        this.chargeCooldownDuration = CHARGE_COOLDOWN_DURATION;
        this.chargeActive = false;
        this.chargeTimer = 0;
        this.chargeDuration = CHARGE_DURATION;
    }
    
    update(dt, allSquads, config) {
        // Update timers
        this.decisionTimer += dt;
        this.infoCheckTimer += dt;
        this.combatCooldown = Math.max(0, this.combatCooldown - dt);
        this.chargeCooldown = Math.max(0, this.chargeCooldown - dt);
        
        if (this.chargeActive) {
            this.chargeTimer += dt;
            if (this.chargeTimer >= this.chargeDuration) {
                this.chargeActive = false;
                this.chargeTimer = 0;
            }
        }
        
        // Check squad morale
        const avgMorale = this.squad.getAverageMorale();
        if (avgMorale <= SQUAD_ROUTING_MORALE_THRESHOLD && this.state !== SQUAD_STATES.ROUTING) {
            this.state = SQUAD_STATES.ROUTING;
            this.squad.startRouting();
            return;
        }
        
        if (avgMorale >= SQUAD_REORGANIZE_MORALE_THRESHOLD && this.state === SQUAD_STATES.ROUTING) {
            // Try to reorganize
            this.state = SQUAD_STATES.REORGANIZING;
            this.squad.startReorganizing();
        }
        
        // Check if squad is destroyed
        if (this.squad.getAliveCount() === 0) {
            this.squad.destroy();
            return;
        }
        
        // Update formation collapse
        this.updateFormationCollapse();
        
        // Information gathering
        if (this.infoCheckTimer >= this.infoCheckInterval) {
            this.gatherInformation(allSquads);
            this.infoCheckTimer = 0;
        }
        
        // State machine
        switch (this.state) {
            case SQUAD_STATES.MOVING:
                this.updateMoving(dt, allSquads, config);
                break;
            case SQUAD_STATES.ENGAGING:
                this.updateEngaging(dt, allSquads, config);
                break;
            case SQUAD_STATES.IN_COMBAT:
                this.updateInCombat(dt, allSquads, config);
                break;
            case SQUAD_STATES.DEFENDING:
                this.updateDefending(dt, allSquads, config);
                break;
            case SQUAD_STATES.RETREATING:
                this.updateRetreating(dt, allSquads, config);
                break;
            case SQUAD_STATES.REORGANIZING:
                this.updateReorganizing(dt, allSquads, config);
                break;
            case SQUAD_STATES.ROUTING:
                this.updateRouting(dt, allSquads, config);
                break;
        }
    }
    
    gatherInformation(allSquads) {
        // Find nearest enemy squad
        let nearestEnemy = null;
        let nearestDist = Infinity;
        
        for (let squad of allSquads) {
            if (squad.team === this.squad.team || squad.isDestroyed()) continue;
            
            const dist = Math.hypot(
                squad.centerX - this.squad.centerX,
                squad.centerY - this.squad.centerY
            );
            
            if (dist < nearestDist) {
                nearestDist = dist;
                nearestEnemy = squad;
            }
        }
        
        this.targetSquad = nearestEnemy;
        
        // Check numerical advantage
        if (this.targetSquad) {
            const ourCount = this.squad.getAliveCount();
            const enemyCount = this.targetSquad.getAliveCount();
            this.numericalAdvantage = (ourCount - enemyCount) / Math.max(enemyCount, 1);
            
            // Check if in combat range
            const combatRange = this.squad.getCombatRange();
            this.inCombat = nearestDist <= combatRange;
        } else {
            this.numericalAdvantage = 0;
            this.inCombat = false;
        }
    }
    
    updateFormationCollapse() {
        // Calculate average distance from formation center
        let totalDist = 0;
        let count = 0;
        
        const formationCenter = this.squad.getFormationCenter();
        
        for (let unit of this.squad.units) {
            if (unit.state === STATES.DEAD) continue;
            
            const dist = Math.hypot(
                unit.x - formationCenter.x,
                unit.y - formationCenter.y
            );
            totalDist += dist;
            count++;
        }
        
        if (count === 0) {
            this.formationCollapse = 1.0;
            return;
        }
        
        const avgDist = totalDist / count;
        const maxDist = this.squad.formation.width * FORMATION_COLLAPSE_MAX_DIST_MULT;
        this.formationCollapse = Math.min(1.0, avgDist / maxDist);
    }
    
    updateMoving(dt, allSquads, config) {
        // Check if enemy is in range
        if (this.targetSquad && this.inCombat) {
            this.state = SQUAD_STATES.ENGAGING;
            this.squad.startEngaging();
            return;
        }
        
        // Move towards target or maintain position
        // (This is handled by squad's movement logic)
    }
    
    updateEngaging(dt, allSquads, config) {
        // Check if can charge
        if (this.canCharge()) {
            this.executeCharge();
        }
        
        // Enter combat
        if (this.inCombat) {
            this.state = SQUAD_STATES.IN_COMBAT;
            this.combatStartTime = performance.now();
            this.squad.startCombat();
        }
    }
    
    updateInCombat(dt, allSquads, config) {
        // Check if should disengage
        if (!this.inCombat) {
            this.state = SQUAD_STATES.RETREATING;
            this.squad.startRetreating();
            return;
        }
        
        // Check if formation collapsed
        if (this.formationCollapse >= 1.0) {
            // Formation completely collapsed - all units rout
            const avgMorale = this.squad.getAverageMorale();
            this.squad.applyMoraleDamage(avgMorale * 0.5); // 50% 사기 피해
        }
        
        // Check numerical advantage
        if (this.numericalAdvantage > 0.5 && this.combatCooldown <= 0) {
            // Try to encircle and destroy
            this.currentTactic = SQUAD_TACTICS.FORCED_ATTACK;
            this.squad.setTactic(this.currentTactic);
            this.combatCooldown = 5.0; // 5초 쿨타임
        }
        
        // Check if should defend/evade
        const shouldDefend = this.shouldDefendOrEvade();
        if (shouldDefend.defend) {
            this.state = SQUAD_STATES.DEFENDING;
            this.squad.startDefending();
        }
        
        // Tactical decision
        if (this.decisionTimer >= this.decisionInterval && this.combatCooldown <= 0) {
            this.makeTacticalDecision();
            this.decisionTimer = 0;
        }
    }
    
    updateDefending(dt, allSquads, config) {
        // Check if can re-engage
        if (!this.shouldDefendOrEvade().defend) {
            this.state = SQUAD_STATES.IN_COMBAT;
            this.squad.startCombat();
            return;
        }
        
        // Check if should try to disengage
        if (this.shouldDefendOrEvade().evade) {
            this.state = SQUAD_STATES.RETREATING;
            this.squad.startRetreating();
        }
    }
    
    updateRetreating(dt, allSquads, config) {
        // Move away from enemy
        if (!this.inCombat) {
            // Successfully disengaged
            this.state = SQUAD_STATES.REORGANIZING;
            this.squad.startReorganizing();
        }
    }
    
    updateReorganizing(dt, allSquads, config) {
        // Check if ready to re-engage
        const avgStamina = this.squad.getAverageStamina();
        const avgMorale = this.squad.getAverageMorale();
        
        if (avgStamina >= SQUAD_REENGAGE_STAMINA_THRESHOLD && avgMorale >= SQUAD_REENGAGE_MORALE_THRESHOLD) {
            // Ready to fight again
            if (this.targetSquad && this.inCombat) {
                this.state = SQUAD_STATES.ENGAGING;
                this.squad.startEngaging();
            } else {
                this.state = SQUAD_STATES.MOVING;
                this.squad.startMoving();
            }
        }
    }
    
    updateRouting(dt, allSquads, config) {
        // Units are routing, AI has minimal control
        // Just try to move away from enemies
    }
    
    shouldDefendOrEvade() {
        if (!this.targetSquad) return { defend: false, evade: false };
        
        const ourAvgAtk = this.squad.getAverageAttack();
        const ourAvgMorale = this.squad.getAverageMorale();
        const ourAvgStamina = this.squad.getAverageStamina();
        
        const enemyAvgAtk = this.targetSquad.getAverageAttack();
        const enemyAvgMorale = this.targetSquad.getAverageMorale();
        const enemyAvgStamina = this.targetSquad.getAverageStamina();
        
        const atkGap = (enemyAvgAtk - ourAvgAtk) / Math.max(ourAvgAtk, 1);
        const moraleGap = (enemyAvgMorale - ourAvgMorale) / Math.max(ourAvgMorale, 1);
        const staminaGap = (enemyAvgStamina - ourAvgStamina) / Math.max(ourAvgStamina, 1);
        
        // 50% 이상 격차: 방어 모드
        if (atkGap >= 0.5 || moraleGap >= 0.5 || staminaGap >= 0.5) {
            return { defend: true, evade: false };
        }
        
        // 100% 이상 격차: 회피 모드, 교전 이탈 시도
        if (atkGap >= 1.0 || moraleGap >= 1.0 || staminaGap >= 1.0) {
            return { defend: true, evade: true };
        }
        
        return { defend: false, evade: false };
    }
    
    makeTacticalDecision() {
        // Weight probabilities based on situation
        const weights = { ...this.tacticProbabilities };
        
        // Adjust based on numerical advantage
        if (this.numericalAdvantage > 0.3) {
            weights[SQUAD_TACTICS.FORCED_ATTACK] *= 1.5;
            weights[SQUAD_TACTICS.FREE_ATTACK] *= 1.2;
        } else if (this.numericalAdvantage < -0.3) {
            weights[SQUAD_TACTICS.STAND_GROUND] *= 1.5;
            weights[SQUAD_TACTICS.RECEDING] *= 1.3;
            weights[SQUAD_TACTICS.FALL_BACK] *= 1.3;
        }
        
        // Adjust based on morale
        const avgMorale = this.squad.getAverageMorale();
        if (avgMorale < 30) {
            weights[SQUAD_TACTICS.RECEDING] *= 2.0;
            weights[SQUAD_TACTICS.FALL_BACK] *= 2.0;
        }
        
        // Select tactic based on weighted probabilities
        const total = Object.values(weights).reduce((a, b) => a + b, 0);
        let rand = Math.random() * total;
        
        for (let [tactic, weight] of Object.entries(weights)) {
            rand -= weight;
            if (rand <= 0) {
                this.currentTactic = tactic;
                this.squad.setTactic(this.currentTactic);
                this.combatCooldown = 3.0; // 3초 쿨타임
                break;
            }
        }
    }
    
    canCharge() {
        if (this.chargeActive) return false;
        if (this.chargeCooldown > 0) return false;
        if (!this.squad.formation.canCharge()) return false;
        // Check minimum morale for charge (임의값: 10, 전역설정으로 변경 가능)
        const CHARGE_MIN_MORALE = 10;
        if (this.squad.getAverageMorale() < CHARGE_MIN_MORALE) return false;
        if (this.inCombat) return false; // Already in combat
        
        // Check if units are melee (infantry or cavalry)
        const unitType = this.squad.getUnitType();
        if (unitType !== 'infantry' && unitType !== 'cavalry') return false;
        
        return true;
    }
    
    executeCharge() {
        this.chargeActive = true;
        this.chargeTimer = 0;
        this.chargeCooldown = this.chargeCooldownDuration;
        
        // Recover morale (CHARGE_MORALE_RECOVERY of max morale)
        const maxMorale = this.squad.getMaxMorale();
        this.squad.applyMoraleDamage(-maxMorale * CHARGE_MORALE_RECOVERY);
        
        // Rigidly reorganize formation
        this.squad.rigidReorganize();
        
        // Set charge state for all units
        this.squad.setChargeState(true);
    }
    
    getCommandEnforcement() {
        return this.commandEnforcement[this.state] || 0.7;
    }
    
    getFormationDesire() {
        return this.formationDesire[this.state] || 0.5;
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SquadAI, SQUAD_STATES, SQUAD_TACTICS };
}

