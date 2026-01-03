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
        
        // angle은 SettingsManager에서 설정 (좌표계 및 rotate는 SettingsManager에서만 처리)
        this.angle = 0;
        
        // Units 배열
        this.units = [];
        
        // 초기 Unit 상태 저장 (회전 복원용)
        this.initialUnitStates = [];
        
        // SquadAI와 FormationManager는 시뮬레이션 시작 시 초기화
        this.squadAI = null;
        this.formationManager = null;
        
        // 현재 슬롯 (시각화용)
        this.currentSlots = [];
    }

    // Units 생성 (Formation에 따라 배치)
    createUnits(unitIdStart, stats) {
        this.units = [];
        this.initialUnitStates = []; // 초기 상태 초기화
        let unitId = unitIdStart;
        
        // centeredPositions는 이미 무게 중심 기준으로 정렬되어 있음
        const positions = this.formation.centeredPositions || this.formation.idealPositions;
        
        // Formation의 centeredPositions를 사용하여 Unit 생성
        // Formation.angle = 0이므로 항상 위쪽을 향한 상태로 생성
        for (let i = 0; i < this.unitCount && i < positions.length; i++) {
            const pos = positions[i];
            
            // centeredPositions는 이미 무게 중심 기준이므로 그대로 사용
            const relativeX = pos.x;
            const relativeY = pos.y;
            
            // Formation.angle = 0이므로 회전 없이 위치 계산 (위쪽을 향함)
            const worldX = this.centerX + relativeX;
            const worldY = this.centerY + relativeY;
            // Canvas 좌표계에서 위쪽을 바라보려면 -Math.PI/2 (또는 3*Math.PI/2)
            // pos.heading은 Formation 내 상대 heading이므로, 기본 방향(위쪽)에 더함
            const baseHeading = -Math.PI / 2; // 위쪽 방향
            const worldHeading = baseHeading + (pos.heading || 0);
            
            // Unit 생성 (squad 참조 전달)
            const unit = new Unit(unitId++, this.team, worldX, worldY, stats, this);
            
            // Unit의 각도는 Formation의 heading에 따라 설정 (위쪽을 향함)
            unit.angle = worldHeading;
            unit.targetHeading = unit.angle;
            
            // 초기 상태 저장 (상대 위치, 회전 복원용)
            // 무게 중심 기준 상대 위치 저장
            this.initialUnitStates.push({
                x: relativeX,  // 상대 위치 (Formation 무게 중심 기준)
                y: relativeY,
                angle: worldHeading  // 초기 각도 (위쪽 = -Math.PI/2 + pos.heading)
            });
            
            this.units.push(unit);
        }
        
        return unitId;
    }

    // SquadAI와 FormationManager 초기화 (시뮬레이션 시작 시)
    initializeAI(battleSimulator = null) {
        if (!this.squadAI && typeof SquadAI !== 'undefined') {
            this.squadAI = new SquadAI(this, battleSimulator);
        }
        if (!this.formationManager && typeof FormationManager !== 'undefined') {
            this.formationManager = new FormationManager(this);
        }
    }

    // Change formation and start transition
    changeFormation(newFormationType) {
        const oldType = this.formation.type;
        this.formation = new Formation(newFormationType, this.unitCount);
        // angle은 SettingsManager에서 설정됨
        
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

    // 포메이션 중심 계산 (무게 중심 - 전략적 판단용)
    // 용도: 이동, 후퇴, 대형 유지, 회전 등 전략적 상황 판단
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

    // 최전열 중심 계산 (전술적 판단용)
    // 용도: 사거리 체크, 교전 시작, 돌격 등 전술적 상황 판단
    getFrontCenter() {
        const aliveUnits = this.units.filter(u => u.state !== STATES.DEAD);
        if (aliveUnits.length === 0) {
            return { x: this.centerX, y: this.centerY };
        }

        // squad.angle 방향으로 가장 앞에 있는 유닛들의 평균 위치
        // squad.angle은 Canvas 좌표계를 사용하므로, 수학 좌표계로 변환하여 방향 벡터 계산
        // Canvas 좌표계: 위쪽 = -Math.PI/2, 오른쪽 = 0
        // 수학 좌표계: 위쪽 = Math.PI/2, 오른쪽 = 0
        // 변환: mathAngle = canvasAngle + Math.PI/2
        const mathAngle = this.angle + Math.PI / 2;
        const dirX = Math.cos(mathAngle);
        const dirY = Math.sin(mathAngle);
        
        // 각 유닛의 전방 거리 계산 (angle 방향으로의 투영)
        let maxFrontDist = -Infinity;
        const frontUnits = [];
        
        const formationCenter = this.getFormationCenter();
        
        for (const unit of aliveUnits) {
            const dx = unit.x - formationCenter.x;
            const dy = unit.y - formationCenter.y;
            const frontDist = dx * dirX + dy * dirY; // 내적 (전방 거리)
            
            if (frontDist > maxFrontDist - 5) { // 5 픽셀 여유 (최전열 그룹)
                if (frontDist > maxFrontDist) {
                    maxFrontDist = frontDist;
                    frontUnits.length = 0; // 새로운 최전열 발견 시 리셋
                }
                frontUnits.push(unit);
            }
        }
        
        // 최전열 유닛들의 평균 위치
        if (frontUnits.length > 0) {
            let sumX = 0, sumY = 0;
            for (const unit of frontUnits) {
                sumX += unit.x;
                sumY += unit.y;
            }
            return {
                x: sumX / frontUnits.length,
                y: sumY / frontUnits.length
            };
        }
        
        // 폴백: formation center 반환
        return formationCenter;
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

    // 부대 반지름 계산 (Edge to Edge 거리 계산용)
    // 실제 유닛들의 분포를 기반으로 bounding radius 계산
    getBoundingRadius() {
        const aliveUnits = this.units.filter(u => u.state !== STATES.DEAD);
        if (aliveUnits.length === 0) return 0;

        const formationCenter = this.getFormationCenter();
        let maxDist = 0;

        for (const unit of aliveUnits) {
            const dist = Math.hypot(
                unit.x - formationCenter.x,
                unit.y - formationCenter.y
            );
            if (dist > maxDist) {
                maxDist = dist;
            }
        }

        // 유닛 반지름도 포함 (일반적으로 유닛 크기는 상대적으로 작지만, 안전 여유 추가)
        const unitRadius = 10; // 대략적인 유닛 반지름 (필요시 조정)
        return maxDist + unitRadius;
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

    // Get formation position for a specific unit by ID
    getFormationPos(unitId) {
        // Find the unit's index in the initialUnitStates array
        const unitIndex = this.units.findIndex(u => u.id === unitId);
        if (unitIndex === -1 || !this.initialUnitStates[unitIndex]) {
            // Fallback: return formation center
            return { x: this.centerX, y: this.centerY };
        }
        
        const initialState = this.initialUnitStates[unitIndex];
        const cos = Math.cos(this.angle);
        const sin = Math.sin(this.angle);
        
        // Rotate the relative position by squad angle
        const rotatedX = initialState.x * cos - initialState.y * sin;
        const rotatedY = initialState.x * sin + initialState.y * cos;
        
        return {
            x: this.centerX + rotatedX,
            y: this.centerY + rotatedY
        };
    }

    // Formation shape와 화살표 그리기 (셋업 상태 렌더링용)
    drawFormationShape(ctx, cameraZoom) {
        // centeredPositions를 사용하여 bounding box 계산 (무게 중심 기준)
        const positions = this.formation.centeredPositions || this.formation.idealPositions;
        if (!this.formation || !positions || positions.length === 0) {
            return;
        }

        const centerX = this.centerX;
        const centerY = this.centerY;
        const formation = this.formation;
        
        // centeredPositions의 bounding box 계산 (빈 자리 포함한 전체 formation 영역)
        // centeredPositions는 이미 무게 중심 기준으로 정렬되어 있음
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        positions.forEach(pos => {
            if (pos.x < minX) minX = pos.x;
            if (pos.x > maxX) maxX = pos.x;
            if (pos.y < minY) minY = pos.y;
            if (pos.y > maxY) maxY = pos.y;
        });
        
        const formationWidth = maxX - minX;
        const formationHeight = maxY - minY;
        
        // Padding 추가 (spacing의 절반) - 빈 자리도 포함한 직사각형
        const padding = formation.spacing * 0.5;
        const width = formationWidth + padding * 2;
        const height = formationHeight + padding * 2;
        
        // 직사각형의 네 모서리 (squad.angle에 따라 회전)
        const halfWidth = width / 2;
        const halfHeight = height / 2;
        
        // 기본 모서리 (위쪽을 향한 상태, 회전 전)
        const baseCorners = [
            { x: -halfWidth, y: -halfHeight }, // 좌상
            { x: halfWidth, y: -halfHeight },  // 우상
            { x: halfWidth, y: halfHeight },   // 우하
            { x: -halfWidth, y: halfHeight }   // 좌하
        ];
        
        // squad.angle에 따라 회전 변환 적용 (rotateSquad에서 사용하는 각도와 동일)
        // rotateSquad는 this.angle을 그대로 사용하므로, shape도 this.angle을 사용
        const cos = Math.cos(this.angle);
        const sin = Math.sin(this.angle);
        
        const worldCorners = baseCorners.map(corner => {
            const rotatedX = corner.x * cos - corner.y * sin;
            const rotatedY = corner.x * sin + corner.y * cos;
            return {
                x: centerX + rotatedX,
                y: centerY + rotatedY
            };
        });
        
        ctx.save();
        
        // 더 잘 보이게 색상과 투명도 조정
        ctx.fillStyle = "rgba(234, 179, 8, 0.3)";  // 투명도 증가 (0.15 -> 0.3)
        ctx.strokeStyle = "rgba(234, 179, 8, 0.9)"; // 선 두께 증가 (0.4 -> 0.9)
        ctx.lineWidth = 3 / cameraZoom;  // 선 두께 증가 (2 -> 3)
        ctx.setLineDash([8 / cameraZoom, 4 / cameraZoom]); // 더 잘 보이게 대시 패턴 조정
        
        // 직사각형 그리기
        ctx.beginPath();
        ctx.moveTo(worldCorners[0].x, worldCorners[0].y);
        for (let i = 1; i < worldCorners.length; i++) {
            ctx.lineTo(worldCorners[i].x, worldCorners[i].y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.setLineDash([]);
        
        // 앵커 포인트에 X 표시
        const xSize = 15 / cameraZoom;
        ctx.strokeStyle = "rgba(234, 179, 8, 1.0)";
        ctx.lineWidth = 3 / cameraZoom;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(centerX - xSize, centerY - xSize);
        ctx.lineTo(centerX + xSize, centerY + xSize);
        ctx.moveTo(centerX + xSize, centerY - xSize);
        ctx.lineTo(centerX - xSize, centerY + xSize);
        ctx.stroke();
        
        // 포메이션 방향 화살표 그리기 (헤드 포함)
        // 화살표는 squad.angle에 따라 회전 (squad.angle = 0이면 위쪽)
        const arrowAngle = this.angle - Math.PI / 2; // 위쪽 방향 기준
        const arrowLength = 80 / cameraZoom;
        const arrowHeadSize = 20 / cameraZoom;
        const arrowEndX = centerX + Math.cos(arrowAngle) * arrowLength;
        const arrowEndY = centerY + Math.sin(arrowAngle) * arrowLength;
        
        ctx.strokeStyle = "rgba(234, 179, 8, 1.0)";
        ctx.fillStyle = "rgba(234, 179, 8, 1.0)";
        ctx.lineWidth = 4 / cameraZoom;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        // 화살표 그리기 (몸체 + 헤드)
        ctx.beginPath();
        // 화살표 몸체
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(arrowEndX, arrowEndY);
        ctx.stroke();
        
        // 화살표 헤드 (삼각형) - arrowAngle 방향으로 그려짐
        const headAngle1 = arrowAngle - Math.PI + Math.PI * 0.2; // 뒤쪽 왼쪽
        const headAngle2 = arrowAngle - Math.PI - Math.PI * 0.2; // 뒤쪽 오른쪽
        ctx.beginPath();
        ctx.moveTo(arrowEndX, arrowEndY);
        ctx.lineTo(
            arrowEndX + Math.cos(headAngle1) * arrowHeadSize,
            arrowEndY + Math.sin(headAngle1) * arrowHeadSize
        );
        ctx.lineTo(
            arrowEndX + Math.cos(headAngle2) * arrowHeadSize,
            arrowEndY + Math.sin(headAngle2) * arrowHeadSize
        );
        ctx.closePath();
        ctx.fill();
        
        // squad.angle 값 표시
        ctx.save();
        ctx.fillStyle = "rgba(234, 179, 8, 1.0)";
        ctx.strokeStyle = "rgba(0, 0, 0, 0.8)";
        ctx.lineWidth = 2 / cameraZoom;
        ctx.font = `bold ${14 / cameraZoom}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // 각도를 도(degree)로 변환
        const angleDeg = (this.angle * 180 / Math.PI).toFixed(1);
        const angleRad = this.angle.toFixed(3);
        const angleText = `angle: ${angleDeg}° (${angleRad} rad)`;
        
        // 텍스트 배경 (가독성 향상)
        const textMetrics = ctx.measureText(angleText);
        const textWidth = textMetrics.width;
        const textHeight = 16 / cameraZoom;
        const textPadding = 4 / cameraZoom;
        
        ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
        ctx.fillRect(
            centerX - textWidth / 2 - textPadding,
            centerY - arrowLength - textHeight - textPadding * 2,
            textWidth + textPadding * 2,
            textHeight + textPadding * 2
        );
        
        // 텍스트 그리기
        ctx.fillStyle = "rgba(234, 179, 8, 1.0)";
        ctx.fillText(
            angleText,
            centerX,
            centerY - arrowLength - textHeight / 2 - textPadding
        );
        
        ctx.restore();
        
        ctx.restore();
    }

    // SquadAI 상태 전환 메서드들
    startEngaging() {
        // 교전 돌입 상태로 전환
        // FormationManager가 있으면 적을 향해 이동 시작
        if (this.formationManager && this.squadAI && this.squadAI.targetSquad) {
            const target = this.squadAI.targetSquad.getFrontCenter();
            this.centerX = target.x;
            this.centerY = target.y;
        }
    }

    startCombat() {
        // 교전 중 상태로 전환
        // 유닛들이 자동으로 타겟을 찾아 공격하도록 설정
        for (const unit of this.units) {
            if (unit.state !== STATES.DEAD) {
                // Unit의 타겟팅 로직이 자동으로 작동
            }
        }
    }

    startRetreating() {
        // 후퇴 상태로 전환
        // 적으로부터 멀어지도록 이동
        if (this.squadAI && this.squadAI.targetSquad) {
            const target = this.squadAI.targetSquad.getFrontCenter();
            const dx = this.centerX - target.x;
            const dy = this.centerY - target.y;
            const dist = Math.hypot(dx, dy);
            if (dist > 0) {
                const retreatDist = 200; // 후퇴 거리
                this.centerX += (dx / dist) * retreatDist;
                this.centerY += (dy / dist) * retreatDist;
            }
        }
    }

    startMoving() {
        // 이동 상태로 전환
        // FormationManager가 있으면 이동 시작
        if (this.formationManager) {
            this.formationManager.startTransition();
        }
    }

    startDefending() {
        // 방어 상태로 전환
        // 유닛들이 방어 모드로 전환
        for (const unit of this.units) {
            if (unit.state !== STATES.DEAD) {
                // Unit의 방어 로직이 자동으로 작동
            }
        }
    }

    setTactic(tactic) {
        // 전술 설정
        this.currentTactic = tactic;
        // 전술에 따라 유닛 행동 조정
        // (구현 필요 시 추가)
    }

    // 평균 공격력 계산
    getAverageAttack() {
        const aliveUnits = this.units.filter(u => u.state !== STATES.DEAD);
        if (aliveUnits.length === 0) return 0;
        const sum = aliveUnits.reduce((acc, u) => acc + u.atk, 0);
        return sum / aliveUnits.length;
    }

    // 평균 스테미너 계산 (비율)
    getAverageStamina() {
        const aliveUnits = this.units.filter(u => u.state !== STATES.DEAD);
        if (aliveUnits.length === 0) return 0;
        const sum = aliveUnits.reduce((acc, u) => acc + (u.stamina / u.maxStamina), 0);
        return sum / aliveUnits.length;
    }

    // 평균 이동 속도 계산
    getAverageMoveSpeed() {
        const aliveUnits = this.units.filter(u => u.state !== STATES.DEAD);
        if (aliveUnits.length === 0) return 50; // 기본값
        const sum = aliveUnits.reduce((acc, u) => acc + u.moveSpeed, 0);
        return sum / aliveUnits.length;
    }

    // 최대 사기 계산
    getMaxMorale() {
        const aliveUnits = this.units.filter(u => u.state !== STATES.DEAD);
        if (aliveUnits.length === 0) return 0;
        return aliveUnits[0].maxMorale; // 모든 유닛이 같은 maxMorale을 가진다고 가정
    }

    // 사기 피해/회복 적용
    applyMoraleDamage(amount) {
        for (const unit of this.units) {
            if (unit.state !== STATES.DEAD) {
                unit.morale = Math.max(0, Math.min(unit.maxMorale, unit.morale + amount));
            }
        }
    }

    // 강제 재정비 (돌격 전)
    rigidReorganize() {
        if (this.formationManager) {
            this.formationManager.startTransition();
            // 즉시 포메이션으로 복귀하도록 강제
            this.updateFormationPositions();
        }
    }

    // 돌격 상태 설정
    setChargeState(isCharging) {
        for (const unit of this.units) {
            if (unit.state !== STATES.DEAD) {
                unit.isCharging = isCharging;
            }
        }
    }

    // 유닛 타입 반환
    getUnitType() {
        const aliveUnits = this.units.filter(u => u.state !== STATES.DEAD);
        if (aliveUnits.length === 0) return 'infantry';
        // 첫 번째 유닛의 타입을 반환 (모든 유닛이 같은 타입이라고 가정)
        // Unit 클래스에 type 속성이 있다고 가정
        return aliveUnits[0].type || 'infantry';
    }
}

