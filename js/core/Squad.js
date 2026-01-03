// Squad - Represents a group of units with formation and AI

class Squad {
    constructor(id, team, centerX, centerY, presetName, unitCount, formationType = '방진') {
        this.id = id;
        this.team = team;
        this.centerX = centerX;
        this.centerY = centerY;
        this.presetName = presetName;
        this.unitCount = unitCount;
        
        // Formation 생성
        this.formation = new Formation(formationType, unitCount);
        
        // Squad 기본 방향: 위쪽 (-PI/2)
        // 좌우 대칭을 위해 Blue는 시계방향 90도 회전(0도=오른쪽), Red는 반시계방향 90도 회전(PI=왼쪽)
        // Formation의 기본 방향은 위쪽이므로, Blue는 -PI/2 + PI/2 = 0, Red는 -PI/2 - PI/2 = -PI = PI
        this.angle = team === 'A' ? 0 : Math.PI;
        this.formation.angle = this.angle;
        
        // Units 배열
        this.units = [];
        
        // SquadAI와 FormationManager는 시뮬레이션 시작 시 초기화
        this.squadAI = null;
        this.formationManager = null;
        
        // 현재 슬롯 (시각화용)
        this.currentSlots = [];
    }

    // Units 생성 (Formation에 따라 배치)
    createUnits(unitIdStart, stats) {
        this.units = [];
        let unitId = unitIdStart;
        
        // Formation의 idealPositions를 사용하여 Unit 생성
        for (let i = 0; i < this.unitCount && i < this.formation.idealPositions.length; i++) {
            const worldPos = this.formation.getWorldPosition(i, this.centerX, this.centerY);
            
            // Unit 생성
            const unit = new Unit(unitId++, this.team, worldPos.x, worldPos.y, stats);
            
            // Unit의 각도는 Formation의 heading에 따라 설정
            unit.angle = worldPos.heading;
            unit.targetHeading = unit.angle;
            
            this.units.push(unit);
        }
        
        return unitId;
    }

    // SquadAI와 FormationManager 초기화 (시뮬레이션 시작 시)
    initializeAI() {
        if (!this.squadAI && typeof SquadAI !== 'undefined') {
            this.squadAI = new SquadAI(this);
        }
        if (!this.formationManager && typeof FormationManager !== 'undefined') {
            this.formationManager = new FormationManager(this);
        }
    }

    // Change formation and start transition
    changeFormation(newFormationType) {
        const oldType = this.formation.type;
        this.formation = new Formation(newFormationType, this.unitCount);
        this.formation.setAngle(this.angle);
        
        // Start transition if formation changed
        if (oldType !== this.formation.type && this.formationManager) {
            this.formationManager.startTransition();
        }
    }

    // Update formation positions (called during simulation)
    updateFormationPositions() {
        if (!this.formationManager) return;
        
        const slots = this.formation.idealPositions;
        this.formationManager.assignSlotsEfficiently(
            slots,
            this.centerX,
            this.centerY,
            this.angle
        );
    }

    // 평균 사기 계산
    getAverageMorale() {
        if (this.units.length === 0) return 0;
        const aliveUnits = this.units.filter(u => u.state !== STATES.DEAD);
        if (aliveUnits.length === 0) return 0;
        const sum = aliveUnits.reduce((acc, u) => acc + (u.morale / u.maxMorale), 0);
        return sum / aliveUnits.length;
    }

    // 생존 유닛 수
    getAliveCount() {
        return this.units.filter(u => u.state !== STATES.DEAD).length;
    }

    // 포메이션 중심 계산
    getFormationCenter() {
        // 실제 유닛들의 평균 위치를 사용하거나, centerX/centerY를 사용
        const aliveUnits = this.units.filter(u => u.state !== STATES.DEAD);
        if (aliveUnits.length === 0) {
            return { x: this.centerX, y: this.centerY };
        }
        
        let sumX = 0, sumY = 0;
        for (const unit of aliveUnits) {
            sumX += unit.x;
            sumY += unit.y;
        }
        return {
            x: sumX / aliveUnits.length,
            y: sumY / aliveUnits.length
        };
    }

    // Routing 시작
    startRouting() {
        // 유닛들이 개별적으로 후퇴하도록 설정
        for (const unit of this.units) {
            if (unit.state !== STATES.DEAD) {
                // 후퇴 로직은 Unit 또는 SquadAI에서 처리
            }
        }
    }

    // 재정비 시작
    startReorganizing() {
        // Formation으로 복귀하도록 설정
        if (this.formationManager) {
            this.formationManager.startTransition();
        }
    }

    // Squad 파괴
    destroy() {
        // 모든 유닛이 사망한 경우
        this.units = [];
    }

    // 스쿼드가 파괴되었는지 확인
    isDestroyed() {
        return this.getAliveCount() === 0;
    }

    // 전투 범위 계산 (스쿼드 내 유닛들의 평균 공격 범위)
    getCombatRange() {
        const aliveUnits = this.units.filter(u => u.state !== STATES.DEAD);
        if (aliveUnits.length === 0) return 0;
        
        let totalRange = 0;
        for (const unit of aliveUnits) {
            totalRange += unit.range || 0;
        }
        return totalRange / aliveUnits.length;
    }

    // Formation 업데이트 (시뮬레이션 중)
    update(dt, allSquads, config) {
        if (this.squadAI) {
            this.squadAI.update(dt, allSquads, config);
        }
        if (this.formationManager) {
            this.formationManager.update(dt);
            // Update formation positions continuously
            this.updateFormationPositions();
        }
    }
}

