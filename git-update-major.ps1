# 메이저 업데이트 - 마이너 버전 증가
Write-Host "메이저 업데이트 중..." -ForegroundColor Cyan

# 버전 읽기
$versionJson = Get-Content version.json | ConvertFrom-Json
$versionParts = $versionJson.version -split '\.'
$major = [int]$versionParts[0]
$minor = [int]$versionParts[1]
$patch = [int]$versionParts[2]

# 마이너 버전 증가 (패치는 0으로)
$minor++
$patch = 0
$newVersion = "$major.$minor.$patch"

# 이전 버전 저장
$oldVersion = $versionJson.version

# version.json 업데이트
$versionJson.version = $newVersion
$versionJson | ConvertTo-Json | Set-Content version.json

Write-Host "버전 업데이트: $oldVersion -> $newVersion" -ForegroundColor Yellow

# HTML 파일 업데이트
$indexHtml = Get-Content index.html -Raw -Encoding UTF8
$indexHtml = $indexHtml -replace '유닛 교전 시뮬레이터 v\d+\.\d+\.\d+', "유닛 교전 시뮬레이터 v$newVersion"
$indexHtml = $indexHtml -replace '유닛 교전 시뮬레이터 v\d+\.\d+', "유닛 교전 시뮬레이터 v$newVersion"
$indexHtml = $indexHtml -replace '<title>.*?v\d+\.\d+\.\d+.*?</title>', "<title>유닛 교전 시뮬레이터 v$newVersion</title>"
$indexHtml = $indexHtml -replace '<title>.*?v\d+\.\d+.*?</title>', "<title>유닛 교전 시뮬레이터 v$newVersion</title>"
Set-Content index.html $indexHtml -Encoding UTF8

$soldierHtml = Get-Content soldier_sim.html -Raw -Encoding UTF8
$soldierHtml = $soldierHtml -replace '유닛 교전 시뮬레이터 v\d+\.\d+\.\d+', "유닛 교전 시뮬레이터 v$newVersion"
$soldierHtml = $soldierHtml -replace '유닛 교전 시뮬레이터 v\d+\.\d+', "유닛 교전 시뮬레이터 v$newVersion"
$soldierHtml = $soldierHtml -replace '<title>.*?v\d+\.\d+\.\d+.*?</title>', "<title>유닛 교전 시뮬레이터 v$newVersion</title>"
$soldierHtml = $soldierHtml -replace '<title>.*?v\d+\.\d+.*?</title>', "<title>유닛 교전 시뮬레이터 v$newVersion</title>"
Set-Content soldier_sim.html $soldierHtml -Encoding UTF8

Write-Host "HTML 파일 업데이트 완료" -ForegroundColor Green

# Git 초기화 확인
if (-not (Test-Path .git)) {
    Write-Host "Git 저장소 초기화 중..." -ForegroundColor Yellow
    git init
    git remote add origin https://github.com/KaiAhn/soldier_sim.git
}

# Git 커밋
Write-Host "Git 커밋 중..." -ForegroundColor Cyan
git add .
git commit -m "Major update to v$newVersion"

# 브랜치 설정 (처음인 경우)
$currentBranch = git branch --show-current
if (-not $currentBranch) {
    git branch -M main
    $currentBranch = "main"
}

# 푸시
Write-Host "Git 푸시 중..." -ForegroundColor Cyan
git push -u origin $currentBranch
if ($LASTEXITCODE -ne 0) {
    # main이 없으면 master로 시도
    git push -u origin master
}

Write-Host "완료! 버전 v$newVersion로 업데이트되었습니다." -ForegroundColor Green

