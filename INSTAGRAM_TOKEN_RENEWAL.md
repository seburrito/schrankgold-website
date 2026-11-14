# Instagram-Anbindung

Die Website zeigt die neuesten Instagram-Beiträge und die aktuellen Stories von
**@_schrankgold**.

## So funktioniert es

1. Beim Bauen der Website (GitHub Actions → IONOS Deploy Now) holt `scripts/instagram-fetch.js`
   Beiträge und Stories über die Instagram-API.
2. Die Bilder werden dabei **auf unseren eigenen Server kopiert und verkleinert** (WebP). Besucher
   laden nichts direkt von Instagram/Meta – gut für den Datenschutz, schnell, und die Links laufen nicht ab.
3. Der Workflow **„Instagram aktualisieren“** baut die Seite alle 2 Stunden (06–22 Uhr) neu.
   Er startet automatisch, sobald er im Branch `main` ist. Manuell: GitHub → Actions →
   „Instagram aktualisieren“ → „Run workflow“.

Stories funktionieren nur mit einem **Instagram-Profi-Konto** (Business oder Creator). Gibt es gerade
keine Story, zeigt die Website an dieser Stelle die neuesten Beiträge.

## Automatische Token-Erneuerung

Ein Instagram-Token ist 60 Tage gültig und muss davor verlängert werden. Das passiert automatisch
(`scripts/instagram-token.js`):

- **Bei jedem Build** wird der Token verlängert (neue 60 Tage). Da die Seite alle 2 Stunden gebaut
  wird, läuft er praktisch nie ab.
- **Einmal täglich** prüft der Workflow „Instagram aktualisieren“ den Token streng. Ist er ungültig
  oder lässt er sich nicht verlängern, **schlägt der Lauf fehl** und GitHub schickt eine E-Mail.
- Gibt Instagram beim Verlängern einen **neuen** Token-Wert aus, wird er automatisch im Secret
  `IG_ACCESS_TOKEN` gespeichert (dafür das Secret `GH_SECRETS_TOKEN` einrichten, siehe unten).
  Gibt Instagram denselben Wert zurück, ist nichts zu tun.

Nur wenn die Website **länger als 60 Tage nicht gebaut wurde** (oder der Token widerrufen wird), muss
ein neuer Token erzeugt werden.

## Einmalig: Token erzeugen

Nötig am Anfang oder wenn die tägliche Prüfung fehlschlägt.

1. Ein **privates Browserfenster** öffnen (dort ist man nirgends angemeldet) und auf
   [developers.facebook.com](https://developers.facebook.com) anmelden.
2. **Meine Apps** → SchrankGold-App → Anwendungsfall **Instagram** →
   **API-Einrichtung mit Instagram-Login** → **Zugriffstoken generieren**.
3. Im Instagram-Fenster mit den Zugangsdaten von **_schrankgold** anmelden (nicht mit dem eigenen
   Profil) und den Zugriff erlauben. Token kopieren.

## Token hinterlegen

GitHub → Repository → **Settings** → **Secrets and variables** → **Actions** →
`IG_ACCESS_TOKEN` bearbeiten → neuen Token einfügen → speichern.

Für lokale Tests zusätzlich in der Datei `.env` (siehe `.env.example`) und `npm run instagram` ausführen.

## Empfohlen: Secret `GH_SECRETS_TOKEN`

Damit ein verlängerter Token automatisch gespeichert werden kann:

1. GitHub → Profilbild → **Settings** → **Developer settings** → **Personal access tokens** →
   **Fine-grained tokens** → **Generate new token**.
2. Repository: nur `schrankgold-website`. Berechtigung: **Secrets: Read and write**.
3. Den erzeugten Token im Repository als Secret **`GH_SECRETS_TOKEN`** speichern.

Ohne dieses Secret läuft alles weiter; nur wenn Instagram tatsächlich einen neuen Wert ausgibt,
gibt es eine Warnung im Build-Log und die Prüfung schlägt fehl.

## Fehlerbehebung

- **Build-Log:** GitHub → Actions → letzter Lauf „Deploy Now: Build …“ → Schritte
  „Instagram-Token verlängern“ und „Instagram-Beiträge und Stories laden“. Dort steht z. B.
  `12 posts saved` oder die Fehlermeldung von Instagram.
- **Token testen:**
  ```bash
  curl -s "https://graph.instagram.com/me?fields=id,username&access_token=DEIN_TOKEN"
  ```
  ✅ `{"id":"...","username":"_schrankgold"}` – ❌ `{"error":{...}}` → neuen Token erzeugen.
