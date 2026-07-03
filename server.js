import { createServer } from 'http';
import { promises as fs } from 'fs';
import path from 'path';

const port = process.env.PORT || 3000;
const root = process.cwd();

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.pdf': 'application/pdf',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.epub': 'application/epub+zip',
  '.txt': 'text/plain; charset=utf-8'
};

function contentType(filePath) {
  return mime[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
}

const server = createServer(async (req, res) => {
  try {
    const url = decodeURIComponent(new URL(req.url, `http://localhost`).pathname);

    if (url === '/config.json') {
      const config = {
        SUPABASE_URL: process.env.SUPABASE_URL || '',
        SUPABASE_ANON: process.env.SUPABASE_ANON || '',
        ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || ''
      };
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(config));
      return;
    }

    let filePath = path.join(root, url);
    let stat;
    try { stat = await fs.stat(filePath); } catch (e) { stat = null; }
    if (!stat) {
      // fallback to index.html for SPA routes
      filePath = path.join(root, 'index.html');
    } else if (stat.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }

    const data = await fs.readFile(filePath);
    res.writeHead(200, { 'Content-Type': contentType(filePath) });
    res.end(data);
  } catch (err) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not Found');
  }
});

server.listen(port, () => console.log(`Static server running on port ${port}`));
