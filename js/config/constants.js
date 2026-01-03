// Game Constants
const RANGE_SCALE = 60;

// Unit States
const STATES = {
    IDLE: '대기',
    MOVING: '이동',
    PRE_ATTACK: '공격준비',
    RECOVER: '휴식',
    INTERVAL: '후딜레이',
    DEFENDING: '방어태세', 
    DEAD: '사망'
};

// Unit Intents
const INTENTS = {
    NONE: '...',
    ENGAGE: '접근',
    ATTACK: '공격!',
    DEFEND: '방어중',
    REST: '숨고르기'
};

// Formation Constants
const FORMATION_TRANSITION_DURATION = 2.0; // seconds
const FORMATION_TRANSITION_SPEED_MULT = 1.5;
const FORMATION_TRANSITION_PASS_THROUGH_RATIO = 0.5;
const FORMATION_TRANSITION_SLOWDOWN_REDUCTION = 0.5;

// Squad AI Constants
const SQUAD_ROUTING_MORALE_THRESHOLD = 0.1; // 10%
const SQUAD_REORGANIZE_MORALE_THRESHOLD = 0.3; // 30%
const SQUAD_REENGAGE_STAMINA_THRESHOLD = 0.5; // 50%
const SQUAD_REENGAGE_MORALE_THRESHOLD = 0.4; // 40%
const FORMATION_COLLAPSE_MAX_DIST_MULT = 1.5; // 포메이션 폭의 1.5배까지 허용

// Charge System Constants
const CHARGE_COOLDOWN_DURATION = 10.0; // seconds
const CHARGE_DURATION = 3.0; // seconds
const CHARGE_MORALE_RECOVERY = 0.1; // 10% of max morale

// Convex Hull utility (for formation shape visualization)
function getConvexHull(points) {
    if (points.length < 3) return points;
    
    points.sort((a, b) => a.x === b.x ? a.y - b.y : a.x - b.x);
    const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
    const lower = [];
    for (let i = 0; i < points.length; i++) {
        while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], points[i]) <= 0) lower.pop();
        lower.push(points[i]);
    }
    const upper = [];
    for (let i = points.length - 1; i >= 0; i--) {
        while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], points[i]) <= 0) upper.pop();
        upper.push(points[i]);
    }
    upper.pop(); lower.pop();
    return lower.concat(upper);
}

