# Instagram Feed Setup - Anleitung

## ✅ Was wurde implementiert

Die Instagram-Integration ist jetzt eingerichtet und **dein Access Token ist sicher geschützt**! 

### Sicherheitsmaßnahmen:
- ✅ Token wird in `.env` Datei gespeichert (nicht im Code)
- ✅ `.env` ist in `.gitignore` → Token kommt NICHT ins Git-Repository
- ✅ Token wird nur auf dem Server verwendet, nie im Browser
- ✅ Frontend ruft nur `/api/instagram` auf (ohne Token zu kennen)

## 🔧 Setup-Schritte

### 1. Füge deine Instagram-Daten in die `.env` Datei ein:

Öffne die Datei `.env` und trage deine Daten ein:

```env
IG_USER_ID=DEINE_INSTAGRAM_USER_ID
IG_ACCESS_TOKEN=DEIN_ACCESS_TOKEN
MEDIA_LIMIT=6
PORT=3000
```

**Wo finde ich meine Instagram User ID?**
- Gehe zu: https://www.instagram.com/_schrankgold
- Klicke mit der rechten Maustaste → "Seitenquelltext anzeigen"
- Suche nach `"owner":{"id":"` 
- Die Zahl danach ist deine User ID (z.B. `17841400000000000`)

### 2. Starte den Server:

```bash
npm run server:dev
```

Der Server läuft jetzt auf: http://localhost:3000

### 3. Öffne die Website:

Öffne im Browser: http://localhost:3000

Die Instagram-Posts sollten jetzt automatisch im Carousel geladen werden!

## 🎯 Wie funktioniert es?

1. **Browser** → ruft `/api/instagram` auf (ohne Token zu kennen)
2. **Server** → liest Token aus `.env` Datei
3. **Server** → ruft Instagram Graph API auf (mit Token)
4. **Server** → sendet nur die Bild-URLs zurück (KEIN Token!)
5. **Browser** → zeigt die Bilder im Carousel an

## 📝 Features

- ✅ Zeigt die neuesten 6 Posts von `_schrankgold`
- ✅ Nur Bilder (keine Kommentare)
- ✅ Klick auf Bild → öffnet Instagram Post
- ✅ Automatisches Fallback zu Platzhalter-Bildern bei Fehler
- ✅ Token ist 100% sicher

## 🔄 Instagram Token erneuern

Instagram Access Tokens laufen nach 60 Tagen ab. Um einen neuen Token zu generieren:

1. Gehe zu: https://developers.facebook.com/tools/explorer/
2. Wähle deine App und generiere einen neuen Token
3. Ersetze den alten Token in der `.env` Datei
4. Starte den Server neu: `npm run server:dev`

## 🚀 Für Production (Live-Website)

Wenn du die Website live schaltest:

1. Stelle sicher, dass `.env` auf dem Server existiert (mit den richtigen Werten)
2. Die `.env` Datei darf NIEMALS ins Git-Repository!
3. Nutze Umgebungsvariablen deines Hosting-Providers (z.B. Vercel, Netlify, etc.)

## ❓ Troubleshooting

**Posts werden nicht geladen?**
- Prüfe, ob der Server läuft (`npm run server:dev`)
- Prüfe, ob `.env` die richtigen Daten enthält
- Öffne Browser-Konsole (F12) für Fehlermeldungen
- Teste manuell: http://localhost:3000/api/instagram

**"Instagram not configured" Fehler?**
- `IG_USER_ID` und `IG_ACCESS_TOKEN` in `.env` fehlen
- Stelle sicher, dass `.env` im Root-Verzeichnis ist

**Token abgelaufen?**
- Generiere einen neuen Access Token (siehe oben)
- Trage ihn in `.env` ein
- Starte Server neu
