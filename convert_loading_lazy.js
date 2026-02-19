const fs = require('fs');
const path = require('path');

// 설정 (인자값으로 단위 및 로딩레이지 여부 선택 가능)
const CONFIG = {
    inputDir: path.join(__dirname, 'input'),
    outputDir: path.join(__dirname, 'output'),
    unit: process.argv[2] === 'vw' ? 'vw' : 'rem', // 기본값 rem
    baseWidth: parseInt(process.argv[3]) || 1920,   // vw 사용 시 기준 가로폭
    useLazy: process.argv[4] !== 'false'           // 기본값 true (명시적으로 'false'일 때만 해제)
};

// 이미지 크기 추출 함수 (기존 로직 유지)
function getImageSize(imgSrc, htmlDir) {
    try {
        let fullPath = path.isAbsolute(imgSrc) ? imgSrc : path.join(htmlDir, imgSrc);
        if (!fs.existsSync(fullPath) && imgSrc.startsWith('/')) {
            fullPath = path.join(__dirname, imgSrc.substring(1));
        }
        if (!fs.existsSync(fullPath)) {
            fullPath = path.join(__dirname, imgSrc);
        }
        if (!fs.existsSync(fullPath)) return null;

        const buffer = fs.readFileSync(fullPath);
        if (buffer[0] === 0x89 && buffer[1] === 0x50) {
            return { width: buffer.readInt32BE(16), height: buffer.readInt32BE(20) };
        }
        if (buffer[0] === 0xFF && buffer[1] === 0xD8) {
            let offset = 2;
            while (offset < buffer.length) {
                const marker = buffer.readUInt16BE(offset);
                offset += 2;
                if (marker >= 0xFFC0 && marker <= 0xFFC3) {
                    return { height: buffer.readUInt16BE(offset + 3), width: buffer.readUInt16BE(offset + 5) };
                } else {
                    const length = buffer.readUInt16BE(offset);
                    offset += length;
                }
            }
        }
        if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[8] === 0x57) {
            if (buffer[12] === 0x56 && buffer[13] === 0x50 && buffer[14] === 0x38 && buffer[15] === 0x4C) { // VP8L
                const val = buffer.readUInt32LE(21);
                return { width: (val & 0x3FFF) + 1, height: ((val >> 14) & 0x3FFF) + 1 };
            }
            if (buffer[12] === 0x56 && buffer[13] === 0x50 && buffer[14] === 0x38 && buffer[15] === 0x20) { // VP8
                return { width: buffer.readUInt16LE(26), height: buffer.readUInt16LE(28) };
            }
            if (buffer[12] === 0x56 && buffer[13] === 0x50 && buffer[14] === 0x38 && buffer[15] === 0x58) { // VP8X
                return { width: buffer.readUIntLE(24, 3) + 1, height: buffer.readUIntLE(27, 3) + 1 };
            }
        }
    } catch (e) { return null; }
    return null;
}

function processFile(fileName) {
    const inputPath = path.join(CONFIG.inputDir, fileName);
    const outputPath = path.join(CONFIG.outputDir, fileName);
    const htmlDir = path.dirname(inputPath);

    let content = fs.readFileSync(inputPath, 'utf8');

    // 1. 주석과 PHP 블록을 임시 치환
    const placeholders = [];
    content = content.replace(/(<\?php[\s\S]*?\?>)|(<!--[\s\S]*?-->)/gi, (match) => {
        const placeholder = `__PROTECTED_BLOCK_${placeholders.length}__`;
        placeholders.push(match);
        return placeholder;
    });

    // 2. <img> 태그 처리
    const imgRegex = /<img\b([^>]*)>/gi;
    content = content.replace(imgRegex, (match, attributes) => {
        // 셀프 클로징 슬래시(/) 여부 확인 및 제거
        let isSelfClosing = attributes.trim().endsWith('/');
        let cleanAttributes = isSelfClosing ? attributes.trim().slice(0, -1).trim() : attributes.trim();
        
        // src 추출
        const srcMatch = cleanAttributes.match(/src=["']([^"']+)["']/i);
        if (srcMatch) {
            const src = srcMatch[1];
            const size = getImageSize(src, htmlDir);
            
            if (size) {
                // width, height 속성 추가 (없을 때만)
                if (!cleanAttributes.includes('width=')) {
                    cleanAttributes += ` width="${size.width}"`;
                }
                if (!cleanAttributes.includes('height=')) {
                    cleanAttributes += ` height="${size.height}"`;
                }

                // style width 추가
                let widthValue;
                if (CONFIG.unit === 'vw') {
                    widthValue = ((size.width / CONFIG.baseWidth) * 100).toFixed(4) + 'vw';
                } else {
                    widthValue = (size.width / 10).toFixed(1) + 'rem';
                }

                if (cleanAttributes.includes('style=')) {
                    if (!/style=["'][^"']*width\s*:/i.test(cleanAttributes)) {
                        cleanAttributes = cleanAttributes.replace(/style=(["'])([^"']*)\1/i, (sMatch, quote, styleValue) => {
                            const separator = styleValue.trim() && !styleValue.trim().endsWith(';') ? ';' : '';
                            return `style=${quote}${styleValue}${separator} width: ${widthValue};${quote}`;
                        });
                    }
                } else {
                    cleanAttributes += ` style="width: ${widthValue};"`;
                }
            }
        }

        // loading="lazy" 및 decoding="async" 추가 여부 결정
        let extraAttrs = '';
        if (CONFIG.useLazy && !cleanAttributes.includes('loading=')) {
            extraAttrs += ' loading="lazy"';
        }
        if (CONFIG.useLazy && !cleanAttributes.includes('decoding=')) {
            extraAttrs += ' decoding="async"';
        }

        // 태그 재조립 (슬래시 위치 고정)
        const finalTag = `<img ${cleanAttributes}${extraAttrs} ${isSelfClosing ? '/' : ''}>`;
        return finalTag.replace(/\s+/g, ' ').replace(/\s>/g, '>');
    });

    // 3. 보호된 블록 복구
    placeholders.forEach((original, index) => {
        const placeholder = `__PROTECTED_BLOCK_${index}__`;
        content = content.replace(placeholder, () => original);
    });

    fs.writeFileSync(outputPath, content, 'utf8');
    console.log(`[성공] ${fileName} (레이지: ${CONFIG.useLazy ? 'ON' : 'OFF'}, 단위: ${CONFIG.unit})`);
}

async function run() {
    if (!fs.existsSync(CONFIG.inputDir)) fs.mkdirSync(CONFIG.inputDir);
    if (!fs.existsSync(CONFIG.outputDir)) fs.mkdirSync(CONFIG.outputDir);

    const files = fs.readdirSync(CONFIG.inputDir).filter(file => file.endsWith('.html') || file.endsWith('.php'));
    if (files.length === 0) {
        console.log('input 폴더에 파일이 없습니다.');
        return;
    }

    console.log(`모드: ${CONFIG.unit} (기준: ${CONFIG.baseWidth}px), 로딩레이지: ${CONFIG.useLazy ? '사용' : '사용안함'}`);
    files.forEach(processFile);
}

run();
