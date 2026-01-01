/**
 * ui.js - UI 핸들링 및 프리셋 관리
 */

import { UNIT_PRESETS } from './Config.js';

/**
 * 프리셋 초기화 (드롭다운 채우기)
 */
export function initPresets() {
    // 디버깅: UNIT_PRESETS 확인
    if (!UNIT_PRESETS || Object.keys(UNIT_PRESETS).length === 0) {
        console.error('UNIT_PRESETS가 로드되지 않았습니다!');
        return;
    }
    
    const selA = document.getElementById('preset_A');
    const selB = document.getElementById('preset_B');
    
    if (!selA || !selB) {
        console.error('프리셋 select 요소를 찾을 수 없습니다!');
        return;
    }
    
    // 기존 옵션 제거 (초기화)
    selA.innerHTML = '<option value="">선택...</option>';
    selB.innerHTML = '<option value="">선택...</option>';
    
    for (let name in UNIT_PRESETS) {
        if (selA) {
            let optA = document.createElement('option');
            optA.value = name; 
            optA.innerText = name;
            selA.appendChild(optA);
        }
        
        if (selB) {
            let optB = document.createElement('option');
            optB.value = name; 
            optB.innerText = name;
            selB.appendChild(optB);
        }
    }
    
    // 기본값 설정
    loadPreset('A', '징집병');
    loadPreset('B', '경보병');
}

/**
 * 프리셋 로드 (UI 입력 필드에 값 설정)
 */
export function loadPreset(team, presetName) {
    if (!presetName || !UNIT_PRESETS[presetName]) return;
    const stats = UNIT_PRESETS[presetName];
    const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = val;
    };
    
    setVal(`hp_${team}`, stats.hp);
    setVal(`atk_${team}`, stats.atk);
    setVal(`as_${team}`, stats.as);
    setVal(`rng_${team}`, stats.rng);
    setVal(`spd_${team}`, stats.spd);
    setVal(`shd_${team}`, stats.shd);
    setVal(`arm_${team}`, stats.arm);
    setVal(`mst_${team}`, stats.mst);
    setVal(`mor_${team}`, stats.mor);
}

/**
 * 로그 메시지 출력
 */
export function logMessage(logContainer, elapsedTime, msg, className = '') {
    if (!logContainer) return;
    const time = `[${elapsedTime.toFixed(1)}s] `;
    const div = document.createElement('div');
    div.className = `log-entry ${className}`;
    div.innerHTML = `<span class="text-gray-400 text-[10px]">${time}</span> ${msg}`;
    logContainer.appendChild(div);
    logContainer.scrollTop = logContainer.scrollHeight;
}

