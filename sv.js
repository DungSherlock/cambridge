import express from 'express';
import cors from 'cors';
import axios from 'axios';
import compression from 'compression';
import NodeCache from 'node-cache';

const app = express();
const port = process.env.PORT || 3000;

app.use(cors()); // This will allow all origins, adjust as needed

// Tạo một đối tượng cache với NodeCache
const cache = new NodeCache({ stdTTL: 0, checkperiod: 120 }); // stdTTL là thời gian sống mặc định của cache (60 giây), bằng 0 là không giới hạn, checkperiod là khoảng thời gian kiểm tra cache hết hạn

// Middleware để xử lý cache
app.use(async (req, res, next) => {
  const key = `${req.method}:${req.url}`;
  const cachedData = cache.get(key);
  
  if (cachedData) {
    res.send(cachedData);
  } else {
    res.sendResponse = res.send;
    res.send = (body) => {
      cache.set(key, body); // Lưu dữ liệu vào cache
      res.sendResponse(body);
    };
    next();
  }
});

// Endpoint để xóa cache
app.post('/clear-cache', (req, res) => {
  cache.flushAll(); // Xóa tất cả dữ liệu trong cache
  res.send('Cache cleared');
});

// Sử dụng middleware nén
app.use(compression());

// Code chính
app.get('/proxy', async (req, res) => {
  const url = req.query.url;
  if (!url) {
    return res.status(400).send('Missing url parameter');
  }
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3'
      }
    });
    res.set('Access-Control-Allow-Origin', '*');
    res.send(response.data);
  } catch (error) {
    res.status(500).send('Error fetching result');
  }
});

app.listen(port, () => {
  console.log(`Proxy server running at http://localhost:${port}`);
});
