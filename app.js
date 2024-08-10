import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';

// Đường dẫn tới file list.txt và output.txt
const filePath = path.join(process.cwd(), 'list.txt');
const outputFilePath = path.join(process.cwd(), 'output.txt');

// Hàm xử lý mỗi từ từ list.txt
async function processWord(queryWord) {
    const proxyUrl = 'https://proxy-server-self-six.vercel.app/proxy?url='; // Thay thế bằng URL proxy của bạn nếu có
    const url = `https://dictionary.cambridge.org/vi/dictionary/english/${queryWord.trim()}`;

    try {
        const response = await fetch(proxyUrl + encodeURIComponent(url));
        const htmlContent = await response.text();

        // Sử dụng JSDOM để phân tích HTML trong môi trường Node.js
        const dom = new JSDOM(htmlContent);
        const document = dom.window.document;

        const phoneticMatch = Array.from(document.querySelectorAll('#page-content span.us.dpron-i > span.pron.dpron')).map(e => e.outerHTML.trim());
        const phonetic = phoneticMatch ? phoneticMatch[0] : 'N/A';

        const usAudioMatch = Array.from(document.querySelectorAll('#page-content span.us.dpron-i source')).filter(e => e.getAttribute("src")?.includes('.mp3')).map(e => e.getAttribute("src").trim())[0];
        const usAudio = usAudioMatch ? 'https://dictionary.cambridge.org' + usAudioMatch : 'N/A';
        
        
        // Ghi kết quả vào file
        return `${queryWord}|${phonetic}|${usAudio}`;
    } catch (error) {
        console.error(`Lỗi khi xử lý từ "${queryWord}":`, error);
        // Không thay đổi giá trị của phonetic và usAudio vì chúng đã được khởi tạo trước đó
    }
    // Trả về kết quả
    return `${queryWord}|${phonetic}|${usAudio}`;
}

// Đọc file list.txt và xử lý từng từ
fs.readFile(filePath, 'utf8', async (err, data) => {
    if (err) {
        console.error('Lỗi khi đọc file:', err);
        return;
    }

    // Tách file thành các dòng và xử lý mỗi dòng như một từ
    const lines = data.split(/\r?\n/);

    // Tạo mảng các Promise để xử lý đồng thời các từ
    const results = await Promise.all(
        lines
            .map(line => line.trim())
            .filter(queryWord => queryWord) // Bỏ qua các dòng trống
            .map(queryWord => processWord(queryWord))
    );

    // Ghi tất cả kết quả vào file output.txt
    fs.writeFile(outputFilePath, results.join('\n'), (writeErr) => {
        if (writeErr) {
            console.error('Lỗi khi ghi file:', writeErr);
        } else {
            console.log('Kết quả đã được ghi vào output.txt');
        }
    });
});
