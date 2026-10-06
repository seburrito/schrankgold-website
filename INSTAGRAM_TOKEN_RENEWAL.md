# Instagram-Anbindung

Die Website zeigt die neuesten Instagram-Beiträge und die aktuellen Stories von
**@_schrankgold**. So funktioniert es:

1. Beim Bauen der Website (GitHub Actions → IONOS Deploy Now) holt
   `prebuild-instagram.js` die Beiträge und Stories über die Instagram-API.
2. Bilder und Story-Videos werden dabei **auf unseren eigenen Server kopiert**
   (`ig-media/`). Besucherinnen laden nichts direkt von Instagram/Meta – gut für
   den Datenschutz, und die Links laufen nicht ab.
3. Der Workflow **„Instagram aktualisieren“** (`.github/workflows/instagram-refresh.yaml`)
   baut die Seite alle 2 Stunden (06–22 Uhr) neu und verlängert einmal täglich den
   Zugangs-Token. Dadurch läuft der Token nicht mehr ab.
   Er startet automatisch, sobald er im Branch `main` ist. Manuell: GitHub →
   Actions → „Instagram aktualisieren“ → „Run workflow“.

Stories funktionieren nur mit einem **Instagram-Profi-Konto** (Business oder Creator).
Gibt es gerade keine Story, zeigt die Website an dieser Stelle die neuesten Beiträge.

## Einmalig: neuen Token erzeugen

Nötig, wenn der Token abgelaufen ist (Fehler „Session has expired“ im Build-Log)
oder ganz am Anfang.

1. [developers.facebook.com](https://developers.facebook.com) → **Meine Apps** →
   die SchrankGold-App öffnen.
2. Anwendungsfall **Instagram** → **API-Einrichtung mit Instagram-Login**.
3. Unter **„Zugriffstoken generieren“** das Konto **_schrankgold** hinzufügen bzw.
   auswählen und **„Token generieren“** klicken, mit Instagram anmelden, Zugriff erlauben.
4. Token kopieren.

Der Token muss für die Berechtigung `instagram_business_basic` ausgestellt sein
(Standard bei diesem Ablauf).

## Token hinterlegen

GitHub → Repository → **Settings** → **Secrets and variables** → **Actions** →
`IG_ACCESS_TOKEN` bearbeiten → neuen Token einfügen → speichern.

Für lokale Tests zusätzlich in der Datei `.env`:

```
IG_ACCESS_TOKEN=NEUER_TOKEN_HIER
```

## Empfohlen: automatische Speicherung verlängerter Tokens

Falls Instagram beim täglichen Verlängern einen *neuen* Token ausgibt, muss der
Workflow ihn ins Secret schreiben dürfen. Dafür einmalig:

1. GitHub → Profilbild → **Settings** → **Developer settings** →
   **Personal access tokens** → **Fine-grained tokens** → **Generate new token**.
2. Repository: nur `schrankgold-website`. Berechtigung: **Secrets: Read and write**.
3. Den erzeugten Token im Repository als Secret **`GH_SECRETS_TOKEN`** speichern.

Ohne dieses Secret funktioniert alles weiter; der Workflow meldet dann nur eine
Warnung, falls ein neuer Token gespeichert werden müsste.

## Fehlerbehebung

- **Build-Log prüfen:** GitHub → Actions → letzter Lauf „Deploy Now: Build …“ →
  Schritt „Prebuild Instagram feed“. Dort steht z. B.
  `Saved 12 posts …` oder die Fehlermeldung von Instagram.
- **Token testen:**
  ```bash
  curl -s "https://graph.instagram.com/me?fields=id,username&access_token=DEIN_TOKEN"
  ```
  ✅ `{"id":"...","username":"_schrankgold"}` – ❌ `{"error":{...}}` → neuen Token erzeugen.
