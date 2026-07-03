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
      let fileConfig = {};
      try {
        const raw = await fs.readFile(path.join(root, 'config.json'), 'utf8');
        const trimmed = raw.trim();
        if (trimmed.startsWith('{')) {
          fileConfig = JSON.parse(trimmed);
        } else {
          raw.split(/\r?\n/).forEach(line => {
            const match = line.match(/^\s*export\s+(\w+)=(?:"([^"]*)"|'([^']*)'|(.*))$/);
            if (match) {
              fileConfig[match[1]] = match[2] ?? match[3] ?? match[4] ?? '';
            }
          });
        }
      } catch (e) {
        fileConfig = {};
      }

      const config = {
        SUPABASE_URL: process.env.SUPABASE_URL || fileConfig.SUPABASE_URL || '',
        SUPABASE_ANON: process.env.SUPABASE_ANON || fileConfig.SUPABASE_ANON || '',
        ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || fileConfig.ADMIN_PASSWORD || ''
      };
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(config));
      return;
    }

    if (url.startsWith('/content-list')) {
      const params = new URL(req.url, `http://localhost`).searchParams;
      const folder = params.get('folder') || '';
      if (!/^[a-zA-Z0-9_-]+$/.test(folder)) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid folder name' }));
        return;
      }
      const listDir = path.join(root, 'content', folder);
      try {
        const entries = await fs.readdir(listDir, { withFileTypes: true });
        const files = entries
          .filter(e => e.isFile() && e.name.endsWith('.md'))
          .map(e => e.name)
          .sort();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(files));
      } catch (err) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Folder not found' }));
      }
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
