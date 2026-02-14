const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');

const CONFIG = {
    inputDir: path.join(__dirname, 'input'),
    outputDir: path.join(__dirname, 'output')
};

function getImageSize(imgSrc, htmlDir) {
    try {
        let fullPath = path.isAbsolute(imgSrc) ? imgSrc : path.join(htmlDir, imgSrc);
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
    
    // 1단계: 보호 (Placeholder) - cheerio가 속성으로 오해하지 않도록 'data-' 접두사 사용
    const placeholders = [];
    const phpAndCommentRegex = /(<\?php[\s\S]*?\?>)|(<!--[\s\S]*?-->)/gi;

    content = content.replace(phpAndCommentRegex, (match) => {
        const id = `PROTECTEDBLOCK${placeholders.length}`; // 특수기호 제거
        placeholders.push(match);
        return id;
    });

    // 2단계: 파싱 (Cheerio)
    const $ = cheerio.load(content, { decodeEntities: false, xmlMode: false });

    $('img').each((index, el) => {
        const $img = $(el);
        const src = $img.attr('src');

        if (!$img.attr('loading')) $img.attr('loading', 'lazy');

        if (src) {
            const size = getImageSize(src, htmlDir);
            if (size) {
                if (!$img.attr('width')) $img.attr('width', size.width);
                if (!$img.attr('height')) $img.attr('height', size.height);

                const remW = (size.width / 10).toFixed(1);
                let currentStyle = $img.attr('style') || '';
                if (!/width\s*:/i.test(currentStyle)) {
                    if (currentStyle && !currentStyle.endsWith(';')) currentStyle += ';';
                    currentStyle = `${currentStyle} width: ${remW}rem;`.trim();
                    $img.attr('style', currentStyle);
                }
            }
        }
    });

    // 3단계: 복원 (Restore) - cheerio가 소문자로 바꿀 수 있으므로 정규식으로 대응
    let convertedContent = $.html();
    
    // 조각(Fragment) 처리: <html> 태그가 없었으면 body 내용만 추출
    if (!content.toLowerCase().includes('<html')) {
        convertedContent = $('body').html();
    }

    placeholders.forEach((original, index) => {
        const id = `PROTECTEDBLOCK${index}`;
        // cheerio가 PROTECTEDBLOCK0="" 처럼 만들었을 경우를 위해 정규식으로 치환
        const regex = new RegExp(`${id}(=\"\")?`, 'gi');
        convertedContent = convertedContent.replace(regex, original);
    });

    fs.writeFileSync(outputPath, convertedContent, 'utf8');
    console.log(`[성공] ${fileName}`);
}

async function run() {
    if (!fs.existsSync(CONFIG.inputDir)) fs.mkdirSync(CONFIG.inputDir);
    if (!fs.existsSync(CONFIG.outputDir)) fs.mkdirSync(CONFIG.outputDir);

    const files = fs.readdirSync(CONFIG.inputDir).filter(file => file.endsWith('.html') || file.endsWith('.php'));
    if (files.length === 0) return;

    console.log(`${files.length}개의 파일 처리를 시작합니다...`);
    files.forEach(processFile);
    console.log('\n모든 작업이 완료되었습니다.');
}

run();
