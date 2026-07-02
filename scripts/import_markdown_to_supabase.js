#!/usr/bin/env node
// Import Markdown files from content/ into Supabase tables (news, library)
// Usage: SUPABASE_URL=... SUPABASE_ANON=... node scripts/import_markdown_to_supabase.js

import fs from 'fs/promises';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON = process.env.SUPABASE_ANON;
if (!SUPABASE_URL || !SUPABASE_ANON) {
  console.error('Set SUPABASE_URL and SUPABASE_ANON environment variables.');
  process.exit(1);
}
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

function parseFrontMatter(text) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return { fm: {}, body: text };
  const yaml = match[1];
  const body = text.slice(match[0].length).trim();
  const fm = {};
  const lines = yaml.split(/\r?\n/);
  for (const line of lines) {
    const m = line.match(/^([^:]+):\s*(.*)$/);
    if (!m) continue;
    fm[m[1].trim()] = m[2].trim().replace(/^['"]|['"]$/g,'');
  }
  return { fm, body };
}

async function importNews() {
  const dir = path.resolve('content/news');
  try {
    const files = await fs.readdir(dir);
    for (const f of files.filter(x=>x.endsWith('.md'))) {
      const txt = await fs.readFile(path.join(dir,f),'utf8');
      const { fm, body } = parseFrontMatter(txt);
      const payload = {
        title: fm.title || f,
        date: fm.date || null,
        category: fm.category || 'Update',
        summary: fm.summary || null,
        body: body,
        image: fm.image || null,
        published: fm.published !== 'false'
      };
      const { error } = await supabase.from('news').insert([payload]);
      if (error) console.error('Insert error for', f, error.message);
      else console.log('Imported', f);
    }
  } catch (e) { console.error('Failed to import news', e); }
}

async function importLibrary() {
  const dir = path.resolve('content/library');
  try {
    const files = await fs.readdir(dir);
    for (const f of files.filter(x=>x.endsWith('.md')||x.endsWith('.pdf')||x.endsWith('.epub')||x.endsWith('.docx'))) {
      const full = path.join(dir,f);
      if (f.endsWith('.md')) {
        const txt = await fs.readFile(full,'utf8');
        const { fm, body } = parseFrontMatter(txt);
        const payload = { title: fm.title || f, author: fm.author || '', language: fm.language || '', level: fm.level || '', type: fm.type || 'Markdown', description: body, free: fm.free !== 'false' };
        const { error } = await supabase.from('library').insert([payload]);
        if (error) console.error('Insert library md error', f, error.message); else console.log('Imported lib md', f);
      } else {
        // binary file: upload to storage
        const data = await fs.readFile(full);
        const pathOnBucket = `library/${Date.now()}-${f}`;
        const { error: upErr } = await supabase.storage.from('library').upload(pathOnBucket, data, { upsert: false });
        if (upErr) { console.error('Upload error', f, upErr.message); continue; }
        const { data: urlData } = supabase.storage.from('library').getPublicUrl(pathOnBucket);
        const payload = { title: f, file_url: urlData.publicUrl, file_metadata: { name: f }, free: true };
        const { error } = await supabase.from('library').insert([payload]);
        if (error) console.error('Insert library file error', f, error.message); else console.log('Imported lib file', f);
      }
    }
  } catch (e) { console.error('Failed to import library', e); }
}

(async function(){
  await importNews();
  await importLibrary();
})();
