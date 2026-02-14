# img_loading_lazy

HTML 내 `<img>` 태그에 `loading="lazy"` 속성을 자동으로 추가하고, 이미지 실제 크기를 계산해 `width`, `height`, `style` 속성을 넣어주는 스크립트임.

## 주요 기능
- `loading="lazy"` 속성 자동 추가
- 이미지 바이너리 헤더를 읽어 실제 가로/세로 크기 추출
- `width`, `height` 속성 자동 삽입 (Layout Shift 방지용)
- 인라인 스타일에 `width: XXrem` 자동 추가 (10px = 1rem 기준)

## 사용법
1. Node.js가 설치되어 있어야 함.
2. 터미널에서 아래 명령어 실행:
   ```bash
   node convert_loading_lazy.js <파일명.html>
   ```
3. 변환이 완료되면 원본파일명 뒤에 `_converted`가 붙은 파일이 생성됨.

## 지원 이미지 형식
- PNG
- JPEG (JPG)
- WebP
