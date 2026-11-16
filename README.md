# SchrankGold website

Website of SchrankGold, Am Rätschenbach 11, Erding – <https://schrank.gold>.
A fast static site (HTML, CSS, JavaScript) built with [Vite](https://vite.dev) and
deployed with IONOS Deploy Now. Instagram posts and stories are loaded when the site is built.

## Commands

| Command | What it does |
| --- | --- |
| `npm install` | install dependencies (Node 22 or newer) |
| `npm run instagram` | load posts and stories into `public/` (needs `IG_ACCESS_TOKEN` in `.env`, see `.env.example`) |
| `npm run dev` | start the site locally with live reload |
| `npm run build` | build the site into `dist/` (this folder is deployed) |
| `npm run preview` | look at the built site |

Without an Instagram token the site shows placeholders in the Instagram sections.

## Structure

```
index.html, impressum.html, privacy.html   the three pages
partials/                                  shared HTML: head, header (menu), footer, icons
src/main.js                                homepage: everything visible straight away
src/motion.js                              scroll animations (GSAP, Lenis) – loaded afterwards
src/features/                              menu, top bar, hero wardrobe, opening hours, map, Instagram …
src/lib/                                   small helpers (DOM, smooth scroll, deep links)
src/styles/                                CSS in partials, imported by home.css / legal.css
src/assets/                                fonts and illustrations (hashed on build)
public/                                    copied as-is: PDF, share image, robots, sitemap, .htaccess
scripts/                                   Instagram token renewal and Instagram download
.github/workflows/                         build, deploy, scheduled Instagram refresh
```

Shared HTML is included at build time (`<!-- @include partials/footer.html -->`,
`<!-- @icon phone -->`, `<!-- @inline src/assets/img/wardrobe.svg -->`, see `vite.config.js`).

## Performance

- The first file is small: menu, bars, hero, opening hours. Instagram content, the animation
  library and the map load afterwards or shortly before they are needed.
- Fonts and libraries come from our own server; no third-party requests (except the map tiles).
- Instagram images are downloaded at build time, shrunk to WebP and served from our server.
- With "reduce motion" the animation code is not loaded at all.
- Build files carry a hash in their name and are cached for a year (`public/.htaccess`).

## Instagram

See [INSTAGRAM_TOKEN_RENEWAL.md](INSTAGRAM_TOKEN_RENEWAL.md): how to create the access token,
and how it is renewed automatically.
