@echo off
title Image Loading Lazy Converter
setlocal

echo ==========================================
echo    Image Loading Lazy Converter v1.1
echo ==========================================

:: node_modules 확인
if not exist "node_modules" (
    echo [알림] 라이브러리가 없습니다. 설치를 시작합니다...
    npm install
    if %errorlevel% neq 0 (
        echo [에러] npm install 실패! Node.js가 설치되어 있는지 확인하세요.
        pause
        exit /b
    )
)

:: input 폴더 확인
if not exist "input" (
    mkdir "input"
    echo [알림] input 폴더를 생성했습니다. 변환할 파일을 넣어주세요.
    pause
    exit /b
)

:: 스크립트 실행
node convert_loading_lazy.js

echo ==========================================
echo    작업 완료! output 폴더를 확인하세요.
echo ==========================================
pause
