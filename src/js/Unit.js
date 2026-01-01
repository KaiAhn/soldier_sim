/**
 * Unit.js - 유닛 클래스
 * 로직과 렌더링이 철저히 분리됨 (Unity 포팅 대비)
 */

import { STATES, INTENTS, RANGE_SCALE } from './Config.js';

export class Unit {
    constructor(id, team, x, y, stats) {
        this.id = id;
        this.team = team;
        this.x = x;
        this.y = y;
        
        // Stats
        this.maxHp = stats.hp;
        this.hp = stats.hp;
        this.atk = stats.atk;
        this.atkSpd = stats.as;
        this.range = stats.rng * RANGE_SCALE; // Convert to pixels
        this.moveSpeed = stats.spd;
        this.shield = stats.shd;
        this.armor = stats.arm;
        this.maxStamina = stats.mst;
        this.stamina = stats.mst;
        this.maxMorale = stats.mor;
        this.morale = stats.mor;
        
        // State
        this.state = STATES.IDLE;
        this.stateTimer = 0;
        this.intent = INTENTS.ENGAGE;
        
        // Animation (렌더링용 데이터지만 로직에서 계산)
        this.animOffsetX = 0;
        this.animOffsetY = 0;
        this.visualEffects = []; 
        
        // Rendering properties
        this.radius = 12;
        this.color = team === 'A' ? '#3b82f6' : '#ef4444';

        // 외부 의존성 (로그, 게임 종료 콜백)
        this.logCallback = null;
        this.endGameCallback = null;
    }

    setCallbacks(logCallback, endGameCallback) {
        this.logCallback = logCallback;
        this.endGameCallback = endGameCallback;
    }

    addEffect(type, value, color) {
        this.visualEffects.push({
            type: type,
            value: value,
            color: color || '#fff',
            life: 0.8,
            x: 0, y: -20
        });
    }

    /**
     * 순수 로직 업데이트 (Canvas API 사용 금지)
     * 좌표 계산, 상태 판단, 데미지 공식, 쿨타임 처리 등만 수행
     */
    update(dt, enemy, config) {
        // 애니메이션 효과 업데이트 (데이터만 계산)
        this.visualEffects.forEach(e => { e.life -= dt; e.y -= 15 * dt; });
        this.visualEffects = this.visualEffects.filter(e => e.life > 0);
        this.animOffsetX *= 0.9;
        this.animOffsetY *= 0.9;

        if (this.state === STATES.DEAD) return;
        if (this.hp <= 0) { 
            this.die(); 
            return; 
        }

        this.recoverStamina(dt, config);

        // State Machine
        if (this.stateTimer > 0) {
            this.stateTimer -= dt;
            if (this.stateTimer <= 0) {
                // Timer finished, transition logic
                if (this.state === STATES.INTERVAL || this.state === STATES.DEFENDING) {
                    this.decideNextAction(enemy, config);
                } else if (this.state === STATES.PRE_ATTACK) {
                    this.executeAttack(enemy, config);
                }
            } else {
                // During timer
                if(this.state === STATES.DEFENDING) this.intent = INTENTS.DEFEND;
            }
            return; // Busy
        }

        // Logic when not busy (IDLE, MOVING, RECOVER)
        switch (this.state) {
            case STATES.RECOVER:
                this.intent = INTENTS.REST;
                if (this.stamina >= config.attackCost + 5) this.state = STATES.IDLE;
                break;

            case STATES.IDLE:
            case STATES.MOVING:
                const dist = this.distanceTo(enemy);
                if (dist <= this.range) {
                    // In Range
                    if (this.stamina < config.attackCost) {
                        this.state = STATES.RECOVER;
                        if (this.logCallback) this.logCallback(`${this.teamName()}: 지침 (휴식)`, 'log-info');
                    } else {
                        this.startAttack(config);
                    }
                } else {
                    // Chase
                    this.state = STATES.MOVING;
                    this.intent = INTENTS.ENGAGE;
                    this.moveTowards(enemy, dt, config);
                }
                break;
        }
    }

    decideNextAction(enemy, config) {
        // Logic: Calculate Attack Probability based on Morale
        const moraleRatio = this.morale / this.maxMorale;
        let atkProb = 0;

        // Linear interpolation formula
        if (moraleRatio <= config.moraleThreshold) {
            atkProb = config.atkProbMin;
        } else {
            atkProb = config.atkProbMin + (moraleRatio - config.moraleThreshold) * (config.atkProbMax - config.atkProbMin) / (1.0 - config.moraleThreshold);
        }

        // Target condition check
        if (enemy.state === STATES.PRE_ATTACK) {
            atkProb *= 0.5;
        }

        // Roll
        if (Math.random() < atkProb) {
            this.state = STATES.IDLE; 
        } else {
            this.state = STATES.DEFENDING;
            this.stateTimer = 0.5;
            this.intent = INTENTS.DEFEND;
        }
    }

    moveTowards(target, dt, config) {
        if (target.state === STATES.DEAD) return;
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const dist = Math.hypot(dx, dy);
        
        if (dist <= this.range) {
            this.state = STATES.IDLE;
            return;
        }

        const speed = this.moveSpeed * config.moveMult;
        const moveDist = speed * dt;
        this.x += (dx / dist) * moveDist;
        this.y += (dy / dist) * moveDist;
    }

    recoverStamina(dt, config) {
        if (this.stamina < this.maxStamina) {
            this.stamina = Math.min(this.maxStamina, this.stamina + (config.staminaRegen * dt));
        }
    }

    startAttack(config) {
        this.state = STATES.PRE_ATTACK;
        this.stateTimer = config.preDelay;
        this.intent = INTENTS.ATTACK;
        this.addEffect('text', '!', '#fbbf24');
    }

    executeAttack(enemy, config) {
        if (enemy.state === STATES.DEAD) { this.state = STATES.IDLE; return; }

        // Animation offset 계산 (로직)
        const dx = enemy.x - this.x;
        const dy = enemy.y - this.y;
        const dist = Math.hypot(dx, dy);
        this.animOffsetX = (dx/dist) * 10;
        this.animOffsetY = (dy/dist) * 10;

        // Damage Calculation (순수 로직)
        const moraleRatio = this.morale / this.maxMorale;
        const staminaRatio = this.stamina / this.maxStamina;

        // Clamp to ensure positive
        const moraleFactor = (1 - config.moraleInf) + (config.moraleInf * Math.max(0, moraleRatio));
        const staminaFactor = (1 - config.staminaInf) + (config.staminaInf * Math.max(0, staminaRatio));
        
        let rawDamage = this.atk * moraleFactor * staminaFactor; 
        
        // Stamina Cost
        this.stamina -= config.attackCost;

        if (this.logCallback) this.logCallback(`${this.teamName()}: 공격 (위력 ${rawDamage.toFixed(1)})`, 'log-attack');
        
        enemy.receiveAttack(rawDamage, this, config);

        // Interval
        const intervalTime = 1 / this.atkSpd;
        this.state = STATES.INTERVAL;
        this.stateTimer = intervalTime;
        this.intent = INTENTS.NONE;
    }

    receiveAttack(damage, attacker, config) {
        const canAct = (this.state === STATES.IDLE || this.state === STATES.DEFENDING || this.state === STATES.MOVING);
        
        if (!canAct) {
             this.applyDamage(damage, false, config);
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

        // 1. Evade
        if (choice === 'EVADE') {
            const shieldPen = 1 - (this.shield / 20 * config.shieldPen);
            const armorPen = 1 - (this.armor / 20 * config.armorPen);
            const stamRatio = this.stamina / this.maxStamina;
            let evadeMult = config.evadeBonus;
            
            let chance = config.baseEvade * evadeMult * stamRatio * Math.max(0, shieldPen) * Math.max(0, armorPen);

            if (Math.random() < chance) {
                // SUCCESS
                this.stamina -= config.evadeCost;
                
                const morRec = this.maxMorale * 0.33;
                this.morale = Math.min(this.maxMorale, this.morale + morRec);
                
                this.addEffect('text', '회피!', '#4ade80');
                this.addEffect('flash', '', '#4ade80');
                if (this.logCallback) this.logCallback(`${this.teamName()}: 회피 성공! (사기 +${morRec.toFixed(1)})`, 'log-evade');
                
                // Slide back (애니메이션 오프셋 계산)
                const dx = this.x - attacker.x;
                const dy = this.y - attacker.y;
                const dist = Math.hypot(dx, dy);
                if(dist>0) { 
                    this.animOffsetX = (dx/dist)*15; 
                    this.animOffsetY = (dy/dist)*15; 
                }

                this.state = STATES.INTERVAL;
                this.stateTimer = config.intervalEvade;
                this.intent = INTENTS.NONE;
                return;
            } else {
                if (this.logCallback) this.logCallback(`${this.teamName()}: 회피 실패 (확률 ${(chance*100).toFixed(0)}%)`, 'log-info');
            }
        } 
        
        // 2. Block
        if (choice === 'BLOCK' || (choice === 'EVADE' && canBlock)) {
            let defBonus = (choice === 'BLOCK' || isDefending) ? config.defBonus : 1.0;
            
            const shieldDef = this.shield * 0.8 * defBonus;
            const armorDef = this.armor * 0.5;
            const totalDef = shieldDef + armorDef;
            
            const finalDmg = Math.max(0, damage - totalDef);
            
            this.hp -= finalDmg;
            this.applyMoraleDamage(finalDmg);

            this.addEffect('text', `방어 ${finalDmg.toFixed(0)}`, '#60a5fa');
            if (this.logCallback) this.logCallback(`${this.teamName()}: 방어 (감쇄 ${totalDef.toFixed(1)}) -> 피해 ${finalDmg.toFixed(1)}`, 'log-defend');
            
            this.state = STATES.INTERVAL;
            this.stateTimer = config.intervalBlock;
            this.intent = INTENTS.NONE;
            return;
        }

        // 3. Full Damage
        this.applyDamage(damage, true, config);
    }

    applyDamage(damage, passiveMitigation, config) {
        let finalDmg = damage;
        if (passiveMitigation) {
            finalDmg = Math.max(0, damage - (this.armor * 0.5));
        }
        
        this.hp -= finalDmg;
        this.applyMoraleDamage(finalDmg);
        
        this.addEffect('text', `-${finalDmg.toFixed(1)}`, '#f87171');
        this.addEffect('flash', '', '#f87171');
        this.animOffsetX = (Math.random()-0.5) * 15;
        this.animOffsetY = (Math.random()-0.5) * 15;

        if (this.logCallback) this.logCallback(`${this.teamName()}: 피격 ${finalDmg.toFixed(1)}`, 'log-attack');
    }

    applyMoraleDamage(dmg) {
        const loss = (dmg / this.maxHp) * 30; 
        this.morale = Math.max(0, this.morale - loss);
    }

    die() {
        this.state = STATES.DEAD;
        this.addEffect('text', '사망', '#000');
        if (this.logCallback) this.logCallback(`${this.teamName()}: 사망 (사기 0)`, 'log-attack font-bold');
        if (this.endGameCallback) {
            const winnerTeam = this.team === 'A' ? 'B' : 'A';
            this.endGameCallback(winnerTeam);
        }
    }

    distanceTo(other) { 
        return Math.hypot(other.x - this.x, other.y - this.y); 
    }

    teamName() { 
        return this.team === 'A' ? '🔵' : '🔴'; 
    }

    /**
     * 렌더링 전용 메서드 (Canvas API만 사용)
     * 오직 ctx를 사용하여 화면에 그림을 그리는 코드만 포함
     */
    draw(ctx) {
        if (this.state === STATES.DEAD) return;

        const drawX = this.x + this.animOffsetX;
        const drawY = this.y + this.animOffsetY;

        // Range
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.range, 0, Math.PI * 2);
        ctx.strokeStyle = this.color + '22';
        ctx.setLineDash([4, 4]); 
        ctx.stroke(); 
        ctx.setLineDash([]);

        // Body
        ctx.shadowBlur = 8; 
        ctx.shadowColor = this.color;
        ctx.beginPath();
        ctx.arc(drawX, drawY, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color; 
        ctx.fill();
        ctx.shadowBlur = 0;

        // Shield
        if (this.shield > 0) {
            ctx.beginPath();
            ctx.arc(drawX, drawY, this.radius + 5, -Math.PI/2, Math.PI/2);
            ctx.strokeStyle = '#fbbf24'; 
            ctx.lineWidth = 3; 
            ctx.stroke();
        }

        // Stats Bars
        const barW = 32; 
        const barH = 4; 
        const barX = drawX - barW/2;
        
        // HP
        ctx.fillStyle = '#475569'; 
        ctx.fillRect(barX, drawY + 20, barW, barH);
        ctx.fillStyle = '#ef4444'; 
        ctx.fillRect(barX, drawY + 20, barW * (this.hp / this.maxHp), barH);
        
        // Stamina
        ctx.fillStyle = '#475569'; 
        ctx.fillRect(barX, drawY + 25, barW, barH);
        ctx.fillStyle = '#eab308'; 
        ctx.fillRect(barX, drawY + 25, barW * (this.stamina / this.maxStamina), barH);

        // Morale
        ctx.fillStyle = '#475569'; 
        ctx.fillRect(barX, drawY + 30, barW, barH);
        ctx.fillStyle = '#8b5cf6'; 
        ctx.fillRect(barX, drawY + 30, barW * (this.morale / this.maxMorale), barH);

        // Intent Bubble
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.beginPath(); 
        if (ctx.roundRect) {
            ctx.roundRect(drawX - 30, drawY - 40, 60, 18, 4); 
        } else {
            // Fallback for browsers without roundRect
            const rx = 4, ry = 4, w = 60, h = 18;
            ctx.moveTo(drawX - 30 + rx, drawY - 40);
            ctx.lineTo(drawX - 30 + w - rx, drawY - 40);
            ctx.quadraticCurveTo(drawX - 30 + w, drawY - 40, drawX - 30 + w, drawY - 40 + ry);
            ctx.lineTo(drawX - 30 + w, drawY - 40 + h - ry);
            ctx.quadraticCurveTo(drawX - 30 + w, drawY - 40 + h, drawX - 30 + w - rx, drawY - 40 + h);
            ctx.lineTo(drawX - 30 + rx, drawY - 40 + h);
            ctx.quadraticCurveTo(drawX - 30, drawY - 40 + h, drawX - 30, drawY - 40 + h - ry);
            ctx.lineTo(drawX - 30, drawY - 40 + ry);
            ctx.quadraticCurveTo(drawX - 30, drawY - 40, drawX - 30 + rx, drawY - 40);
            ctx.closePath();
        }
        ctx.fill();
        ctx.fillStyle = '#1e293b'; 
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center'; 
        ctx.textBaseline = 'middle';
        ctx.fillText(this.intent, drawX, drawY - 31);

        // Effects
        this.visualEffects.forEach(e => {
            ctx.save(); 
            ctx.globalAlpha = e.life;
            if (e.type === 'text') {
                ctx.font = 'bold 12px sans-serif'; 
                ctx.fillStyle = e.color;
                ctx.strokeStyle = '#000'; 
                ctx.lineWidth = 2;
                ctx.strokeText(e.value, drawX + e.x, drawY + e.y);
                ctx.fillText(e.value, drawX + e.x, drawY + e.y);
            } else if (e.type === 'flash') {
                ctx.beginPath(); 
                ctx.arc(drawX, drawY, this.radius, 0, Math.PI*2);
                ctx.fillStyle = e.color; 
                ctx.fill();
            }
            ctx.restore();
        });
    }
}

