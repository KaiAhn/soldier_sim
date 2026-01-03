// ChargeSystem - Handles charge mechanics
// 돌격은 적과 교전상태에 돌입하기 직전 부대장이 자동으로 돌격 명령을 외치며 발동

class ChargeSystem {
    constructor(squad) {
        this.squad = squad;
        this.isCharging = false;
        this.chargeTimer = 0;
        this.chargeDuration = CHARGE_DURATION;
        
        // Charge bonuses
        this.knockbackMassMultiplier = 2.0; // 기본 질량에 2배
        this.knockbackForceMultiplier = 2.0; // 밀쳐짐 힘 배율에 2배
        this.damageMultiplier = 1.2; // 공격력에 1.2배
        this.armorPenetrationInfantry = 0.1; // 보병: 상대 방어력 10% 관통
        this.armorPenetrationCavalry = 0.5; // 기병: 상대 방어력 50% 관통
        
        // Units that have received charge bonus (one-time per charge)
        this.chargedUnits = new Set();
    }
    
    startCharge() {
        this.isCharging = true;
        this.chargeTimer = 0;
        this.chargedUnits.clear();
        
        // Rigidly reorganize formation
        this.squad.rigidReorganize();
        
        // Align unit directions with squad direction
        this.alignUnitDirections();
        
        // Set charge state for all units
        for (let unit of this.squad.units) {
            if (unit.state === STATES.DEAD) continue;
            unit.isCharging = true;
            unit.chargeBonusReceived = false;
        }
    }
    
    update(dt) {
        if (this.isCharging) {
            this.chargeTimer += dt;
            
            if (this.chargeTimer >= this.chargeDuration) {
                this.endCharge();
            }
        }
    }
    
    endCharge() {
        this.isCharging = false;
        this.chargeTimer = 0;
        this.chargedUnits.clear();
        
        // Clear charge state for all units
        for (let unit of this.squad.units) {
            unit.isCharging = false;
            unit.chargeBonusReceived = false;
        }
    }
    
    alignUnitDirections() {
        const squadAngle = this.squad.angle;
        
        for (let unit of this.squad.units) {
            if (unit.state === STATES.DEAD) continue;
            unit.angle = squadAngle;
            unit.targetHeading = squadAngle;
        }
    }
    
    // Check if unit can receive charge bonus
    canReceiveChargeBonus(unit) {
        if (!this.isCharging) return false;
        if (unit.chargeBonusReceived) return false;
        if (this.chargedUnits.has(unit.id)) return false;
        
        // Check if unit has enough stamina for high-speed movement
        const highSpeedStaminaCost = unit.moveSpeed * CHARGE_HIGH_SPEED_STAMINA_MULT;
        
        if (unit.stamina < highSpeedStaminaCost) return false;
        
        return true;
    }
    
    // Apply charge bonus to attack
    applyChargeBonusToAttack(unit, baseDamage, targetUnit) {
        if (!this.canReceiveChargeBonus(unit)) {
            return baseDamage;
        }
        
        // Mark as received
        unit.chargeBonusReceived = true;
        this.chargedUnits.add(unit.id);
        
        // Apply damage multiplier
        let damage = baseDamage * this.damageMultiplier;
        
        // Apply armor penetration
        const unitType = this.squad.getUnitType();
        let armorPen = 0;
        if (unitType === 'cavalry') {
            armorPen = this.armorPenetrationCavalry;
        } else if (unitType === 'infantry') {
            armorPen = this.armorPenetrationInfantry;
        }
        
        // Reduce target's effective armor
        const effectiveArmor = targetUnit.armor * (1 - armorPen);
        const armorReduction = effectiveArmor / (effectiveArmor + 10); // 임의 공식
        damage = damage * (1 - armorReduction);
        
        return damage;
    }
    
    // Apply charge bonus to knockback
    applyChargeBonusToKnockback(unit, baseKnockbackForce) {
        if (!this.canReceiveChargeBonus(unit)) {
            return baseKnockbackForce;
        }
        
        // Apply knockback force multiplier
        return baseKnockbackForce * this.knockbackForceMultiplier;
    }
    
    // Get charge mass multiplier
    getChargeMassMultiplier(unit) {
        if (!this.canReceiveChargeBonus(unit)) {
            return 1.0;
        }
        
        return this.knockbackMassMultiplier;
    }
    
    // Check if unit should move straight during charge
    shouldMoveStraight(unit, targetX, targetY) {
        if (!this.isCharging) return false;
        if (!unit.isCharging) return false;
        
        // During charge, units move straight towards squad direction
        const squadAngle = this.squad.angle;
        const dx = Math.cos(squadAngle);
        const dy = Math.sin(squadAngle);
        
        // Move straight in squad direction
        return { straight: true, dx, dy };
    }
    
    // Check if unit should attack immediately on collision during charge
    shouldAttackOnCollision(unit, enemyUnit) {
        if (!this.isCharging) return false;
        if (!unit.isCharging) return false;
        if (unit.chargeBonusReceived) return false; // Already used charge bonus
        
        // Check if unit has stamina for attack
        const config = GlobalConfig.get();
        if (unit.stamina < config.attackCost) return false;
        
        // Check if within range
        const dist = Math.hypot(enemyUnit.x - unit.x, enemyUnit.y - unit.y);
        if (dist > unit.range) return false;
        
        return true;
    }
    
    // Check if unit's stamina depleted during charge
    checkStaminaDepletion(unit) {
        if (!this.isCharging) return false;
        if (!unit.isCharging) return false;
        
        // If stamina depleted during high-speed movement, can't receive bonus
        const highSpeedStaminaCost = unit.moveSpeed * CHARGE_HIGH_SPEED_STAMINA_MULT;
        
        if (unit.stamina < highSpeedStaminaCost) {
            // Can't receive charge bonus
            unit.chargeBonusReceived = true; // Mark as used to prevent further attempts
            return true;
        }
        
        // Check if stamina depleted after high-speed movement but before attack
        if (unit.stamina < config.attackCost) {
            // Can't receive charge bonus for attack
            unit.chargeBonusReceived = true;
            return true;
        }
        
        return false;
    }
    
    // Get charge status
    isActive() {
        return this.isCharging;
    }
    
    getRemainingTime() {
        if (!this.isCharging) return 0;
        return Math.max(0, this.chargeDuration - this.chargeTimer);
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ChargeSystem };
}

