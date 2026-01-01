/**
 * main.js - 애플리케이션 진입점
 * 인스턴스 생성 및 초기화
 */

import { BattleSimulator } from './BattleSimulator.js';
import { initPresets, loadPreset, logMessage } from './ui.js';

// 전역 시뮬레이터 인스턴스
let sim = null;

// 초기화
function init() {
    console.log('애플리케이션 초기화 시작...');
    
    // BattleSimulator 인스턴스 생성
    sim = new BattleSimulator();
    
    // 프리셋 초기화
    try {
        initPresets();
        console.log('프리셋 초기화 완료');
    } catch (error) {
        console.error('프리셋 초기화 오류:', error);
    }
    
    // 로그 콜백 함수
    const logCallback = (msg, className) => {
        const logContainer = document.getElementById('logContainer');
        if (logContainer && sim) {
            logMessage(logContainer, sim.elapsedTime, msg, className);
        }
    };
    
    // 게임 종료 콜백 함수
    const endGameCallback = (winnerTeam) => {
        sim.endGame(winnerTeam);
    };
    
    // UI 이벤트 리스너 설정
    
    // 시작 버튼
    const btnApply = document.getElementById('btnApply');
    if (btnApply) {
        btnApply.onclick = () => {
            sim.applyStats(logCallback, endGameCallback);
        };
    }
    
    // 일시정지 버튼
    const btnPause = document.getElementById('btnPause');
    if (btnPause) {
        btnPause.onclick = () => {
            sim.togglePause();
        };
    }
    
    // 리셋 버튼
    const btnReset = document.getElementById('btnReset');
    if (btnReset) {
        btnReset.onclick = () => {
            sim.reset();
        };
    }
    
    // 속도 선택
    const speedSelect = document.getElementById('speedSelect');
    if (speedSelect) {
        speedSelect.onchange = (e) => {
            sim.setSpeed(e.target.value);
        };
    }
    
    // 프리셋 선택 (Team A)
    const presetA = document.getElementById('preset_A');
    if (presetA) {
        presetA.onchange = (e) => {
            loadPreset('A', e.target.value);
        };
    }
    
    // 프리셋 선택 (Team B)
    const presetB = document.getElementById('preset_B');
    if (presetB) {
        presetB.onchange = (e) => {
            loadPreset('B', e.target.value);
        };
    }
    
    // 다시하기 버튼 (오버레이 내)
    const btnRestart = document.getElementById('btnRestart');
    if (btnRestart) {
        btnRestart.onclick = () => {
            sim.applyStats(logCallback, endGameCallback);
        };
    }
    
    // 로그 삭제 버튼
    const btnClearLog = document.getElementById('btnClearLog');
    if (btnClearLog) {
        btnClearLog.onclick = () => {
            const logContainer = document.getElementById('logContainer');
            if (logContainer) logContainer.innerHTML = '';
        };
    }
    
    // loadPreset을 sim에 추가 (기존 코드 호환성)
    sim.loadPreset = loadPreset;
    
    // 전역 접근을 위한 설정 (기존 코드 호환성)
    window.sim = sim;
}

// DOM 로드 후 초기화
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// 전역 접근을 위한 export (기존 코드 호환성)
// init 함수 실행 후 sim이 설정되므로, init 함수 내에서 설정

