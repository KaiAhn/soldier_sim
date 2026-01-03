// Unit class - Represents a single combat unit
class Unit {
    constructor(id, team, x, y, stats) {
        this.id = id;
        this.team = team;
        this.x = x;
        this.y = y;
        
        this.maxHp = stats.hp;
        this.hp = stats.hp;
        this.atk = stats.atk;
        this.atkSpd = stats.as;
        this.range = stats.rng * RANGE_SCALE;
        this.moveSpeed = stats.spd;
        this.shield = stats.shd;
        this.armor = stats.arm;
        this.maxStamina = stats.mst;
        this.stamina = stats.mst;
        this.maxMorale = stats.mor;
        this.morale = stats.mor;
        this.mass = stats.mass || 1;
        
        this.state = STATES.IDLE;
        this.stateTimer = 0;
        this.defendingDecisionTimer = 0; // 방어 중 공격 판단 타이머
        this.intent = INTENTS.ENGAGE;
        
        this.radius = 16;
        this.angle = 0;
        
        this.animState = 'IDLE';
        this.animTimer = 0;
        this.visualEffects = []; 
        
        this.offsetX = 0;
        this.shakeX = 0;
        this.shakeY = 0;
        
        this.shieldScale = 1.0; 
        this.shieldBaseScale = 0.9;
        
        this.showSwipe = false;
        this.hitFlash = 0; 
        this.hitIntensity = 0;
        
        this.target = null;
        this.attacker = null;
        
        this.knockbackX = 0;
        this.knockbackY = 0;
        this.knockbackVel = 0;
    }

    addTextEffect(value, color) {
        this.visualEffects.push({
            type: 'text',
            value: value,
            color: color || '#fff',
            life: 0.8,
            x: 0, y: -25
        });
    }

    update(dt, allUnits, config) {
        this.updateVisuals(dt);

        if (this.state === STATES.DEAD) {
            if (this.knockbackVel > 0) {
                const knockbackDecay = config.knockbackDecay;
                const moveDist = this.knockbackVel * dt;
                this.x += this.knockbackX * moveDist;
                this.y += this.knockbackY * moveDist;
                this.knockbackVel *= knockbackDecay;
                if (this.knockbackVel < 2.0) {
                    this.knockbackVel = 0;
                    this.knockbackX = 0;
                    this.knockbackY = 0;
                }
            }
            return;
        }
        
        if (this.hp <= 0) { 
            this.die(config); 
            if (this.knockbackVel > 0) {
                const knockbackDecay = config.knockbackDecay;
                const moveDist = this.knockbackVel * dt;
                this.x += this.knockbackX * moveDist;
                this.y += this.knockbackY * moveDist;
                this.knockbackVel *= knockbackDecay;
                if (this.knockbackVel < 2.0) {
                    this.knockbackVel = 0;
                    this.knockbackX = 0;
                    this.knockbackY = 0;
                }
            }
            return; 
        }

        if (this.knockbackVel > 0) {
            const knockbackDecay = config.knockbackDecay;
            const moveDist = this.knockbackVel * dt;
            this.x += this.knockbackX * moveDist;
            this.y += this.knockbackY * moveDist;
            this.knockbackVel *= knockbackDecay;
            if (this.knockbackVel < 2.0) {
                this.knockbackVel = 0;
                this.knockbackX = 0;
                this.knockbackY = 0;
            }
        }

        this.recoverStamina(dt, config);

        let enemy = this.selectTarget(allUnits);
        this.target = enemy;

        if (enemy && enemy.state !== STATES.DEAD) {
            const dx = enemy.x - this.x;
            const dy = enemy.y - this.y;
            const targetAngle = Math.atan2(dy, dx);
            this.angle = targetAngle;
        }
        
        if (!enemy) return;

        if (this.stateTimer > 0) {
            this.stateTimer -= dt;
            
            if (this.state === STATES.PRE_ATTACK) {
                const totalTime = config.preDelay;
                const elapsed = totalTime - this.stateTimer;
                const progress = Math.min(1, elapsed / totalTime);
                this.offsetX = -3 * Math.sin(progress * Math.PI * 0.5);
                
                if (enemy && enemy.state !== STATES.DEAD && this.knockbackVel <= 0) {
                    const dist = this.distanceTo(enemy);
                    if (dist > this.range * 0.95) {
                        const dx = enemy.x - this.x;
                        const dy = enemy.y - this.y;
                        const moveDist = Math.hypot(dx, dy);
                        if (moveDist > 0) {
                            const approachSpeed = this.moveSpeed * 0.5;
                            const approachDist = approachSpeed * dt;
                            this.x += (dx / moveDist) * approachDist;
                            this.y += (dy / moveDist) * approachDist;
                            const staminaLoss = (approachSpeed / this.moveSpeed) * config.staminaRegen * dt;
                            this.stamina = Math.max(0, this.stamina - staminaLoss);
                        }
                    }
                }
            }

            if (this.stateTimer <= 0) {
                if (this.state === STATES.INTERVAL || this.state === STATES.DEFENDING) {
                    this.decideNextAction(enemy, config);
                } else if (this.state === STATES.PRE_ATTACK) {
                    this.executeAttack(enemy, config);
                }
            } else {
                if(this.state === STATES.DEFENDING) {
                    this.intent = INTENTS.DEFEND;
                    // 방어 중에도 인터벌 시간마다 공격 판단
                    if (this.defendingDecisionTimer > 0) {
                        this.defendingDecisionTimer -= dt;
                        if (this.defendingDecisionTimer <= 0) {
                            // 인터벌 시간이 지나면 공격으로 전환할 수 있는지 판단
                            const intervalTime = 1 / this.atkSpd;
                            this.defendingDecisionTimer = intervalTime; // 다음 판단 시간 설정
                            
                            // 상대가 공격 준비 중이 아니고, 자신이 공격할 수 있는 상황이면 판단
                            if (enemy && enemy.state !== STATES.PRE_ATTACK && 
                                this.stamina >= config.attackCost && 
                                this.distanceTo(enemy) <= this.range) {
                                this.decideNextAction(enemy, config);
                            }
                        }
                    } else {
                        // 첫 판단 타이머 설정
                        const intervalTime = 1 / this.atkSpd;
                        this.defendingDecisionTimer = intervalTime;
                    }
                }
            }
            return;
        }
        switch (this.state) {
            case STATES.RECOVER:
                this.intent = INTENTS.REST;
                if (this.stamina >= config.attackCost + 5) this.state = STATES.IDLE;
                break;

            case STATES.IDLE:
            case STATES.MOVING:
                if (this.knockbackVel > 0) {
                    break;
                }
                const dist = this.distanceTo(enemy);
                if (dist <= this.range) {
                    if (this.stamina < config.attackCost) {
                        this.state = STATES.RECOVER;
                        if (window.sim) window.sim.log(`${this.teamName()}: 지침 (휴식)`, 'log-info');
                    } else {
                        this.startAttack(config);
                    }
                } else {
                    this.state = STATES.MOVING;
                    this.intent = INTENTS.ENGAGE;
                    this.moveTowards(enemy, dt, config, allUnits);
                }
                break;
        }
    }

    updateVisuals(dt) {
        this.visualEffects.forEach(e => { e.life -= dt; e.y -= 15 * dt; });
        this.visualEffects = this.visualEffects.filter(e => e.life > 0);

        if (this.hitFlash > 0) {
            this.hitFlash -= dt * 5; 
            if (this.hitFlash < 0) {
                this.hitFlash = 0;
                this.shakeX = 0;
                this.shakeY = 0;
            } else {
                const shakeMag = Math.min(4, 1 + (this.hitIntensity / 10)) * (this.hitFlash); 
                this.shakeX = (Math.random() - 0.5) * shakeMag * 2;
                this.shakeY = (Math.random() - 0.5) * shakeMag * 2;
            }
        }

        if (this.animState === 'ATTACK') {
            this.animTimer += dt;
            const duration = 0.3;
            const progress = Math.min(1, this.animTimer / duration);

            if (progress < 0.3) {
                const t = progress / 0.3;
                this.offsetX = -3 + (13 * t); 
                this.showSwipe = true;
            } else {
                const t = (progress - 0.3) / 0.7;
                this.offsetX = 10 * (1 - t); 
                this.showSwipe = false;
            }

            if (progress >= 1) {
                this.animState = 'IDLE';
                this.offsetX = 0;
                this.showSwipe = false;
            }
        } 
        else if (this.animState === 'DEFEND') {
            this.animTimer += dt;
            const duration = 0.4;
            const progress = Math.min(1, this.animTimer / duration);

            if (progress < 0.2) {
                const t = progress / 0.2;
                this.shieldScale = this.shieldBaseScale + (0.25 * Math.sin(t * Math.PI)); 
            } else {
                this.shieldScale = this.shieldBaseScale;
            }

            if (progress >= 1) {
                this.animState = 'IDLE';
                this.shieldScale = this.shieldBaseScale;
            }
        } 
        else {
            const diff = this.shieldBaseScale - this.shieldScale;
            if (Math.abs(diff) > 0.001) this.shieldScale += diff * dt * 5;
            else this.shieldScale = this.shieldBaseScale;
            
            if (this.state !== STATES.PRE_ATTACK) {
                this.offsetX *= 0.9;
            }
        }
    }

    decideNextAction(enemy, config) {
        const moraleRatio = this.morale / this.maxMorale;
        let atkProb = 0;

        if (moraleRatio <= config.moraleThreshold) {
            atkProb = config.atkProbMin;
        } else {
            atkProb = config.atkProbMin + (moraleRatio - config.moraleThreshold) * (config.atkProbMax - config.atkProbMin) / (1.0 - config.moraleThreshold);
        }

        if (enemy.state === STATES.PRE_ATTACK) atkProb *= 0.5;

        if (Math.random() < atkProb) {
            this.state = STATES.IDLE;
            this.defendingDecisionTimer = 0; // 방어 타이머 초기화
        } else {
            this.state = STATES.DEFENDING;
            this.stateTimer = config.defendingDuration;
            this.defendingDecisionTimer = 0; // 판단 타이머 초기화 (다음 프레임에서 설정됨)
            this.intent = INTENTS.DEFEND;
        }
    }

    moveTowards(target, dt, config, allUnits) {
        if (target.state === STATES.DEAD) return;
        
        if (this.knockbackVel > 0) {
            return;
        }
        
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const dist = Math.hypot(dx, dy);
        
        if (dist <= this.range) {
            this.state = STATES.IDLE;
            return;
        }

        const moveMult = 1.2;
        const targetX = this.x + (dx / dist) * (this.moveSpeed * moveMult * dt);
        const targetY = this.y + (dy / dist) * (this.moveSpeed * moveMult * dt);
        const obstructionMult = this.checkMovementObstruction(allUnits, targetX, targetY, config);
        
        if (obstructionMult <= 0) {
            return;
        }
        
        const speed = this.moveSpeed * moveMult * obstructionMult;
        const moveDist = speed * dt;
        this.x += (dx / dist) * moveDist;
        this.y += (dy / dist) * moveDist;
        const staminaLoss = (moveMult - 1.0) * config.staminaRegen * dt;
        this.stamina = Math.max(0, this.stamina - staminaLoss);
    }

    recoverStamina(dt, config) {
        if (this.stamina < this.maxStamina) {
            // 인터벌 상태일 때만 회복 보너스 적용
            const bonus = (this.state === STATES.INTERVAL) ? config.intervalStaminaBonus : 1.0;
            const regenAmount = config.staminaRegen * bonus * dt;
            this.stamina = Math.min(this.maxStamina, this.stamina + regenAmount);
        }
    }

    startAttack(config) {
        this.state = STATES.PRE_ATTACK;
        this.stateTimer = config.preDelay;
        this.intent = INTENTS.ATTACK;
        this.addTextEffect('!', '#fbbf24');
    }

    executeAttack(enemy, config) {
        if (enemy.state === STATES.DEAD) { this.state = STATES.IDLE; return; }

        this.animState = 'ATTACK';
        this.animTimer = 0;

        const moraleRatio = this.morale / this.maxMorale;
        const staminaRatio = this.stamina / this.maxStamina;

        const moraleFactor = (1 - config.moraleInf) + (config.moraleInf * Math.max(0, moraleRatio));
        const staminaFactor = (1 - config.staminaInf) + (config.staminaInf * Math.max(0, staminaRatio));
        
        let rawDamage = this.atk * moraleFactor * staminaFactor; 
        
        this.stamina -= config.attackCost;

        if (window.sim) window.sim.log(`${this.teamName()}: 공격 (위력 ${rawDamage.toFixed(1)})`, 'log-attack');
        
        enemy.receiveAttack(rawDamage, this, config);

        const intervalTime = 1 / this.atkSpd;
        this.state = STATES.INTERVAL;
        this.stateTimer = intervalTime;
        this.intent = INTENTS.NONE;
    }

    receiveAttack(damage, attacker, config) {
        this.attacker = attacker;
        
        // 전체 데미지 감소 보정 적용
        damage = damage * config.damageReduction;
        
        const canAct = (this.state === STATES.IDLE || this.state === STATES.DEFENDING || this.state === STATES.MOVING);
        
        if (!canAct) {
             this.applyDamage(damage, false, config, attacker);
             return;
        }

        const canBlock = this.shield > 0;
        const lowStamina = this.stamina < config.evadeCost;
        const isDefending = (this.state === STATES.DEFENDING);
        
        let choice = 'NONE';
        if (lowStamina) {
            choice = canBlock ? 'BLOCK' : 'NONE';
        } else {
            let blockChance = canBlock ? (isDefending ? 0.9 : 0.7) : 0;
            choice = Math.random() < blockChance ? 'BLOCK' : 'EVADE';
        }

        if (choice === 'EVADE') {
            const shieldPen = 1 - (this.shield / 20 * config.shieldPen);
            const armorPen = 1 - (this.armor / 20 * config.armorPen);
            const stamRatio = this.stamina / this.maxStamina;
            let evadeMult = config.evadeBonus;
            
            let chance = config.baseEvade * evadeMult * stamRatio * Math.max(0, shieldPen) * Math.max(0, armorPen);

            if (Math.random() < chance) {
                this.stamina -= config.evadeCost;
                
                const morRec = this.maxMorale * 0.33;
                this.morale = Math.min(this.maxMorale, this.morale + morRec);
                
                this.addTextEffect('회피!', '#4ade80');
                if (window.sim) window.sim.log(`${this.teamName()}: 회피 성공! (사기 +${morRec.toFixed(1)})`, 'log-evade');
                
                const dx = this.x - attacker.x;
                const dy = this.y - attacker.y;
                const dist = Math.hypot(dx, dy);
                if(dist>0) { 
                    this.x += (dx/dist)*15;
                    this.y += (dy/dist)*15;
                }

                this.state = STATES.INTERVAL;
                this.stateTimer = config.intervalEvade;
                this.intent = INTENTS.NONE;
                return;
            } else {
                if (window.sim) window.sim.log(`${this.teamName()}: 회피 실패 (확률 ${(chance*100).toFixed(0)}%)`, 'log-info');
            }
        } 
        
        if (choice === 'BLOCK' || (choice === 'EVADE' && canBlock)) {
            let defBonus = (choice === 'BLOCK' || isDefending) ? config.defBonus : 1.0;
            
            // 선형 스케일링 + 방어태세 보너스
            const defendingMult = isDefending ? config.defendingBonus : 1.0;
            const shieldDef = this.shield * config.shieldBaseMult * defBonus * defendingMult;
            const armorDef = this.armor * config.armorBaseMult * defendingMult;
            const totalDef = shieldDef + armorDef;
            
            const finalDmg = Math.max(0, damage - totalDef);
            
            this.hp = Math.max(0, this.hp - finalDmg);
            this.applyMoraleDamage(finalDmg);

            this.addTextEffect(`방어 ${finalDmg.toFixed(0)}`, '#60a5fa');
            if (window.sim) window.sim.log(`${this.teamName()}: 방어 (감쇄 ${totalDef.toFixed(1)}) -> 피해 ${finalDmg.toFixed(1)}`, 'log-defend');
            
            if (attacker) {
                this.applyKnockback(attacker, damage, config, false);
            }
            
            this.animState = 'DEFEND';
            this.animTimer = 0;
            this.shieldScale = 0.85;

            // 방어 태세 중이었다면 방어 태세 유지, 아니면 INTERVAL
            if (isDefending && this.stateTimer > 0) {
                // 방어 태세 유지 (타이머는 그대로)
                this.intent = INTENTS.DEFEND;
            } else {
                // 방어 태세가 아니었거나 타이머가 끝났으면 INTERVAL
                this.state = STATES.INTERVAL;
                this.stateTimer = config.intervalBlock;
                this.intent = INTENTS.NONE;
            }
            return;
        }

        this.applyDamage(damage, true, config, attacker);
    }

    applyDamage(damage, passiveMitigation, config, attacker = null) {
        let finalDmg = damage;
        if (passiveMitigation) {
            // 선형 스케일링 - 수동 감쇄는 방어태세 보너스 없음
            const shieldDef = this.shield * config.shieldBaseMult;
            const armorDef = this.armor * config.armorBaseMult;
            const totalDef = shieldDef + armorDef;
            finalDmg = Math.max(0, damage - totalDef);
        } else {
            // 행동 불가 상태여도 갑옷은 항상 착용하고 있으므로 기본 방어력 적용
            // 방패는 들 수 없으므로 적용하지 않음
            const armorDef = this.armor * config.armorBaseMult;
            finalDmg = Math.max(0, damage - armorDef);
        }
        
        const wasAlive = this.hp > 0;
        this.hp = Math.max(0, this.hp - finalDmg);
        this.applyMoraleDamage(finalDmg);
        
        if (attacker) {
            const isDeath = wasAlive && this.hp <= 0;
            this.applyKnockback(attacker, damage, config, isDeath);
        }
        
        this.hitIntensity = finalDmg;
        this.hitFlash = 1.0;
        
        this.addTextEffect(`-${finalDmg.toFixed(1)}`, '#f87171');
        if (window.sim) window.sim.log(`${this.teamName()}: 피격 ${finalDmg.toFixed(1)}`, 'log-attack');
    }
    
    applyKnockback(attacker, damage, config, isDeath = false) {
        if (!attacker || attacker.state === STATES.DEAD) return;
        
        const damageRatio = damage / this.maxHp;
        let knockbackDist = damageRatio * config.knockbackMaxDist;
        
        // 공격자와 피격자의 질량 차이 반영
        const massRatio = attacker.mass / this.mass;
        const clampedMassRatio = Math.max(0.5, Math.min(2.0, massRatio)); // 0.5배 ~ 2.0배로 제한
        knockbackDist *= clampedMassRatio;
        
        if (isDeath) {
            knockbackDist *= config.deathKnockbackMult;
        }
        
        const minKnockbackDist = 0.15;
        knockbackDist = Math.max(knockbackDist, minKnockbackDist);
        
        if (knockbackDist > 0) {
            const dx = this.x - attacker.x;
            const dy = this.y - attacker.y;
            const dist = Math.hypot(dx, dy);
            
            if (dist > 0) {
                this.knockbackX = dx / dist;
                this.knockbackY = dy / dist;
                this.knockbackVel = knockbackDist * config.knockbackForceMult;
            }
        }
    }

    applyMoraleDamage(dmg) {
        const loss = (dmg / this.maxHp) * 30; 
        this.morale = Math.max(0, this.morale - loss);
    }

    die(config = null) {
        this.state = STATES.DEAD;
        this.hp = 0;
        if (window.sim) window.sim.log(`${this.teamName()}: 사망 (사기 0)`, 'log-attack font-bold');
    }

    distanceTo(other) { return Math.hypot(other.x - this.x, other.y - this.y); }
    teamName() { return this.team === 'A' ? '🔵' : '🔴'; }
    
    getOccupancyRadius() {
        return this.radius;
    }
    
    checkMovementObstruction(allUnits, targetX, targetY, config) {
        let speedMultiplier = 1.0;
        const moveDirX = targetX - this.x;
        const moveDirY = targetY - this.y;
        const moveDist = Math.hypot(moveDirX, moveDirY);
        if (moveDist === 0) return speedMultiplier;
        
        const moveDirNormX = moveDirX / moveDist;
        const moveDirNormY = moveDirY / moveDist;
        
        for (let other of allUnits) {
            if (other === this || other.state === STATES.DEAD) continue;
            
            const dx = other.x - this.x;
            const dy = other.y - this.y;
            const dist = Math.hypot(dx, dy);
            const otherRadius = other.getOccupancyRadius();
            const myRadius = this.getOccupancyRadius();
            const combinedRadius = myRadius + otherRadius;
            
            if (dist > combinedRadius * 2) continue;
            
            const isEnemy = (other.team !== this.team);
            const isAlly = (other.team === this.team);
            
            if (isEnemy) {
                const blockRadius = otherRadius * Math.sqrt(config.enemyBlockArea);
                if (dist < blockRadius) {
                    return 0;
                }
                
                const meleeRadius = otherRadius;
                if (dist < meleeRadius && dist >= blockRadius) {
                    const meleeProgress = (dist - blockRadius) / (meleeRadius - blockRadius);
                    const slowAmount = config.enemyMaxSlow * (1 - meleeProgress);
                    speedMultiplier = Math.min(speedMultiplier, 1.0 - slowAmount);
                }
            } else if (isAlly) {
                const passRadius = otherRadius * Math.sqrt(config.allyPassArea);
                if (dist < passRadius) {
                    const meleeProgress = dist / passRadius;
                    const slowAmount = config.allyMaxSlow * (1 - meleeProgress);
                    speedMultiplier = Math.min(speedMultiplier, 1.0 - slowAmount);
                }
            }
        }
        
        return speedMultiplier;
    }
    
    selectTarget(allUnits) {
        const enemies = allUnits.filter(u => u.team !== this.team && u.state !== STATES.DEAD);
        if (enemies.length === 0) return null;
        
        const teamUnits = allUnits.filter(u => u.team === this.team && u !== this && u.state !== STATES.DEAD);
        const alreadyTargeted = new Set(teamUnits.map(u => u.target).filter(t => t !== null));
        
        if (this.attacker && enemies.includes(this.attacker)) {
            return this.attacker;
        }
        
        let targetingMe = enemies.find(e => e.target === this);
        if (targetingMe) {
            return targetingMe;
        }
        
        const freeEnemies = enemies.filter(e => !alreadyTargeted.has(e));
        
        let nearest = null;
        let nearestDist = Infinity;
        for (let e of freeEnemies) {
            const dist = this.distanceTo(e);
            if (dist < nearestDist) {
                nearestDist = dist;
                nearest = e;
            }
        }
        
        if (!nearest) {
            for (let e of enemies) {
                const dist = this.distanceTo(e);
                if (dist < nearestDist) {
                    nearestDist = dist;
                    nearest = e;
                }
            }
        }
        
        let lowestHp = null;
        let lowestHpRatio = Infinity;
        for (let e of freeEnemies) {
            const hpRatio = e.hp / e.maxHp;
            if (hpRatio < lowestHpRatio) {
                lowestHpRatio = hpRatio;
                lowestHp = e;
            }
        }
        
        if (lowestHp && this.distanceTo(lowestHp) < nearestDist * 1.5) {
            return lowestHp;
        }
        
        return nearest;
    }

    draw(ctx) {
        ctx.save();
        
        const drawX = this.x + this.shakeX;
        const drawY = this.y + this.shakeY;

        ctx.translate(drawX, drawY);
        ctx.rotate(this.angle);
        ctx.translate(this.offsetX, 0);

        const isDead = (this.state === STATES.DEAD);

        let finalColor, highlightColor;

        if (isDead) {
            if (this.team === 'A') {
                finalColor = "rgb(45, 65, 100)"; 
                highlightColor = "rgb(65, 85, 120)"; 
            } else {
                finalColor = "rgb(100, 45, 45)";
                highlightColor = "rgb(120, 65, 65)";
            }
        } else {
            if (this.hitFlash > 0) {
                const t = this.hitFlash * 0.8; 
                
                const moraleRatio = this.morale / this.maxMorale;
                const colorRetention = 0.3 + (0.7 * moraleRatio);
                const baseColor = this.team === 'A' ? {r:59, g:130, b:246} : {r:239, g:68, b:68};
                const grayColor = {r:100, g:116, b:139};
                
                const rBase = Math.round(grayColor.r + (baseColor.r - grayColor.r) * colorRetention);
                const gBase = Math.round(grayColor.g + (baseColor.g - grayColor.g) * colorRetention);
                const bBase = Math.round(grayColor.b + (baseColor.b - grayColor.b) * colorRetention);

                const r = Math.round(rBase + (255 - rBase) * t);
                const g = Math.round(gBase + (255 - gBase) * t);
                const b = Math.round(bBase + (255 - bBase) * t);
                
                finalColor = `rgb(${r},${g},${b})`;
                highlightColor = "#ffffff";
        } else {
            const moraleRatio = this.morale / this.maxMorale;
            const colorRetention = 0.3 + (0.7 * moraleRatio);
            const baseColor = this.team === 'A' ? {r:59, g:130, b:246} : {r:239, g:68, b:68};
            const grayColor = {r:100, g:116, b:139};

            const r = Math.round(grayColor.r + (baseColor.r - grayColor.r) * colorRetention);
            const g = Math.round(grayColor.g + (baseColor.g - grayColor.g) * colorRetention);
            const b = Math.round(grayColor.b + (baseColor.b - grayColor.b) * colorRetention);
            finalColor = `rgb(${r},${g},${b})`;
            highlightColor = this.lightenColor(r, g, b, 40);
        }
        }

        ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
        ctx.shadowBlur = isDead ? 2 : 8;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;

        if (this.showSwipe) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(6, 0, this.radius + 8, -Math.PI/3, Math.PI/3);
            ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
            ctx.lineWidth = 8; 
            ctx.lineCap = "round";
            ctx.stroke();
            ctx.restore();
        }

        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        const gradient = ctx.createRadialGradient(-5, -5, 2, 0, 0, this.radius);
        gradient.addColorStop(0, highlightColor);
        gradient.addColorStop(1, finalColor);
        ctx.fillStyle = gradient;
        ctx.fill();

        if (isDead) {
            if (this.team === 'A') ctx.strokeStyle = "#475569"; 
            else ctx.strokeStyle = "#5c4848"; 
            ctx.lineWidth = 1.5; 
            ctx.stroke();
        } else {
            const staminaRatio = this.stamina / this.maxStamina;
            const alpha = 0.3 + (0.7 * staminaRatio);
            const lineWidth = 1 + (2 * staminaRatio);
            ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.lineWidth = lineWidth;
            ctx.stroke();
        }

        ctx.shadowColor = "transparent";

        if (!isDead) {
            const moraleRatio = this.morale / this.maxMorale;
            
            ctx.beginPath();
            const arrowDist = this.radius - 3;
            ctx.moveTo(arrowDist, 0);
            ctx.lineTo(arrowDist - 7, -5);
            ctx.lineTo(arrowDist - 7, 5);
            ctx.closePath();
            ctx.fillStyle = `rgba(255, 255, 255, ${0.5 + 0.5 * moraleRatio})`;
            ctx.fill();

            if (this.shield > 0) {
                const s = Math.max(0.1, this.shieldScale); 
                const shieldR = this.radius + 6;
                const isBlocking = s > 1.0; 
                const shieldColor = isBlocking ? "#fffbeb" : "#fbbf24"; 
                const shieldWidth = isBlocking ? 4 : 3; 

                ctx.beginPath();
                ctx.arc(s * 1, 0, shieldR * s, -Math.PI/4, Math.PI/4);
                ctx.strokeStyle = shieldColor; 
                ctx.lineWidth = shieldWidth;
                ctx.lineCap = "round";
                ctx.stroke();
                
                if (!isBlocking) {
                    ctx.beginPath();
                    ctx.arc(s*1, 0, shieldR * s, -Math.PI/8, 0);
                    ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }
            }
        }

        ctx.restore();

        if (!isDead) {
            const barX = drawX - 16; 
            const barY = drawY + this.radius + 10;
            const barW = 32;
            const barH = 5;

            ctx.fillStyle = "rgba(15, 23, 42, 0.8)";
            ctx.fillRect(barX, barY, barW, barH);
            
            const hpPercent = this.hp / this.maxHp;
            let hpColor = "#22c55e"; 
            if(hpPercent < 0.5) hpColor = "#eab308"; 
            if(hpPercent < 0.2) hpColor = "#ef4444"; 

            ctx.fillStyle = hpColor;
            ctx.fillRect(barX, barY, barW * hpPercent, barH);
            
            ctx.strokeStyle = "rgba(0,0,0,0.5)";
            ctx.lineWidth = 1;
            ctx.strokeRect(barX, barY, barW, barH);

            // 말풍선은 showUnitIntents가 true일 때만 표시
            if (window.sim && window.sim.showUnitIntents) {
                ctx.fillStyle = 'rgba(255,255,255,0.85)';
                const bubbleX = drawX - 30;
                const bubbleY = drawY - 45;
                
                ctx.beginPath(); 
                if (ctx.roundRect) {
                    ctx.roundRect(bubbleX, bubbleY, 60, 18, 4);
                } else {
                    ctx.rect(bubbleX, bubbleY, 60, 18);
                }
                ctx.fill();
                ctx.fillStyle = '#1e293b'; ctx.font = 'bold 9px sans-serif';
                ctx.textAlign = 'center';             ctx.textBaseline = 'middle';
                ctx.fillText(this.intent, drawX, bubbleY + 9);
            }

            this.visualEffects.forEach(e => {
                ctx.save(); ctx.globalAlpha = e.life;
                ctx.font = 'bold 12px sans-serif'; ctx.fillStyle = e.color;
                ctx.strokeStyle = '#000'; ctx.lineWidth = 2;
                ctx.strokeText(e.value, drawX + e.x, drawY + e.y);
                ctx.fillText(e.value, drawX + e.x, drawY + e.y);
                ctx.restore();
            });
        }
    }

    lightenColor(r, g, b, amt) {
        var nr = r + amt; if (nr > 255) nr = 255; else if (nr < 0) nr = 0;
        var ng = g + amt; if (ng > 255) ng = 255; else if (ng < 0) ng = 0;
        var nb = b + amt; if (nb > 255) nb = 255; else if (nb < 0) nb = 0;
        return `rgb(${nr},${ng},${nb})`;
    }
}

