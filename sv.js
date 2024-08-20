import express from 'express';
import cors from 'cors';
import axios from 'axios';
import compression from 'compression';
import cluster from 'cluster';
import os from 'os';

const app = express();
const port = process.env.PORT || 3000;

app.use(cors()); // This will allow all origins, adjust as needed
app.use(compression()); // Middleware for compression

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

if (cluster.isMaster) {
  const numCPUs = os.cpus().length;

  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died`);
  });
} else {
  app.listen(port, () => {
    console.log(`Proxy server running at http://localhost:${port}`);
  });
}
