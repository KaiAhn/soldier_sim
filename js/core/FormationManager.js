// FormationManager - Handles formation transitions and unit positioning
// Based on HTML code's transition system

class FormationManager {
    constructor(squad) {
        this.squad = squad;
        this.isTransitioning = false;
        this.transitionTimer = 0;
        this.transitionDuration = FORMATION_TRANSITION_DURATION;
        
        // Transition speed multiplier
        this.transitionSpeedMult = FORMATION_TRANSITION_SPEED_MULT;
        // Transition collision pass-through ratio
        this.transitionPassThroughRatio = FORMATION_TRANSITION_PASS_THROUGH_RATIO;
        // Transition slowdown reduction
        this.transitionSlowdownReduction = FORMATION_TRANSITION_SLOWDOWN_REDUCTION;
    }
    
    startTransition() {
        this.isTransitioning = true;
        this.transitionTimer = this.transitionDuration;
    }
    
    update(dt) {
        if (this.isTransitioning) {
            this.transitionTimer -= dt;
            if (this.transitionTimer <= 0) {
                this.isTransitioning = false;
                this.transitionTimer = 0;
            }
        }
    }
    
    // Assign slots efficiently to units (based on formation_simulator.html)
    assignSlotsEfficiently(slots, centerX, centerY, angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        
        // Convert relative slots to world positions (same as formation_simulator.html)
        const worldSlots = slots.map(slot => ({
            x: centerX + (slot.x * cos - slot.y * sin),
            y: centerY + (slot.x * sin + slot.y * cos),
            heading: angle + (slot.heading || 0),
            assigned: false
        }));

        // Assign slots to units in order (formation_simulator.html style)
        // Slots are already sorted by normalizeAndSortSlots (layer -> center -> left-right)
        // Units are assigned to slots in order
        this.squad.units.forEach((member, idx) => {
            if (member.state === STATES.DEAD) return;
            if (idx < worldSlots.length) {
                const slot = worldSlots[idx];
                member.targetX = slot.x;
                member.targetY = slot.y;
                member.targetHeading = slot.heading;
            }
        });
        
        // Store slots for visualization
        this.squad.currentSlots = worldSlots;
    }
    
    // Check movement obstruction (avoidance)
    checkMovementObstruction(unit, allUnits) {
        const detectionRange = unit.radius * 2.5;
        const fov = Math.PI / 2; // 90 degree field of view
        
        let nearestDist = Infinity;
        let obstruction = null;
        
        for (const other of allUnits) {
            if (other === unit || other.state === STATES.DEAD) continue;
            
            const dx = other.x - unit.x;
            const dy = other.y - unit.y;
            const dist = Math.hypot(dx, dy);
            
            if (dist < detectionRange) {
                const angleToOther = Math.atan2(dy, dx);
                let angleDiff = angleToOther - unit.targetHeading;
                
                // Normalize angle difference
                while (angleDiff <= -Math.PI) angleDiff += Math.PI * 2;
                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                
                if (Math.abs(angleDiff) < fov / 2) {
                    if (dist < nearestDist) {
                        nearestDist = dist;
                        obstruction = other;
                    }
                }
            }
        }
        
        if (obstruction) {
            let slowFactor = Math.max(0.2, (nearestDist - unit.radius) / (detectionRange - unit.radius));
            
            // Transition 중이면 감속 페널티 50% 완화
            if (this.isTransitioning) {
                const deceleration = 1.0 - slowFactor;
                slowFactor = 1.0 - (deceleration * this.transitionSlowdownReduction);
            }
            
            return { slowed: true, factor: slowFactor };
        }
        
        return { slowed: false, factor: 1.0 };
    }
    
    // Resolve collisions between units
    resolveCollisions(units) {
        const pushStrength = 0.2;
        const iterations = 2;
        
        for (let iter = 0; iter < iterations; iter++) {
            for (let i = 0; i < units.length; i++) {
                const u1 = units[i];
                if (u1.state === STATES.DEAD) continue;
                
                for (let j = i + 1; j < units.length; j++) {
                    const u2 = units[j];
                    if (u2.state === STATES.DEAD) continue;
                    
                    const dx = u2.x - u1.x;
                    const dy = u2.y - u1.y;
                    const distSq = dx * dx + dy * dy;
                    let radiusSum = u1.radius + u2.radius;
                    
                    // Transition 중이면 아군 판정 거리 50% 축소
                    let passThroughRatio = 0.85; // 기본 아군: 0.85배 (약간 겹침 허용)
                    if (this.isTransitioning) {
                        passThroughRatio *= this.transitionPassThroughRatio; // 절반으로 줄어듬
                    }
                    
                    const minDistSq = (radiusSum * passThroughRatio) ** 2;
                    
                    if (distSq < minDistSq && distSq > 0.001) {
                        const dist = Math.sqrt(distSq);
                        const overlap = (radiusSum * passThroughRatio) - dist;
                        
                        const nx = dx / dist;
                        const ny = dy / dist;
                        
                        const pushX = nx * overlap * pushStrength;
                        const pushY = ny * overlap * pushStrength;
                        
                        u1.x -= pushX;
                        u1.y -= pushY;
                        u2.x += pushX;
                        u2.y += pushY;
                    }
                }
            }
        }
    }
    
    // Get movement speed multiplier for transition
    getMovementSpeedMultiplier() {
        if (this.isTransitioning) {
            return this.transitionSpeedMult;
        }
        return 1.0;
    }
    
    // Check if currently transitioning
    isInTransition() {
        return this.isTransitioning;
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { FormationManager };
}

