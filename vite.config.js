import { defineConfig } from 'vite';
import fs from 'node:fs';
import path from 'node:path';

const root = import.meta.dirname;

// Build-time HTML includes, so shared markup lives in one place:
//   <!-- @include partials/footer.html key="value" -->   file content, {{key}} replaced
//   <!-- @inline src/assets/img/wardrobe.svg -->         raw file (inline SVG)
//   <!-- @icon phone -->                                 partials/icons/phone.svg
function htmlIncludes() {
  const read = file => fs.readFileSync(path.resolve(root, file), 'utf8').trim();
  const expand = html => html.replace(
    /<!--\s*@(include|inline|icon)\s+(\S+)((?:\s+[\w-]+="[^"]*")*)\s*-->/g,
    (_, kind, target, attrs) => {
      if (kind === 'icon') return read(`partials/icons/${target}.svg`);
      if (kind === 'inline') return read(target).replace(/<!--[\s\S]*?-->/g, '');
      const vars = Object.fromEntries([...attrs.matchAll(/([\w-]+)="([^"]*)"/g)].map(m => [m[1], m[2]]));
      return expand(read(target).replace(/\{\{([\w-]+)\}\}/g, (__, key) => vars[key] ?? ''));
    }
  );
  return {
    name: 'html-includes',
    transformIndexHtml: { order: 'pre', handler: expand },
    handleHotUpdate({ file, server }) {
      if (file.includes('/partials/') || file.endsWith('.svg')) server.ws.send({ type: 'full-reload' });
    }
  };
}

export default defineConfig({
  base: './',
  plugins: [htmlIncludes()],
  build: {
    outDir: 'dist',
    // Hashed build files live in /static (cached for a year, see public/.htaccess);
    // /assets keeps the files with stable addresses (PDF, share image).
    assetsDir: 'static',
    chunkSizeWarningLimit: 800, // the map library is one big file that only loads near the map
    rollupOptions: {
      input: {
        index: path.resolve(root, 'index.html'),
        impressum: path.resolve(root, 'impressum.html'),
        privacy: path.resolve(root, 'privacy.html')
      }
    }
  }
});
