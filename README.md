# Loading Lazy (v1.8.0)

웹 이미지의 레이아웃 시프트(CLS) 방지 및 로딩 성능을 개선하는 자동화 도구.

## 주요 업데이트 (v1.8.0)
- **단위 생략 옵션 추가**: `none`을 선택하여 스타일 변환 없이 `width`, `height`, 레이지만 추가 가능.
- **폴더 구조 최적화**: 루트 폴더를 사용자 작업 공간 위주로 정리(src 폴더 도입).
- **GZip 압축 빌드**: 실행 파일(.exe) 배포 시 압축 옵션 적용.

## 과거 업데이트 (v1.7.0)
- **독립 실행 파일(.exe)**: Node.js 없이 실행 가능.
- **인터랙티브 모드**: 필수 폴더나 파일이 없을 경우 실시간 대기 및 안내 기능 추가.
- **비동기 디코딩**: `decoding="async"` 속성 자동 적용.
- **XHTML 지원**: Self-closing 태그(`/`로 닫는 태그) 호환성 개선.

## 주요 기능
- **CLS 방지**: 이미지 헤더 분석 후 `width`, `height` 자동 명시.
- **유동적 스타일링**: `rem`(10px 기준) 또는 `vw` 단위로 너비 스타일 자동 계산.
- **구조 보존**: DOM 파서 대신 정규식을 사용하여 PHP 로직 및 주석 구조 100% 유지.

## 실행 가이드

### 1. 실행 파일 (.exe)
`loadinglazy.exe` 실행 시 `input`, `images`, `output` 폴더 자동 생성. 터미널 안내에 따라 설정값 입력.

### 2. CLI 실행 (Node.js 환경)
```bash
npm install
node convert_loading_lazy.js [단위] [기준폭] [레이지여부]
# 예: node convert_loading_lazy.js rem 10 true
# 단위 옵션: rem, vw, none(스타일 생략)
```

## 파라미터
- **Unit**: 출력 너비 단위 (`rem` / `vw` / `none`)
- **BaseWidth**: `vw` 계산 기준 해상도 너비 (Unit이 `none`일 경우 무시)
- **UseLazy**: `loading="lazy"`, `decoding="async"` 적용 여부 (`true` / `false`)

## 주의 사항
- **지원 포맷**: PNG, JPG/JPEG, WebP
- **이미지 경로**: `images/` 폴더 내에 원본 이미지가 있어야 분석 가능.
- **보안**: PHP 블록 및 HTML 주석 내부 내용은 변환에서 제외됨.
