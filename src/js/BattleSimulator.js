/**
 * BattleSimulator.js - 전투 시뮬레이터 엔진
 * 로직과 렌더링이 철저히 분리됨 (Unity 포팅 대비)
 */

import { Unit } from './Unit.js';
import { GlobalConfig, RANGE_SCALE } from './Config.js';
import { STATES } from './Config.js';

export class BattleSimulator {
    constructor() {
        this.canvas = document.getElementById('battleCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        this.units = [];
        this.running = false;
        this.paused = false;
        this.lastTime = 0;
        this.timeScale = 1.0;
        this.elapsedTime = 0;

        this.resize();
        window.addEventListener('resize', () => this.resize());
        
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Space') { 
                e.preventDefault(); 
                this.togglePause(); 
            }
        });
    }

    resize() {
        this.canvas.width = this.canvas.parentElement.clientWidth;
        this.canvas.height = this.canvas.parentElement.clientHeight;
        this.render();
    }

    getStats(team) {
        return {
            hp: Number(document.getElementById(`hp_${team}`).value),
            atk: Number(document.getElementById(`atk_${team}`).value),
            as: Number(document.getElementById(`as_${team}`).value),
            rng: Number(document.getElementById(`rng_${team}`).value),
            spd: Number(document.getElementById(`spd_${team}`).value),
            shd: Number(document.getElementById(`shd_${team}`).value),
            arm: Number(document.getElementById(`arm_${team}`).value),
            mst: Number(document.getElementById(`mst_${team}`).value),
            mor: Number(document.getElementById(`mor_${team}`).value),
        };
    }

    applyStats(logCallback, endGameCallback) {
        this.reset();
        const cx = this.canvas.width / 2;
        const cy = this.canvas.height / 2;
        
        const statsA = this.getStats('A');
        const statsB = this.getStats('B');
        
        // Spawn distance: Range of A + Range of B + Buffer
        const spawnDist = (statsA.rng * RANGE_SCALE) + (statsB.rng * RANGE_SCALE) + 100;
        
        const unitA = new Unit(1, 'A', cx - spawnDist/2, cy, statsA);
        const unitB = new Unit(2, 'B', cx + spawnDist/2, cy, statsB);
        
        // 콜백 설정
        unitA.setCallbacks(logCallback, endGameCallback);
        unitB.setCallbacks(logCallback, endGameCallback);
        
        this.units = [unitA, unitB];
        
        if (logCallback) logCallback("전투 시작", "font-bold text-center mt-2 mb-2 bg-gray-100");
        this.start();
    }

    start() {
        if (this.running) return;
        this.running = true;
        this.paused = false;
        this.lastTime = performance.now();
        document.getElementById('winnerOverlay').classList.add('hidden');
        requestAnimationFrame((t) => this.loop(t));
    }

    reset() {
        this.running = false;
        this.elapsedTime = 0;
        this.units = [];
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        const logContainer = document.getElementById('logContainer');
        if (logContainer) logContainer.innerHTML = '';
        const btnPause = document.getElementById('btnPause');
        if (btnPause) btnPause.innerText = "일시정지";
        document.getElementById('winnerOverlay').classList.add('hidden');
    }

    togglePause() {
        this.paused = !this.paused;
        const btn = document.getElementById('btnPause');
        if (btn) {
            btn.innerText = this.paused ? "재개" : "일시정지";
            btn.classList.toggle('bg-yellow-500');
            btn.classList.toggle('bg-green-600');
        }
        if (!this.paused) {
            this.lastTime = performance.now();
            requestAnimationFrame((t) => this.loop(t));
        }
    }

    setSpeed(val) { 
        this.timeScale = parseFloat(val); 
    }

    endGame(winnerTeam) {
        this.running = false;
        const overlay = document.getElementById('winnerOverlay');
        const text = document.getElementById('winnerText');
        if (overlay) overlay.classList.remove('hidden');
        
        if (text) {
            if (winnerTeam === 'A') {
                text.innerText = "Blue Team 승리!";
                text.className = "text-4xl font-extrabold mb-4 animate-bounce text-blue-400";
            } else {
                text.innerText = "Red Team 승리!";
                text.className = "text-4xl font-extrabold mb-4 animate-bounce text-red-400";
            }
        }
    }

    /**
     * 순수 로직 업데이트 (렌더링 제외)
     * 유닛들의 update 함수 호출 및 물리 엔진 틱 처리
     */
    update(dt) {
        this.elapsedTime += dt;

        const config = GlobalConfig.get();
        const unitA = this.units[0];
        const unitB = this.units[1];

        if (unitA && unitB) {
            unitA.update(dt, unitB, config);
            unitB.update(dt, unitA, config);
        }
    }

    /**
     * 렌더링 전용 메서드
     * 캔버스를 지우고 유닛들의 draw 함수 호출
     */
    render() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Grid
        ctx.strokeStyle = '#334155'; 
        ctx.lineWidth = 0.5; 
        ctx.beginPath();
        for(let i=0; i<this.canvas.width; i+=40) { 
            ctx.moveTo(i,0); 
            ctx.lineTo(i,this.canvas.height); 
        }
        for(let i=0; i<this.canvas.height; i+=40) { 
            ctx.moveTo(0,i); 
            ctx.lineTo(this.canvas.width,i); 
        }
        ctx.stroke();

        // 유닛 렌더링
        this.units.forEach(u => {
            u.draw(ctx);
        });
    }

    loop(timestamp) {
        if (!this.running || this.paused) return;
        const dtRaw = (timestamp - this.lastTime) / 1000;
        this.lastTime = timestamp;
        const dt = Math.min(dtRaw, 0.1) * this.timeScale;

        // 로직 업데이트
        this.update(dt);

        // 렌더링
        this.render();
        
        requestAnimationFrame((t) => this.loop(t));
    }
}

