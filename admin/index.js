const fs = require('fs');
const path = require('path');

module.exports = {
  onBuild: async ({ utils }) => {
    const contentRoot = path.join(process.cwd(), 'content');
    const collections = ['news', 'courses', 'gallery', 'documents', 'testimonials'];

    if (!fs.existsSync(contentRoot)) {
      console.log('[content-indexes] No content/ directory found — skipping.');
      return;
    }

    for (const col of collections) {
      const dir = path.join(contentRoot, col);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(path.join(dir, 'index.json'), '[]');
        console.log(`[content-indexes] Created empty index for ${col}`);
        continue;
      }

      const files = fs.readdirSync(dir)
        .filter(f => f.endsWith('.md'))
        .sort()
        .reverse(); // newest first for date-prefixed files

      fs.writeFileSync(
        path.join(dir, 'index.json'),
        JSON.stringify(files, null, 2)
      );
      console.log(`[content-indexes] ${col}: indexed ${files.length} file(s)`);
    }
  }
};
