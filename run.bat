@echo off
setlocal
:: 배치 파일이 위치한 디렉토리로 이동 (경로 고정)
cd /d "%~dp0"

:: Node.js 설치 여부 확인
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [오류] Node.js가 설치되어 있지 않습니다.
    echo Node.js를 설치하거나 빌드된 loadinglazy.exe를 사용해 주세요.
    pause
    exit /b 1
)

:: 스크립트 실행 (인자 전달)
node src\convert_loading_lazy.js %*

:: 에러가 발생했을 때만 확인을 위해 일시정지
:: 성공 시에는 JS 내부의 대기 로직(엔터 입력)이 우선 작동함
if %errorlevel% neq 0 pause
