import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';

// Đường dẫn tới file list.txt và output.txt
const filePath = path.join(process.cwd(), 'list.txt');
const outputFilePath = path.join(process.cwd(), 'output.txt');

// Hàm xử lý mỗi từ từ list.txt
async function processWord(queryWord) {
    const proxyUrl = 'http://localhost:3000/proxy?url='; // Thay thế bằng URL proxy của bạn nếu có
    const url = `https://dictionary.cambridge.org/vi/dictionary/english/${queryWord.trim()}`;
    let attempts = 0;
    const maxAttempts = 10; // Số lần thử tối đa

    while (attempts < maxAttempts) {
        try {
            attempts += 1;
            const response = await fetch(proxyUrl + encodeURIComponent(url));
            
            if (!response.ok) {
                console.error(`Thử lần ${attempts} thất bại cho từ "${queryWord}".`);
                continue;
            }

            const htmlContent = await response.text();

            // Sử dụng JSDOM để phân tích HTML trong môi trường Node.js
            const dom = new JSDOM(htmlContent);
            const document = dom.window.document;

            const phoneticMatch = Array.from(document.querySelectorAll('#page-content span.us.dpron-i > span.pron.dpron')).map(e => e.outerHTML.trim());
            const phonetic = phoneticMatch.length > 0 ? phoneticMatch[0] : 'N/A';

            const usAudioMatch = Array.from(document.querySelectorAll('#page-content span.us.dpron-i source')).filter(e => e.getAttribute("src")?.includes('.mp3')).map(e => e.getAttribute("src").trim())[0];
            const usAudio = usAudioMatch ? 'https://dictionary.cambridge.org' + usAudioMatch : 'N/A';

            return `${queryWord}|${phonetic}|${usAudio}`;
        } catch (error) {
            console.error(`Lỗi khi thử lần ${attempts} cho từ "${queryWord}":`, error);
        }
    }

    return `${queryWord}|N/A|N/A`;
}

// Hàm để chạy các promises với giới hạn song song
async function processInBatches(words, batchSize) {
    const results = [];
    for (let i = 0; i < words.length; i += batchSize) {
        const batch = words.slice(i, i + batchSize).map(processWord);
        const batchResults = await Promise.all(batch);
        results.push(...batchResults);
    }
    return results;
}

// Đọc file list.txt và xử lý từng từ
fs.readFile(filePath, 'utf8', async (err, data) => {
    if (err) {
        console.error('Lỗi khi đọc file:', err);
        return;
    }

    // Tách file thành các dòng và xử lý mỗi dòng như một từ
    const lines = data.split(/\r?\n/).map(line => line.trim()).filter(queryWord => queryWord);

    // Giới hạn số lượng từ xử lý đồng thời
    const batchSize = 100; // Số lượng link tối đa xử lý mỗi lần
    const results = await processInBatches(lines, batchSize);

    // Ghi tất cả kết quả vào file output.txt
    fs.writeFile(outputFilePath, results.join('\n'), (writeErr) => {
        if (writeErr) {
            console.error('Lỗi khi ghi file:', writeErr);
        } else {
            console.log('Kết quả đã được ghi vào output.txt');
        }
    });
});
