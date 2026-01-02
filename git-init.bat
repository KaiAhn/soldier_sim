@echo off
chcp 65001 >nul
echo Git 저장소 초기화 중...

REM Git 초기화
if not exist .git (
    git init
    echo Git 저장소가 초기화되었습니다.
) else (
    echo Git 저장소가 이미 존재합니다.
)

REM 원격 저장소 확인 및 추가
git remote show origin >nul 2>&1
if errorlevel 1 (
    git remote add origin https://github.com/KaiAhn/soldier_sim.git
    echo 원격 저장소가 추가되었습니다.
) else (
    echo 원격 저장소가 이미 설정되어 있습니다.
)

REM .gitignore 생성 (필요한 경우)
if not exist .gitignore (
    echo node_modules/ > .gitignore
    echo .vscode/ >> .gitignore
    echo *.bat >> .gitignore
    echo .gitignore 생성 완료.
)

echo.
echo 초기화 완료! 이제 git-update.ps1 또는 git-update-major.ps1를 실행하세요.
pause


