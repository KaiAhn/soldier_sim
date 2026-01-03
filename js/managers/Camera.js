// Camera Manager - Handles all camera controls and UX
class Camera {
    constructor(battleSimulator, settingsManager) {
        this.sim = battleSimulator;
        this.settingsManager = settingsManager;
        
        // Camera properties (will be initialized from settings)
        this.zoom = 1.0;
        this.x = 0;
        this.y = 0;
        this.showUnitIntents = false;
        this.showGrid = false;
        
        // Initialize from settings
        this.loadSettings();
        
        // Setup camera controls
        this.setupControls();
    }
    
    loadSettings() {
        if (!this.settingsManager || !this.settingsManager.settings) return;
        
        const cameraSettings = this.settingsManager.settings.camera;
        if (cameraSettings) {
            // 저장된 줌이 비정상적이면 기본값으로 리셋
            const savedZoom = cameraSettings.zoom;
            if (savedZoom && savedZoom >= 0.1 && savedZoom <= 2.0) {
                this.zoom = savedZoom;
            } else {
                this.zoom = 1.0; // 기본값
            }
            this.x = cameraSettings.x || 0;
            this.y = cameraSettings.y || 0;
            this.showUnitIntents = cameraSettings.showUnitIntents || false;
            this.showGrid = cameraSettings.showGrid || false;
        }
    }
    
    saveSettings() {
        if (!this.settingsManager || !this.settingsManager.settings) return;
        
        if (!this.settingsManager.settings.camera) {
            this.settingsManager.settings.camera = {};
        }
        
        this.settingsManager.settings.camera.zoom = this.zoom;
        this.settingsManager.settings.camera.x = this.x;
        this.settingsManager.settings.camera.y = this.y;
        this.settingsManager.settings.camera.showUnitIntents = this.showUnitIntents;
        this.settingsManager.settings.camera.showGrid = this.showGrid;
        
        this.settingsManager.saveToLocalStorage();
    }
    
    setupControls() {
        if (!this.sim || !this.sim.canvas) return;
        
        const canvas = this.sim.canvas;
        let isDragging = false;
        let lastMouseX = 0;
        let lastMouseY = 0;
        
        // 마우스 드래그로 카메라 이동
        canvas.addEventListener('mousedown', (e) => {
            if (e.button === 0) { // 왼쪽 버튼
                isDragging = true;
                lastMouseX = e.clientX;
                lastMouseY = e.clientY;
                canvas.style.cursor = 'grabbing';
            }
        });
        
        canvas.addEventListener('mousemove', (e) => {
            if (isDragging) {
                const dx = e.clientX - lastMouseX;
                const dy = e.clientY - lastMouseY;
                // 드래그 시 카메라 이동 (스크린 좌표를 월드 좌표로 변환)
                this.x -= dx / this.zoom;
                this.y -= dy / this.zoom;
                lastMouseX = e.clientX;
                lastMouseY = e.clientY;
                // 셋업 상태에서는 SettingsManager.render(), 시뮬레이션 중에는 BattleSimulator.render()
                if (this.settingsManager && this.settingsManager.render && (!this.sim.running)) {
                    this.settingsManager.render();
                } else if (this.sim.render) {
                    this.sim.render();
                }
            }
        });
        
        canvas.addEventListener('mouseup', () => {
            isDragging = false;
            canvas.style.cursor = 'default';
        });
        
        canvas.addEventListener('mouseleave', () => {
            isDragging = false;
            canvas.style.cursor = 'default';
        });
        
        // 마우스 휠로 줌
        canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const zoomFactor = 1.1;
            const mouseX = e.clientX;
            const mouseY = e.clientY;
            
            // 마우스 위치를 월드 좌표로 변환 (x, y는 월드 좌표)
            const worldX = (mouseX - canvas.width / 2) / this.zoom + this.x;
            const worldY = (mouseY - canvas.height / 2) / this.zoom + this.y;
            
            // 줌 변경
            if (e.deltaY < 0) {
                this.zoom = Math.min(this.zoom * zoomFactor, 2.0); // 최대 2배
            } else {
                this.zoom = Math.max(this.zoom / zoomFactor, 0.01); // 최소 0.01배
            }
            
            // 마우스 위치를 중심으로 줌 (같은 월드 좌표가 화면의 같은 위치에 있도록)
            const newWorldX = (mouseX - canvas.width / 2) / this.zoom + this.x;
            const newWorldY = (mouseY - canvas.height / 2) / this.zoom + this.y;
            
            // 카메라 위치 조정 (줌 전후 마우스가 가리키는 월드 좌표가 동일하도록)
            this.x += worldX - newWorldX;
            this.y += worldY - newWorldY;
            
            // 셋업 상태에서는 SettingsManager.render(), 시뮬레이션 중에는 BattleSimulator.render()
            if (this.settingsManager && this.settingsManager.render && (!this.sim.running)) {
                this.settingsManager.render();
            } else if (this.sim.render) {
                this.sim.render();
            }
        });
        
        // 키보드로 카메라 이동 (화살표 키)
        window.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
            
            const moveSpeed = 20;
            switch(e.key) {
                case 'ArrowUp':
                    e.preventDefault();
                    this.y -= moveSpeed / this.zoom;
                    if (this.settingsManager && this.settingsManager.render && (!this.sim.running)) {
                        this.settingsManager.render();
                    } else if (this.sim.render) {
                        this.sim.render();
                    }
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    this.y += moveSpeed / this.zoom;
                    if (this.settingsManager && this.settingsManager.render && (!this.sim.running)) {
                        this.settingsManager.render();
                    } else if (this.sim.render) {
                        this.sim.render();
                    }
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    this.x -= moveSpeed / this.zoom;
                    if (this.settingsManager && this.settingsManager.render && (!this.sim.running)) {
                        this.settingsManager.render();
                    } else if (this.sim.render) {
                        this.sim.render();
                    }
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this.x += moveSpeed / this.zoom;
                    if (this.settingsManager && this.settingsManager.render && (!this.sim.running)) {
                        this.settingsManager.render();
                    } else if (this.sim.render) {
                        this.sim.render();
                    }
                    break;
            }
        });
    }
    
    // 카메라를 유닛 중심으로 이동
    focusOnUnits() {
        if (!this.sim || !this.sim.units || this.sim.units.length === 0) return;
        
        let sumX = 0, sumY = 0;
        for (const unit of this.sim.units) {
            sumX += unit.x;
            sumY += unit.y;
        }
        const centerX = sumX / this.sim.units.length;
        const centerY = sumY / this.sim.units.length;
        
        this.x = centerX;
        this.y = centerY;
    }
    
    // Render helper - 카메라 변환 적용
    applyTransform(ctx) {
        ctx.translate(ctx.canvas.width / 2, ctx.canvas.height / 2);
        ctx.scale(this.zoom, this.zoom);
        ctx.translate(-this.x, -this.y);
    }
}
