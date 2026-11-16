// Extends the Instagram access token by another 60 days.
//
// Instagram long-lived tokens expire after 60 days unless they are refreshed.
// This runs on every build and in the daily "Instagram aktualisieren" workflow:
//   1. asks Instagram for a refreshed token
//   2. hands the fresh token to the following build steps (GITHUB_ENV)
//   3. if Instagram issued a *different* token, saves it back to the
//      IG_ACCESS_TOKEN repository secret (needs the GH_SECRETS_TOKEN secret)
//
// Exit code: 0 unless --strict is passed and the token could not be confirmed
// as valid. The token value is never printed.
//
// Env: IG_ACCESS_TOKEN (required), GH_SECRETS_TOKEN (optional),
//      IG_API_BASE (default https://graph.instagram.com, overridable for tests)

import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const strict = process.argv.includes('--strict');
const API = (process.env.IG_API_BASE || 'https://graph.instagram.com').replace(/\/$/, '');
const token = (process.env.IG_ACCESS_TOKEN || '').trim();
const inActions = process.env.GITHUB_ACTIONS === 'true';

// GitHub Actions annotations (shown on the run page and in e-mails)
const annotate = (level, msg) => console.log(inActions ? `::${level}::${msg}` : `[${level}] ${msg}`);
const fail = msg => {
  annotate(strict ? 'error' : 'warning', msg);
  process.exit(strict ? 1 : 0);
};

async function call(path) {
  const res = await fetch(`${API}/${path}${path.includes('?') ? '&' : '?'}access_token=${encodeURIComponent(token)}`);
  const body = await res.json().catch(() => ({}));
  return { ok: res.ok, body, error: body?.error?.message || `HTTP ${res.status}` };
}

function saveSecret(value) {
  const ghToken = process.env.GH_SECRETS_TOKEN;
  if (!ghToken || !process.env.GITHUB_REPOSITORY) return false;
  try {
    execFileSync('gh', ['secret', 'set', 'IG_ACCESS_TOKEN', '--repo', process.env.GITHUB_REPOSITORY], {
      input: value,
      env: { ...process.env, GH_TOKEN: ghToken },
      stdio: ['pipe', 'ignore', 'pipe']
    });
    return true;
  } catch (e) {
    annotate('warning', `Neuer Token konnte nicht im Secret gespeichert werden: ${String(e.stderr || e.message).trim().slice(0, 200)}`);
    return false;
  }
}

async function main() {
  if (!token) fail('Secret IG_ACCESS_TOKEN fehlt – Instagram-Inhalte können nicht geladen werden.');

  const refreshed = await call('refresh_access_token?grant_type=ig_refresh_token');
  if (!refreshed.ok || !refreshed.body.access_token) {
    // A token younger than 24 hours cannot be refreshed yet – that is fine as long as it works.
    const me = await call('me?fields=id');
    if (me.ok) {
      annotate('notice', `Instagram-Token ist gültig, wurde aber nicht verlängert (${refreshed.error}).`);
      return;
    }
    fail(`Instagram-Token ist ungültig oder abgelaufen: ${me.error} – bitte neuen Token erzeugen (siehe INSTAGRAM_TOKEN_RENEWAL.md).`);
  }

  const fresh = refreshed.body.access_token;
  const days = Math.floor((refreshed.body.expires_in || 0) / 86400);
  const until = new Date(Date.now() + (refreshed.body.expires_in || 0) * 1000).toLocaleDateString('de-DE');
  const changed = fresh !== token;
  if (inActions && changed) console.log(`::add-mask::${fresh}`);
  console.log(`Instagram-Token verlängert: gültig für ${days} Tage (bis ${until}). Token-Wert ${changed ? 'NEU' : 'unverändert'}.`);

  // Later steps of this job use the fresh token
  if (process.env.GITHUB_ENV) fs.appendFileSync(process.env.GITHUB_ENV, `IG_ACCESS_TOKEN=${fresh}\n`);

  if (changed) {
    if (saveSecret(fresh)) console.log('Neuer Token im Secret IG_ACCESS_TOKEN gespeichert.');
    else fail('Instagram hat einen neuen Token ausgegeben, er konnte aber nicht gespeichert werden. Bitte das Secret GH_SECRETS_TOKEN einrichten (siehe INSTAGRAM_TOKEN_RENEWAL.md), sonst läuft der gespeicherte Token in spätestens 60 Tagen ab.');
  }
}

main().catch(e => fail(`Token-Verlängerung fehlgeschlagen: ${e.message}`));
