// Main Entry Point - Initializes and connects all systems
(async function() {
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
        await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve));
    }
    
    // Initialize SettingsManager (main entry point)
    const settingsManager = new SettingsManager();
    
    // Initialize everything (load settings, create BattleSimulator, Camera, units)
    await settingsManager.initialize();
    
    const sim = settingsManager.sim; // Get BattleSimulator instance
    
    // Main Tab switching (부대설정, 병종설정)
    document.querySelectorAll('.main-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.dataset.tab;
            
            // Remove active class from all buttons and tabs
            document.querySelectorAll('.main-tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.main-tab-content').forEach(t => t.classList.remove('active'));
            
            // Add active class to clicked button and corresponding tab
            btn.classList.add('active');
            document.getElementById(`main-tab-${tabName}`).classList.add('active');
        });
    });
    
    // Sub Tab switching (부대AI, 전투밸런스)
    document.querySelectorAll('.sub-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tabName = btn.dataset.tab;
            
            // Remove active class from all buttons and tabs
            document.querySelectorAll('.sub-tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.sub-tab-content').forEach(t => t.classList.remove('active'));
            
            // Add active class to clicked button and corresponding tab
            btn.classList.add('active');
            document.getElementById(`sub-tab-${tabName}`).classList.add('active');
        });
    });
    
    // Button Event Handlers
    document.getElementById('btnApply').onclick = () => {
        settingsManager.saveCurrentSettings();
        sim.applyStatsAndStart();
    };
    
    document.getElementById('btnSaveSettings').onclick = () => {
        settingsManager.exportToFile();
    };
    
    document.getElementById('btnPause').onclick = () => sim.togglePause();
    document.getElementById('btnReset').onclick = () => sim.reset();
    document.getElementById('speedSelect').onchange = (e) => sim.setSpeed(e.target.value);
    
    // 부대 설정 이벤트
    document.getElementById('squad1_preset_A').onchange = () => settingsManager.updateUnits();
    document.getElementById('squad1_preset_B').onchange = () => settingsManager.updateUnits();
    document.getElementById('squad1_formation_A').onchange = () => settingsManager.updateUnits();
    document.getElementById('squad1_formation_B').onchange = () => settingsManager.updateUnits();
    
    // 유닛 스탯 탭 이벤트
    document.getElementById('preset_select').onchange = (e) => settingsManager.loadPresetStats(e.target.value);
    
    // 병종 스탯 저장 이벤트 (입력 필드 변경 시)
    const presetStatIds = ['hp_preset', 'atk_preset', 'as_preset', 'rng_preset', 'spd_preset', 'shd_preset', 'arm_preset', 'mst_preset', 'mor_preset', 'mass_preset', 'squadSize_preset'];
    presetStatIds.forEach(id => {
        const elem = document.getElementById(id);
        if (elem) {
            elem.addEventListener('change', () => settingsManager.savePresetStats());
            elem.addEventListener('input', () => {
                clearTimeout(elem._saveTimeout);
                elem._saveTimeout = setTimeout(() => settingsManager.savePresetStats(), 500);
            });
        }
    });
    
    document.getElementById('btnRestart').onclick = () => {
        settingsManager.saveCurrentSettings();
        sim.applyStatsAndStart();
    };
    
    document.getElementById('btnClearLog').onclick = () => {
        document.getElementById('logContainer').innerHTML = '';
    };
    
    // Camera UI controls
    const toggleIntents = document.getElementById('toggleIntents');
    if (toggleIntents && settingsManager.camera) {
        toggleIntents.checked = settingsManager.camera.showUnitIntents;
        toggleIntents.onchange = (e) => {
            settingsManager.camera.showUnitIntents = e.target.checked;
            sim.render();
        };
    }
    
    const toggleGrid = document.getElementById('toggleGrid');
    if (toggleGrid && settingsManager.camera) {
        toggleGrid.checked = settingsManager.camera.showGrid;
        toggleGrid.onchange = (e) => {
            settingsManager.camera.showGrid = e.target.checked;
            sim.render();
        };
    }
    
    // Make sim and settingsManager globally available
    window.sim = sim;
    window.settingsManager = settingsManager;
    
    console.log('Application initialized');
})();
