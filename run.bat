@echo off
:: UTF-8 코드 페이지로 변경 (한글 깨짐 방지)
chcp 65001 > nul
title Image Loading Lazy Converter
setlocal enabledelayedexpansion

echo ==========================================
echo    Image Loading Lazy Converter v1.2
echo ==========================================

:: node_modules 확인
if not exist "node_modules" (
    echo [알림] 라이브러리가 없습니다. 설치를 시작합니다...
    npm install
)

:: input 폴더 확인
if not exist "input" (
    mkdir "input"
    echo [알림] input 폴더에 파일을 넣어주세요.
    pause
    exit /b
)

echo.
echo  사용할 단위를 선택하세요:
echo  1. rem (10px = 1rem)
echo  2. vw (반응형 가로폭 기준)
echo.

set /p choice=" 선택 (1 또는 2): "

if "%choice%"=="2" (
    set UNIT=vw
    set /p base=" 기준 가로폭 입력 (기본 1920): "
    if "!base!"=="" set base=1920
) else (
    set UNIT=rem
    set base=10
)

echo.
echo  로딩 레이지(loading="lazy")를 적용하시겠습니까?
set /p lazy_choice=" 선택 (Y/N, 기본 Y): "
if /i "%lazy_choice%"=="N" (
    set USE_LAZY=false
) else (
    set USE_LAZY=true
)

echo.
node convert_loading_lazy.js %UNIT% %base% %USE_LAZY%

echo ==========================================
echo    작업 완료! output 폴더를 확인하세요.
echo ==========================================
pause
