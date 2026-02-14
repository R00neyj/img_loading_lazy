const fs = require('fs');
const path = require('path');

/**
 * 이미지 파일의 바이너리 헤더를 읽어 width, height를 추출하는 함수
 */
function getImageSize(imgSrc, htmlDir) {
    try {
        const fullPath = path.isAbsolute(imgSrc) ? imgSrc : path.join(htmlDir, imgSrc);
        if (!fs.existsSync(fullPath)) return null;

        const buffer = fs.readFileSync(fullPath);
        
        // PNG
        if (buffer[0] === 0x89 && buffer[1] === 0x50) {
            return {
                width: buffer.readInt32BE(16),
                height: buffer.readInt32BE(20)
            };
        }
        
        // JPEG
        if (buffer[0] === 0xFF && buffer[1] === 0xD8) {
            let offset = 2;
            while (offset < buffer.length) {
                const marker = buffer.readUInt16BE(offset);
                offset += 2;
                if (marker >= 0xFFC0 && marker <= 0xFFC3) {
                    return {
                        height: buffer.readUInt16BE(offset + 3),
                        width: buffer.readUInt16BE(offset + 5)
                    };
                } else {
                    const length = buffer.readUInt16BE(offset);
                    offset += length;
                }
            }
        }

        // WebP
        if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[8] === 0x57) {
            if (buffer[12] === 0x56 && buffer[13] === 0x50 && buffer[14] === 0x38 && buffer[15] === 0x4C) { // VP8L
                const val = buffer.readUInt32LE(21);
                const width = (val & 0x3FFF) + 1;
                const height = ((val >> 14) & 0x3FFF) + 1;
                return { width, height };
            }
            if (buffer[12] === 0x56 && buffer[13] === 0x50 && buffer[14] === 0x38 && buffer[15] === 0x20) { // VP8
                return {
                    width: buffer.readUInt16LE(26),
                    height: buffer.readUInt16LE(28)
                };
            }
            if (buffer[12] === 0x56 && buffer[13] === 0x50 && buffer[14] === 0x38 && buffer[15] === 0x58) { // VP8X
                return {
                    width: buffer.readUIntLE(24, 3) + 1,
                    height: buffer.readUIntLE(27, 3) + 1
                };
            }
        }
    } catch (e) {
        return null;
    }
    return null;
}

function convertLoadingLazy(filePath) {
    if (!fs.existsSync(filePath)) {
        console.error(`파일을 찾을 수 없습니다: ${filePath}`);
        return;
    }

    const htmlDir = path.dirname(filePath);
    const content = fs.readFileSync(filePath, 'utf8');
    
    const convertedContent = content.replace(/<img\s+([^>]+)>/gi, (match, attributes) => {
        let isSelfClosing = attributes.endsWith('/');
        let newAttrs = isSelfClosing ? attributes.slice(0, -1).trim() : attributes.trim();
        
        // 1. loading="lazy" 추가
        if (!/\bloading\s*=/i.test(newAttrs)) {
            newAttrs = `loading="lazy" ${newAttrs}`;
        }

        // 2. 이미지 사이즈 추출 및 속성 삽입
        const srcMatch = newAttrs.match(/src=["']([^"']+)["']/i);
        if (srcMatch) {
            const imgSrc = srcMatch[1];
            const size = getImageSize(imgSrc, htmlDir);

            if (size) {
                // 기존에 width, height 속성이 없다면 추가 (종횡비 계산용)
                if (!/\bwidth\s*=/i.test(newAttrs)) {
                    newAttrs += ` width="${size.width}"`;
                }
                if (!/\bheight\s*=/i.test(newAttrs)) {
                    newAttrs += ` height="${size.height}"`;
                }

                // 인라인 스타일: width만 rem으로 명시
                const remW = (size.width / 10).toFixed(1);
                const styleValue = `width: ${remW}rem;`;

                const styleMatch = newAttrs.match(/style=["']([^"']*)["']/i);
                if (styleMatch) {
                    let currentStyle = styleMatch[1].trim();
                    if (!/width\s*:/i.test(currentStyle)) {
                        if (currentStyle && !currentStyle.endsWith(';')) currentStyle += ';';
                        currentStyle = `${currentStyle} ${styleValue}`.trim();
                        newAttrs = newAttrs.replace(styleMatch[0], `style="${currentStyle}"`);
                    }
                } else {
                    newAttrs += ` style="${styleValue}"`;
                }
            }
        }

        return `<img ${newAttrs}${isSelfClosing ? ' /' : ''}>`;
    });

    const ext = path.extname(filePath);
    const base = path.basename(filePath, ext);
    const newFilePath = path.join(htmlDir, `${base}_converted${ext}`);

    fs.writeFileSync(newFilePath, convertedContent, 'utf8');
    console.log(`변환 완료: ${newFilePath}`);
}

const targetFile = process.argv[2];
if (targetFile) convertLoadingLazy(targetFile);
else console.log('사용법: node convert_loading_lazy.js <파일명>');