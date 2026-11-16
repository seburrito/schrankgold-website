// Impressum and Datenschutz: menu and footer year, nothing else.
import { qs, safe } from './lib/dom.js';
import { initMenu } from './features/menu.js';

const year = qs('[data-year]');
if (year) year.textContent = new Date().getFullYear();
safe(initMenu);
