const fs = require('fs');
const path = require('path');
const readline = require('readline');
const cheerio = require('cheerio');

// 설정 초기화
let CONFIG = {
    inputDir: path.join(process.cwd(), 'input'),
    outputDir: path.join(process.cwd(), 'output'),
    unit: 'rem',
    baseWidth: 1920,
    useLazy: true,
    engine: 'regex' // 'regex' 또는 'cheerio'
};

async function askQuestion(query) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    return new Promise(resolve => rl.question(query, ans => {
        rl.close();
        resolve(ans);
    }));
}

// 이미지 크기 추출 함수 (기존 로직 유지)
function getImageSize(imgSrc, htmlDir) {
    try {
        let fullPath = path.isAbsolute(imgSrc) ? imgSrc : path.join(htmlDir, imgSrc);
        if (!fs.existsSync(fullPath) && imgSrc.startsWith('/')) {
            fullPath = path.join(process.cwd(), imgSrc.substring(1));
        }
        if (!fs.existsSync(fullPath)) {
            fullPath = path.join(process.cwd(), imgSrc);
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

    // 1. 주석과 PHP 블록을 임시 치환 (공통)
    const placeholders = [];
    content = content.replace(/(<\?php[\s\S]*?\?>)|(<!--[\s\S]*?-->)/gi, (match) => {
        const placeholder = `__PROTECTED_BLOCK_${placeholders.length}__`;
        placeholders.push(match);
        return placeholder;
    });

    if (CONFIG.engine === 'cheerio') {
        // --- [방식 A] Cheerio 파서 기반 처리 ---
        // xmlMode: true를 사용하여 HTML 구조 강제 이동(meta 태그가 body로 가는 현상 등)을 방지
        const $ = cheerio.load(content, {
            xmlMode: true,
            decodeEntities: false,
            lowerCaseAttributeNames: false,
            recognizeSelfClosing: true
        });

        $('img').each((i, el) => {
            const $img = $(el);
            const src = $img.attr('src');
            if (!src) return;

            const size = getImageSize(src, htmlDir);
            if (size) {
                if (!$img.attr('width')) $img.attr('width', size.width);
                if (!$img.attr('height')) $img.attr('height', size.height);

                if (CONFIG.unit !== 'none') {
                    const widthValue = CONFIG.unit === 'vw' 
                        ? ((size.width / CONFIG.baseWidth) * 100).toFixed(4) + 'vw'
                        : (size.width / 10).toFixed(1) + 'rem';
                    
                    let style = $img.attr('style') || '';
                    // width가 없으면 추가
                    if (!/width\s*:/i.test(style)) {
                        const separator = style.trim() && !style.trim().endsWith(';') ? ';' : '';
                        style = `${style}${separator} width: ${widthValue};`;
                    }
                    // flex-shrink가 없으면 추가
                    if (!/flex-shrink\s*:/i.test(style)) {
                        const separator = style.trim() && !style.trim().endsWith(';') ? ';' : '';
                        style = `${style}${separator} flex-shrink: 0;`;
                    }
                    $img.attr('style', style.trim());
                }
            }

            if (CONFIG.useLazy) {
                if (!$img.attr('loading')) $img.attr('loading', 'lazy');
                if (!$img.attr('decoding')) $img.attr('decoding', 'async');
            }

            // 부모 태그 클래스 추가
            const $parent = $img.parent();
            if ($parent.length > 0) {
                const parentTag = $parent.prop('tagName').toLowerCase();
                // body나 html 같은 최상위 태그는 제외
                if (parentTag !== 'body' && parentTag !== 'html') {
                    if (!$parent.hasClass('flex') && !$parent.hasClass('flex-cc')) {
                        $parent.addClass('flex-cc');
                    }
                }
            }
        });
        content = $.html();
        
        // xmlMode: true에서 발생하는 script, div, title 등 빈 태그의 셀프 클로징(/>) 현상을 복구
        // 브라우저 호환성을 위해 반드시 </script> 등 명시적 닫는 태그가 필요함
        content = content.replace(/<(script|div|span|p|a|iframe|canvas|video|audio|title|textarea|select|button)([^>]*?)\/>/gi, '<$1$2></$1>');
    } else {
        // --- [방식 B] 기존 정규표현식(Regex) 기반 처리 ---
        // 2. 부모 태그에 flex-cc 클래스 추가 로직 (ImgResize 로직 반영)
        content = content.replace(/(<([a-z0-9]+)\b([^>]*)>)(\s*)(?=<img\b)/gi, (match, fullOpenTag, tagName, attributes, whitespace) => {
            if (!/class=["'][^"']*\b(flex|flex-cc)\b/i.test(attributes)) {
                if (attributes.includes('class=')) {
                    fullOpenTag = fullOpenTag.replace(/class=(["'])([^"']*)\1/i, (m, q, cls) => `class=${q}${cls} flex-cc${q}`);
                } else {
                    fullOpenTag = fullOpenTag.replace(new RegExp(`<${tagName}`, 'i'), `<${tagName} class="flex-cc"`);
                }
            }
            return fullOpenTag + whitespace;
        });

        // 3. <img> 태그 처리
        const imgRegex = /<img\b([^>]*)>/gi;
        content = content.replace(imgRegex, (match, attributes) => {
            let isSelfClosing = attributes.trim().endsWith('/');
            let cleanAttributes = isSelfClosing ? attributes.trim().slice(0, -1).trim() : attributes.trim();
            
            const srcMatch = cleanAttributes.match(/src=["']([^"']+)["']/i);
            if (srcMatch) {
                const src = srcMatch[1];
                const size = getImageSize(src, htmlDir);
                
                if (size) {
                    if (!cleanAttributes.includes('width=')) {
                        cleanAttributes += ` width="${size.width}"`;
                    }
                    if (!cleanAttributes.includes('height=')) {
                        cleanAttributes += ` height="${size.height}"`;
                    }

                    if (CONFIG.unit !== 'none') {
                        let widthValue = CONFIG.unit === 'vw' 
                            ? ((size.width / CONFIG.baseWidth) * 100).toFixed(4) + 'vw'
                            : (size.width / 10).toFixed(1) + 'rem';

                        if (cleanAttributes.includes('style=')) {
                            // width 추가 (없을 때)
                            if (!/style=["'][^"']*width\s*:/i.test(cleanAttributes)) {
                                cleanAttributes = cleanAttributes.replace(/style=(["'])([^"']*)\1/i, (sMatch, quote, styleValue) => {
                                    const separator = styleValue.trim() && !styleValue.trim().endsWith(';') ? ';' : '';
                                    return `style=${quote}${styleValue}${separator} width: ${widthValue};${quote}`;
                                });
                            }
                            // flex-shrink 추가 (없을 때)
                            if (!/style=["'][^"']*flex-shrink\s*:/i.test(cleanAttributes)) {
                                cleanAttributes = cleanAttributes.replace(/style=(["'])([^"']*)\1/i, (sMatch, quote, styleValue) => {
                                    const separator = styleValue.trim() && !styleValue.trim().endsWith(';') ? ';' : '';
                                    return `style=${quote}${styleValue}${separator} flex-shrink: 0;${quote}`;
                                });
                            }
                        } else {
                            cleanAttributes += ` style="width: ${widthValue}; flex-shrink: 0;"`;
                        }
                    }
                }
            }

            let extraAttrs = '';
            if (CONFIG.useLazy && !cleanAttributes.includes('loading=')) {
                extraAttrs += ' loading="lazy"';
            }
            if (CONFIG.useLazy && !cleanAttributes.includes('decoding=')) {
                extraAttrs += ' decoding="async"';
            }

            const finalTag = `<img ${cleanAttributes}${extraAttrs} ${isSelfClosing ? '/' : ''}>`;
            return finalTag.replace(/\s+/g, ' ').replace(/\s>/g, '>');
        });
    }

    // 4. 보호된 블록 복구 (공통)
    placeholders.forEach((original, index) => {
        const placeholder = `__PROTECTED_BLOCK_${index}__`;
        content = content.replace(placeholder, () => original);
    });

    fs.writeFileSync(outputPath, content, 'utf8');
    console.log(`[성공] ${fileName} (엔진: ${CONFIG.engine}, 레이지: ${CONFIG.useLazy ? 'ON' : 'OFF'})`);
}

async function run() {
    console.log('==========================================');
    console.log('   Image Loading Lazy Converter v1.9.0');
    console.log('==========================================\n');

    // 1. 필수 폴더 및 파일 확인 (있을 때까지 대기)
    while (true) {
        const imagesDir = path.join(process.cwd(), 'images');
        let folderCreated = false;

        if (!fs.existsSync(CONFIG.inputDir)) {
            fs.mkdirSync(CONFIG.inputDir);
            folderCreated = true;
        }
        if (!fs.existsSync(imagesDir)) {
            fs.mkdirSync(imagesDir);
            folderCreated = true;
        }

        const files = fs.existsSync(CONFIG.inputDir) 
            ? fs.readdirSync(CONFIG.inputDir).filter(file => file.endsWith('.html') || file.endsWith('.php'))
            : [];

        if (folderCreated || files.length === 0) {
            console.log('[알림] 대기 중: input 폴더에 처리할 파일(.html, .php)이 없습니다.');
            console.log('       1. input 폴더에 HTML/PHP 파일을 넣으세요.');
            console.log('       2. images 폴더에 소스 이미지들을 넣으세요.');
            await askQuestion('\n파일을 넣으셨다면 엔터를 눌러 계속 진행하세요 (종료: Ctrl+C)...');
            console.log('\n다시 확인 중...\n');
            continue;
        }
        break;
    }

    // 2. 설정 확인 (인자값 또는 대화형)
    if (process.argv.length > 2) {
        // 인자 순서: unit, baseWidth, useLazy, engine
        const argUnit = process.argv[2];
        if (argUnit === 'none') {
            CONFIG.unit = 'none';
        } else {
            CONFIG.unit = argUnit === 'vw' ? 'vw' : 'rem';
        }
        CONFIG.baseWidth = parseInt(process.argv[3]) || (CONFIG.unit === 'vw' ? 1920 : 10);
        CONFIG.useLazy = process.argv[4] !== 'false';
        CONFIG.engine = process.argv[5] === 'cheerio' ? 'cheerio' : 'regex';
    } else {
        const engineChoice = await askQuestion('변환 엔진을 선택하세요\n 1: 정규표현식(Regex)\n 2: 파서(Cheerio) / 실험적 기능\n [기본 1]: ');
        CONFIG.engine = engineChoice === '2' ? 'cheerio' : 'regex';

        const unitChoice = await askQuestion('\n사용할 단위를 선택하세요\n 1: rem\n 2: vw\n 3: none(생략)\n [기본 1]: ');
        if (unitChoice === '2') {
            CONFIG.unit = 'vw';
            const base = await askQuestion(' > 기준 가로폭 입력 [기본 1920]: ');
            CONFIG.baseWidth = parseInt(base) || 1920;
        } else if (unitChoice === '3') {
            CONFIG.unit = 'none';
        } else {
            CONFIG.unit = 'rem';
            CONFIG.baseWidth = 10;
        }

        const lazyChoice = await askQuestion('\n로딩 레이지(loading="lazy")를 적용하시겠습니까?\n Y: 예 (권장)\n N: 아니오\n [기본 Y]: ');
        CONFIG.useLazy = lazyChoice.toLowerCase() !== 'n';
    }

    if (!fs.existsSync(CONFIG.outputDir)) fs.mkdirSync(CONFIG.outputDir);

    const files = fs.readdirSync(CONFIG.inputDir).filter(file => file.endsWith('.html') || file.endsWith('.php'));
    
    console.log(`\n모드: ${CONFIG.unit} (기준: ${CONFIG.baseWidth}px), 엔진: ${CONFIG.engine}, 로딩레이지: ${CONFIG.useLazy ? 'ON' : 'OFF'}`);
    files.forEach(processFile);

    console.log('\n==========================================');
    console.log('   작업 완료! output 폴더를 확인하세요.');
    console.log('==========================================');

    // exe 실행 시 바로 닫히는 것 방지
    if (process.argv.length <= 2) {
        await askQuestion('\n종료하려면 엔터를 누르세요...');
    }
}

run();
