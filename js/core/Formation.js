// Formation - Handles unit formation shapes and positioning
// Based on formation_simulator.html v2.21

// Anchor Mode: 'center' or 'front'
let ANCHOR_MODE = 'front';

// Formation Types (한글 이름)
const FORMATION_TYPES = {
    SQUARE: '방진',
    DENSE: '밀집방진',
    LOOSE: '산개진',
    HOLLOW: '공백방진',
    FISH: '어린진',
    WEDGE: '봉시진',
    CRANE: '학익진',
    ECHELON: '안행진',
    TURTLE: '귀갑진',
    PHALANX: '창벽',
    COLUMN: '장사진'
};

// Normalize and sort slots based on layer, center priority, and left-right order
function normalizeAndSortSlots(slots) {
    if (slots.length === 0) return slots;

    // 1. Center (Bounding Box)
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    slots.forEach(s => {
        if(s.x < minX) minX = s.x; if(s.x > maxX) maxX = s.x;
        if(s.y < minY) minY = s.y; if(s.y > maxY) maxY = s.y;
    });
    
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    
    slots.forEach(s => {
        s.x -= centerX;
        s.y -= centerY;
    });

    // 2. Anchor
    minX = Infinity; maxX = -Infinity; minY = Infinity; maxY = -Infinity;
    slots.forEach(s => {
        if(s.x < minX) minX = s.x; if(s.x > maxX) maxX = s.x;
        if(s.y < minY) minY = s.y; if(s.y > maxY) maxY = s.y;
    });

    if (ANCHOR_MODE === 'front') {
        const offset = -minY;
        slots.forEach(s => s.y += offset);
    } 

    // 3. Layer Based Sort (Layer -> Center -> LeftRight)
    return slots.sort((a, b) => {
        // Layer 우선 비교 (같은 줄/계층 끼리 묶음)
        if (a.layer !== undefined && b.layer !== undefined) {
            if (a.layer !== b.layer) return a.layer - b.layer;
        } else {
            // Layer 없으면 Y좌표로 대략적 계층 구분
            if (Math.abs(a.y - b.y) > 0.1) return a.y - b.y; 
        }
        
        // 같은 Layer 내에서는 중앙(|X|) 우선
        const absX_a = Math.abs(a.x);
        const absX_b = Math.abs(b.x);
        if (Math.abs(absX_a - absX_b) > 0.1) return absX_a - absX_b;
        
        // 완전 대칭이면 좌->우
        return a.x - b.x;
    });
}

// 1. 직사각형 생성기
function createRectanglePositions(count, spacing, widthRatio, heightRatio) {
    const slots = [];
    let rows = Math.round(Math.sqrt(count * (heightRatio / widthRatio)));
    if (rows < 1) rows = 1;
    let cols = Math.ceil(count / rows);
    
    let allocated = 0;
    
    for (let r = 0; r < rows; r++) {
        let colsInThisRow = cols;
        if (allocated + colsInThisRow > count) colsInThisRow = count - allocated;
        if (colsInThisRow <= 0) break;

        const currentW = (colsInThisRow - 1) * spacing;
        
        for (let c = 0; c < colsInThisRow; c++) {
            slots.push({
                x: (c * spacing) - (currentW / 2),
                y: (r * spacing),
                heading: 0,
                layer: r 
            });
            allocated++;
        }
    }
    return slots; 
}

// 2. 학익진 (\____/)
function createBucketPositions(count, spacing) {
    const slots = [];
    const baseCount = Math.floor(count * 0.4);
    const wingCount = count - baseCount;
    const leftWingCount = Math.ceil(wingCount / 2);
    const rightWingCount = wingCount - leftWingCount;
    
    const rows = Math.ceil(count / 20); 
    const baseCols = Math.ceil(baseCount / rows);
    let allocatedBase = 0;
    const wingAngle = Math.PI / 4; 

    const baseWidth = (baseCols - 1) * spacing;
    
    // Base (Center)
    for(let r=0; r<rows; r++) {
        let cols = baseCols;
        if(allocatedBase + cols > baseCount) cols = baseCount - allocatedBase;
        const currentRowWidth = (cols - 1) * spacing;
        for(let c=0; c<cols; c++) {
            slots.push({
                x: (c * spacing) - (currentRowWidth / 2),
                y: r * spacing,
                heading: 0,
                layer: r
            });
            allocatedBase++;
        }
    }
    
    const halfBaseW = baseWidth / 2;
    
    // Left Wing
    let allocatedLeft = 0;
    for(let r=0; r<rows; r++) {
        let cols = Math.ceil(leftWingCount / rows);
        if(allocatedLeft + cols > leftWingCount) cols = leftWingCount - allocatedLeft;
        for(let c=0; c<cols; c++) {
            const dist = (c + 1) * spacing;
            const x = -halfBaseW - (dist * Math.cos(wingAngle));
            const y = (r * spacing) - (dist * Math.sin(wingAngle));
            slots.push({x, y, heading: wingAngle, layer: r});
            allocatedLeft++;
        }
    }

    // Right Wing
    let allocatedRight = 0;
    for(let r=0; r<rows; r++) {
        let cols = Math.ceil(rightWingCount / rows);
        if(allocatedRight + cols > rightWingCount) cols = rightWingCount - allocatedRight;
        for(let c=0; c<cols; c++) {
            const dist = (c + 1) * spacing;
            const x = halfBaseW + (dist * Math.cos(wingAngle));
            const y = (r * spacing) - (dist * Math.sin(wingAngle));
            slots.push({x, y, heading: -wingAngle, layer: r});
            allocatedRight++;
        }
    }
    
    return slots;
}

// Formation class
class Formation {
    constructor(type, unitCount, spacing = 50) {
        // Convert string to type
        this.type = this.getFormationType(type);
        this.unitCount = unitCount;
        this.spacing = spacing;
        this.angle = 0;  // Formation direction (radians)
        this.idealPositions = []; // 최전열 기준 상대 위치 (ANCHOR_MODE='front')
        this.centeredPositions = []; // 무게 중심 기준 상대 위치
        this.width = 0;
        this.height = 0;
        
        this.generateFormation();
    }
    
    canCharge() {
        // 포메이션이 돌격 가능한지 확인
        // chargeBonus가 있는 포메이션은 돌격 가능
        if (FORMATION_STATS[this.type]) {
            return FORMATION_STATS[this.type].chargeBonus > 0;
        }
        return false;
    }

    getFormationType(typeString) {
        // 한글 이름을 FORMATION_TYPES로 변환
        for (let key in FORMATION_TYPES) {
            if (FORMATION_TYPES[key] === typeString) {
                return FORMATION_TYPES[key];
            }
        }
        // 이미 타입인 경우
        if (Object.values(FORMATION_TYPES).includes(typeString)) {
            return typeString;
        }
        return FORMATION_TYPES.SQUARE; // 기본값
    }
    
    generateFormation() {
        const fmt = FORMATION_GENERATORS[this.type];
        let rawSlots;
        if (fmt) {
            rawSlots = fmt(this.unitCount, this.spacing);
        } else {
            // Default to square
            rawSlots = createRectanglePositions(this.unitCount, this.spacing, 2, 1);
        }
        
        // 1. idealPositions 생성 (최전열 기준, ANCHOR_MODE='front')
        this.idealPositions = normalizeAndSortSlots(JSON.parse(JSON.stringify(rawSlots)));
        
        // 2. centeredPositions 생성 (무게 중심 기준)
        this.centeredPositions = this.calculateCenteredPositions(JSON.parse(JSON.stringify(rawSlots)));
        
        // Calculate bounding box (centeredPositions 기준)
        if (this.centeredPositions.length > 0) {
            let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
            this.centeredPositions.forEach(pos => {
                if(pos.x < minX) minX = pos.x; if(pos.x > maxX) maxX = pos.x;
                if(pos.y < minY) minY = pos.y; if(pos.y > maxY) maxY = pos.y;
            });
            this.width = maxX - minX;
            this.height = maxY - minY;
        }
    }
    
    // 무게 중심 기준으로 정렬된 positions 계산
    calculateCenteredPositions(slots) {
        if (slots.length === 0) return slots;
        
        // 1. Bounding box 중심으로 정렬 (무게 중심)
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        slots.forEach(s => {
            if(s.x < minX) minX = s.x; if(s.x > maxX) maxX = s.x;
            if(s.y < minY) minY = s.y; if(s.y > maxY) maxY = s.y;
        });
        
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        
        slots.forEach(s => {
            s.x -= centerX;
            s.y -= centerY;
        });
        
        // 2. Layer Based Sort (Layer -> Center -> LeftRight)
        return slots.sort((a, b) => {
            // Layer 우선 비교 (같은 줄/계층 끼리 묶음)
            if (a.layer !== undefined && b.layer !== undefined) {
                if (a.layer !== b.layer) return a.layer - b.layer;
            } else {
                // Layer 없으면 Y좌표로 대략적 계층 구분
                if (Math.abs(a.y - b.y) > 0.1) return a.y - b.y; 
            }
            
            // 같은 Layer 내에서는 중앙(|X|) 우선
            const absX_a = Math.abs(a.x);
            const absX_b = Math.abs(b.x);
            if (Math.abs(absX_a - absX_b) > 0.1) return absX_a - absX_b;
            
            // 완전 대칭이면 좌->우
            return a.x - b.x;
        });
    }
    
    // Get world position for a slot index
    getWorldPosition(index, centerX, centerY) {
        if (index >= this.idealPositions.length) {
            return { x: centerX, y: centerY, heading: this.angle };
        }
        
        const pos = this.idealPositions[index];
        const cos = Math.cos(this.angle);
        const sin = Math.sin(this.angle);
        
        const rotatedX = pos.x * cos - pos.y * sin;
        const rotatedY = pos.x * sin + pos.y * cos;
        
        return {
            x: centerX + rotatedX,
            y: centerY + rotatedY,
            heading: this.angle + (pos.heading || 0)
        };
    }
    
    // Set formation direction (radians)
    setAngle(angle) {
        this.angle = angle;
    }
    
    // Rotate towards target
    rotateTowards(targetX, targetY, centerX, centerY) {
        const dx = targetX - centerX;
        const dy = targetY - centerY;
        this.angle = Math.atan2(dy, dx);
    }
    
    // Get formation stats (for compatibility)
    getStats() {
        return FORMATION_STATS[this.type] || FORMATION_STATS[FORMATION_TYPES.SQUARE];
    }
}

// Formation Generators (from formation_simulator.html)
const FORMATION_GENERATORS = {
    [FORMATION_TYPES.SQUARE]: (count, spacing) => 
        normalizeAndSortSlots(createRectanglePositions(count, spacing, 2, 1)),
    
    [FORMATION_TYPES.DENSE]: (count, spacing) => 
        normalizeAndSortSlots(createRectanglePositions(count, spacing * 0.7, 2, 1)),
    
    [FORMATION_TYPES.LOOSE]: (count, spacing) => 
        normalizeAndSortSlots(createRectanglePositions(count, spacing * 1.5, 2, 1)),
    
    [FORMATION_TYPES.HOLLOW]: (count, spacing) => {
        const slots = [];
        let remaining = count;
        let sideUnits = Math.ceil(Math.sqrt(count)) + 2; 
        if(sideUnits < 4) sideUnits = 4;
        let currentLayer = 0; 

        while (remaining > 0) {
            let perimeter = (sideUnits > 1) ? (sideUnits - 1) * 4 : 1;
            let countToPlace = Math.min(remaining, perimeter);
            if (sideUnits <= 2) countToPlace = remaining;

            const halfSize = (sideUnits - 1) * spacing * 0.5;
            const layerSlots = [];
            
            // 1. Top (전열)
            for(let i=0; i<sideUnits; i++) {
                const x = -halfSize + i*spacing;
                layerSlots.push({x: x, y: -halfSize, heading: 0, type: 'top', layer: currentLayer});
            }
            
            // 2. Sides (측면)
            for(let i=1; i<sideUnits-1; i++) {
                const y = -halfSize + i*spacing;
                layerSlots.push({x: -halfSize, y: y, heading: -Math.PI/2, type: 'side', sideY: i, layer: currentLayer});
                layerSlots.push({x: halfSize, y: y, heading: Math.PI/2, type: 'side', sideY: i, layer: currentLayer});
            }
            
            // 3. Bottom (후열)
            for(let i=0; i<sideUnits; i++) {
                const x = -halfSize + i*spacing;
                layerSlots.push({x: x, y: halfSize, heading: Math.PI, type: 'bottom', layer: currentLayer});
            }
            
            if(sideUnits < 2) layerSlots.push({x:0, y:0, heading:0, type:'center', layer: currentLayer});

            // 레이어 내부 우선순위 정렬
            layerSlots.sort((a, b) => {
                const isTopA = a.type === 'top';
                const isTopB = b.type === 'top';
                if (isTopA && !isTopB) return -1;
                if (!isTopA && isTopB) return 1;
                if (isTopA && isTopB) return Math.abs(a.x) - Math.abs(b.x);

                const isSideA = a.type === 'side';
                const isSideB = b.type === 'side';
                if (isSideA && !isSideB) return -1;
                if (!isSideA && isSideB) return 1;
                if (isSideA && isSideB) {
                    if(Math.abs(a.y - b.y) > 0.1) return a.y - b.y; 
                    return a.x - b.x;
                }

                return Math.abs(a.x) - Math.abs(b.x);
            });

            const actualPlace = Math.min(countToPlace, layerSlots.length);
            for(let i=0; i<actualPlace; i++) {
                slots.push(layerSlots[i]);
            }

            remaining -= actualPlace;
            sideUnits -= 2; 
            if (sideUnits < 1 && remaining > 0) sideUnits = 1; 
            currentLayer++;
        }
        
        // Manual Center & Anchor
        if (slots.length > 0) {
            let minX=Infinity, maxX=-Infinity, minY=Infinity, maxY=-Infinity;
            slots.forEach(s => {
                if(s.x < minX) minX = s.x; if(s.x > maxX) maxX = s.x;
                if(s.y < minY) minY = s.y; if(s.y > maxY) maxY = s.y;
            });
            const cx = (minX+maxX)/2;
            const cy = (minY+maxY)/2;
            slots.forEach(s => { s.x -= cx; s.y -= cy; });

            if (ANCHOR_MODE === 'front') {
                let newMinY = Infinity;
                slots.forEach(s => { if(s.y < newMinY) newMinY = s.y; });
                const offset = -newMinY;
                slots.forEach(s => s.y += offset);
            }
        }
        return slots; 
    },
    
    [FORMATION_TYPES.FISH]: (count, spacing) => {
        const slots = [];
        let row = 0, used = 0, colsInRow = 1;
        while (used < count) {
            let actualCols = Math.min(colsInRow, count - used);
            const rowWidth = (actualCols - 1) * spacing;
            const rowY = row * spacing;
            for (let c = 0; c < actualCols; c++) {
                slots.push({ x: (c * spacing) - (rowWidth / 2), y: rowY, heading: 0, layer: row });
            }
            used += actualCols;
            row++;
            colsInRow += 2;
        }
        return normalizeAndSortSlots(slots);
    },
    
    [FORMATION_TYPES.WEDGE]: (count, spacing) => {
        const slots = [];
        let row = 0, used = 0, colsInRow = 1;
        while (used < count) {
            let actualCols = Math.min(colsInRow, count - used);
            const rowWidth = (actualCols - 1) * spacing;
            for (let c = 0; c < actualCols; c++) {
                slots.push({ x: (c * spacing) - (rowWidth / 2), y: row * spacing, heading: 0, layer: row }); 
            }
            used += actualCols;
            row++;
            if (row % 2 === 0) colsInRow++;
        }
        return normalizeAndSortSlots(slots);
    },
    
    [FORMATION_TYPES.CRANE]: (count, spacing) => 
        normalizeAndSortSlots(createBucketPositions(count, spacing)),
    
    [FORMATION_TYPES.ECHELON]: (count, spacing) => {
        const slots = [];
        let rows = Math.round(Math.sqrt(count / 5)); 
        if(rows < 2) rows = 2;
        let cols = Math.ceil(count / rows);
        let allocated = 0;
        const alpha = 0.3; 
        for(let r=0; r<rows; r++) {
            let cRow = cols;
            if(allocated + cRow > count) cRow = count - allocated;
            const w = (cRow-1)*spacing;
            for(let c=0; c<cRow; c++) {
                const x = (c*spacing) - (w/2);
                const y = (r*spacing) - (Math.abs(x) * alpha);
                slots.push({x, y, heading: 0, layer: r}); 
            }
            allocated += cRow;
        }
        return normalizeAndSortSlots(slots);
    },
    
    [FORMATION_TYPES.TURTLE]: (count, spacing) => 
        normalizeAndSortSlots(createRectanglePositions(count, spacing * 0.7, 2, 1)),
    
    [FORMATION_TYPES.PHALANX]: (count, spacing) => {
        let rows = 3;
        let cols = Math.ceil(count / rows);
        if (count < 6) { rows = Math.ceil(count/2); cols = 2; }
        const slots = [];
        let allocated = 0;
        const totalH = (rows - 1) * spacing;
        for (let r = 0; r < rows; r++) {
            let remaining = count - allocated;
            let rowsLeft = rows - r;
            let colsThisRow = Math.ceil(remaining / rowsLeft);
            const currentW = (colsThisRow - 1) * spacing;
            for (let c = 0; c < colsThisRow; c++) {
                slots.push({ x: (c * spacing) - (currentW / 2), y: (r * spacing) - (totalH / 2), heading: 0, layer: r }); 
                allocated++;
            }
        }
        return normalizeAndSortSlots(slots);
    },
    
    [FORMATION_TYPES.COLUMN]: (count, spacing) => 
        normalizeAndSortSlots(createRectanglePositions(count, spacing, 1, 4))
};

// Formation Stats (for compatibility)
const FORMATION_STATS = {
    [FORMATION_TYPES.SQUARE]: { chargeBonus: 5, defBonus: 0, moveSpeed: 0, chargeResist: 0, flankPen: { def: -10, morale: 20 }, rearPen: { def: -20, morale: 40 } },
    [FORMATION_TYPES.DENSE]: { chargeBonus: 0, defBonus: 10, moveSpeed: -30, chargeResist: 20, defRateMult: 1.5, flankPen: { def: -10, morale: 20 }, rearPen: { def: -20, morale: 40 } },
    [FORMATION_TYPES.LOOSE]: { chargeBonus: 0, defBonus: -10, moveSpeed: 5, chargeResist: -50, flankPen: { def: -10, morale: 20 }, rearPen: { def: -20, morale: 40 } },
    [FORMATION_TYPES.HOLLOW]: { chargeBonus: 0, defBonus: 0, moveSpeed: -100, chargeResist: 10, flankPen: { def: 0, morale: 0 }, rearPen: { def: 0, morale: 0 } },
    [FORMATION_TYPES.FISH]: { chargeBonus: 10, defBonus: 0, moveSpeed: 0, chargeResist: 0, flankPen: { def: -15, morale: 25 }, rearPen: { def: -30, morale: 50 } },
    [FORMATION_TYPES.WEDGE]: { chargeBonus: 20, defBonus: 0, moveSpeed: 0, chargeResist: 0, flankPen: { def: -20, morale: 30 }, rearPen: { def: -40, morale: 60 } },
    [FORMATION_TYPES.CRANE]: { chargeBonus: 0, defBonus: 0, moveSpeed: 0, chargeResist: 0, flankPen: { def: -10, morale: 20 }, rearPen: { def: -20, morale: 40 } },
    [FORMATION_TYPES.ECHELON]: { chargeBonus: 0, defBonus: 0, moveSpeed: 0, chargeResist: 0, flankPen: { def: -10, morale: 20 }, rearPen: { def: -20, morale: 40 } },
    [FORMATION_TYPES.TURTLE]: { chargeBonus: 0, defBonus: 10, moveSpeed: -50, chargeResist: 20, rangedResist: 100, flankPen: { def: 0, morale: 0 }, rearPen: { def: -10, morale: 20 } },
    [FORMATION_TYPES.PHALANX]: { chargeBonus: 0, defBonus: 10, moveSpeed: -100, chargeResist: 50, flankPen: { def: -15, morale: 30 }, rearPen: { def: -40, morale: 80 } },
    [FORMATION_TYPES.COLUMN]: { chargeBonus: 0, defBonus: -20, moveSpeed: 20, chargeResist: -100, flankPen: { def: -10, morale: 20 }, rearPen: { def: -20, morale: 40 } }
};

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Formation, FORMATION_TYPES, FORMATION_STATS, ANCHOR_MODE };
}
