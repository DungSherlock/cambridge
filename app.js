import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';

// Đường dẫn tới file list.txt
const filePath = path.join(process.cwd(), 'list.txt');

// Hàm xử lý mỗi từ từ list.txt
async function processWord(queryWord) {
    const proxyUrl = 'https://proxy-server-self-six.vercel.app/proxy?url='; // Thay thế bằng URL proxy của bạn nếu có
    const url = `https://dictionary.cambridge.org/vi/dictionary/english/${queryWord.trim()}`;

    try {
        const response = await fetch(proxyUrl + encodeURIComponent(url));
        const htmlContent = await response.text();

        // Sử dụng JSDOM để phân tích HTML trong môi trường Node.js
        const dom = new JSDOM(htmlContent);
        const doc = dom.window.document;

        // Trích xuất phát âm
        const results = Array.from(doc.querySelectorAll('#page-content span.us.dpron-i > span.pron.dpron'))
            .map(e => e.outerHTML.trim())[0];

        console.log(`Kết quả cho từ "${queryWord}":`, results);
    } catch (error) {
        console.error(`Lỗi khi xử lý từ "${queryWord}":`, error);
    }
}

// Đọc file list.txt và xử lý từng từ
fs.readFile(filePath, 'utf8', async (err, data) => {
    if (err) {
        console.error('Lỗi khi đọc file:', err);
        return;
    }

    // Tách file thành các dòng và xử lý mỗi dòng như một từ
    const lines = data.split(/\r?\n/);

    for (const line of lines) {
        const queryWord = line.trim();  // Lấy từ từ mỗi dòng
        if (queryWord) { // Bỏ qua các dòng trống
            await processWord(queryWord);
        }
    }
});
