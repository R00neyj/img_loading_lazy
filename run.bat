@echo off
set "VERSION=v1.7.0"
:: UTF-8 설정
chcp 65001 > nul
title Image Loading Lazy Converter %VERSION%

:: 1. Node.js 설치 확인
node -v >nul 2>&1
if errorlevel 1 goto ERR_NODE

:: 2. 필수 폴더 생성 (이미 있으면 무시)
if not exist "input" mkdir "input"
if not exist "images" mkdir "images"
if not exist "output" mkdir "output"

:: 3. node_modules 확인
if exist "node_modules\" goto CHECK_FILES
echo [알림] 라이브러리가 없습니다. 설치를 시작합니다...
call npm install --silent
if errorlevel 1 goto ERR_NPM

:CHECK_FILES
cls
echo ==========================================
echo    Image Loading Lazy Converter %VERSION%
echo ==========================================
echo.

:: 4. 파일 존재 여부 확인 (루프)
set "HAS_FILES=0"
if exist "input\*.html" set "HAS_FILES=1"
if exist "input\*.php" set "HAS_FILES=1"

:: 파일이 있으면 설정 단계로 이동
if "%HAS_FILES%"=="1" goto START_CONFIG

echo [알림] 대기 중: input 폴더에 처리할 파일(.html, .php)이 없습니다.
echo.
echo  1. input 폴더에 HTML/PHP 파일을 넣어주세요.
echo  2. images 폴더에 소스 이미지들을 넣어주세요.
echo.
echo  파일을 넣으셨다면 [아무 키]나 눌러 계속 진행하세요.
echo  (종료하시려면 이 창을 닫으세요)
pause > nul
goto CHECK_FILES

:START_CONFIG
echo [알림] 파일 확인 완료! 설정을 시작합니다.
echo.
echo  사용할 단위를 선택하세요:
echo  1. rem (10px = 1rem)
echo  2. vw (반응형 가로폭 기준)
echo.

set "CHOICE=1"
set /p "CHOICE= 선택 (1 또는 2, 기본 1): "

:: 단위 설정
set "UNIT=rem"
set "BASE=10"
if "%CHOICE%"=="2" goto SET_VW
goto SET_LAZY

:SET_VW
set "UNIT=vw"
set "BASE=1920"
set /p "BASE= 기준 가로폭 입력 (기본 1920): "

:SET_LAZY
echo.
echo  로딩 레이지(loading="lazy")를 적용하시겠습니까? (Y/N)
set "LAZY_CHOICE=Y"
set /p "LAZY_CHOICE= 선택 (기본 Y): "

set "USE_LAZY=true"
if /i "%LAZY_CHOICE%"=="N" set "USE_LAZY=false"

echo.
echo  작업을 시작합니다...
echo.
node convert_loading_lazy.js %UNIT% %BASE% %USE_LAZY%

echo.
echo ==========================================
echo    작업 완료! output 폴더를 확인하세요.
echo ==========================================
pause
exit /b

:ERR_NODE
echo [에러] Node.js가 설치되어 있지 않습니다.
echo https://nodejs.org 에서 설치 후 다시 실행해주세요.
pause
exit /b

:ERR_NPM
echo [에러] 라이브러리 설치(npm install) 중 오류가 발생했습니다.
echo 인터넷 연결을 확인하고 다시 실행해주세요.
pause
exit /b
