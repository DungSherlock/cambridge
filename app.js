import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import { JSDOM } from 'jsdom';

const filePath = path.join(process.cwd(), 'list.txt');
const outputFilePath = path.join(process.cwd(), 'output.txt');
const proxyUrl = 'http://localhost:3000/proxy?url=';
const baseUrl = 'https://dictionary.cambridge.org/vi/dictionary/english/';
const maxAttempts = 10;
const batchSize = 100;

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function processWord(queryWord) {
    const url = `${baseUrl}${encodeURIComponent(queryWord.trim())}`;

    for (let attempts = 1; attempts <= maxAttempts; attempts++) {
        try {
            const response = await fetch(proxyUrl + url);
            if (!response.ok) {
                console.error(`Attempt ${attempts} failed for "${queryWord}".`);
                await delay(2000);  // Chờ 2 giây trước khi thử lại
                continue;
            }

            const document = new JSDOM(await response.text()).window.document;
            const phoneticMatch = Array.from(document.querySelectorAll('#page-content span.us.dpron-i > span.pron.dpron')).map(e => e.outerHTML.trim());
            const phonetic = phoneticMatch.length > 0 ? phoneticMatch[0] : 'N/A';

            const usAudioMatch = Array.from(document.querySelectorAll('#page-content span.us.dpron-i source')).filter(e => e.getAttribute("src")?.includes('.mp3')).map(e => e.getAttribute("src").trim())[0];
            const usAudio = usAudioMatch ? 'https://dictionary.cambridge.org' + usAudioMatch : 'N/A';

            return `${queryWord}|${phonetic}|${usAudio}`;
        } catch (error) {
            console.error(`Error on attempt ${attempts} for "${queryWord}":`, error);
            await delay(2000);  // Chờ 2 giây trước khi thử lại
        }
    }

    return `${queryWord}|N/A|N/A`;
}

async function processInBatches(words, batchSize) {
    const results = [];
    for (let i = 0; i < words.length; i += batchSize) {
        results.push(...await Promise.all(words.slice(i, i + batchSize).map(processWord)));
    }
    return results;
}

fs.readFile(filePath, 'utf8', async (err, data) => {
    if (err) return console.error('Error reading file:', err);

    const words = data.split(/\r?\n/).filter(Boolean);
    const results = await processInBatches(words, batchSize);

    fs.writeFile(outputFilePath, results.join('\n'), (writeErr) => {
        if (writeErr) return console.error('Error writing file:', writeErr);
        console.log('Results written to output.txt');
    });
});
