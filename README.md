# Loading Lazy (v1.9.0)

웹 이미지의 레이아웃 시프트(CLS) 방지 및 로딩 성능을 개선하는 고성능 자동화 도구.

## 주요 업데이트 (v1.9.0) 🚀
- **듀얼 엔진 지원 (Regex / Cheerio)**: 기존의 안전한 정규표현식 엔진 외에 정교한 HTML 파싱이 가능한 Cheerio 엔진을 실험적으로 도입했습니다.
- **고도화된 구조 보존 기술**: `xmlMode`와 커스텀 복원 로직을 통해 `head`, `body` 태그 유실 및 `script` 태그가 깨지는 현상을 완벽히 해결했습니다.
- **CLI UX 개선**: 터미널 질문의 가독성을 높여 사용자가 설정을 더 쉽고 빠르게 마칠 수 있도록 최적화했습니다.

## 과거 업데이트 (v1.8.0)
- **단위 생략 옵션 추가**: `none`을 선택하여 스타일 변환 없이 `width`, `height`, 레이지 속성만 추가 가능.
- **폴더 구조 최적화**: 루트 폴더를 사용자 작업 공간 위주로 정리(src 폴더 도입).

## 주요 기능
- **CLS 방지**: 이미지 바이너리 분석을 통해 `width`, `height` 자동 명시.
- **유동적 스타일링**: `rem`(10px 기준) 또는 `vw` 단위로 너비 스타일 및 `flex-shrink: 0` 자동 계산.
- **안전한 변환**: PHP 블록(`<?php ... ?>`)과 주석(`<!-- ... -->`)을 임시 보호하여 로직 파괴를 방지합니다.

## 실행 가이드

### 1. 실행 파일 (.exe)
`loadinglazy.exe` 실행 시 안내에 따라 설정값을 입력하세요. 필수 폴더(`input`, `images`)가 없으면 자동으로 생성하고 대기합니다.

### 2. CLI 실행 (Node.js 환경)
```bash
# 의존성 설치 (최초 1회)
npm install

# 스크립트 실행
node src/convert_loading_lazy.js [단위] [기준폭] [레이지여부] [엔진]

# 예시: rem 단위, 10px 기준, 로딩레이지 사용, Cheerio 엔진 사용
node src/convert_loading_lazy.js rem 10 true cheerio
```

## 파라미터 설명
- **Unit**: 출력 너비 단위 (`rem` / `vw` / `none`)
- **BaseWidth**: `vw` 계산 기준 너비 (예: 1920) 또는 `rem` 배율 기준.
- **UseLazy**: `loading="lazy"`, `decoding="async"` 적용 여부 (`true` / `false`)
- **Engine**: 변환 방식 선택 (`regex` / `cheerio`)

## 주의 사항
- **이미지 경로**: `images/` 폴더 내에 HTML에서 참조하는 실제 이미지 파일이 있어야 크기 분석이 가능합니다.
- **지원 포맷**: PNG, JPG/JPEG, WebP
- **호환성**: Cheerio 엔진 사용 시 일부 특수한 PHP 구문에서 구조 변형이 있을 수 있으니, 복잡한 PHP 템플릿은 `regex` 모드를 권장합니다.
