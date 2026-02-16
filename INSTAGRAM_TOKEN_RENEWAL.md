# Instagram Access Token Erneuern

## Token-Gültigkeit prüfen

1. Gehe zu: [developers.facebook.com/tools/debug/accesstoken](https://developers.facebook.com/tools/debug/accesstoken)
2. Token aus `.env` einfügen → "Debug" klicken
3. Unter "Expires" siehst du das Ablaufdatum

## Token erneuern (vor Ablauf)

Wenn der Token noch gültig ist, kannst du ihn einfach verlängern:

```bash
curl -X GET "https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=DEIN_AKTUELLER_TOKEN"
```

Das gibt einen neuen Token zurück mit 60 Tagen Gültigkeit.

## Neuen Token generieren (wenn abgelaufen)

1. Gehe zu [developers.facebook.com](https://developers.facebook.com)
2. Wähle die SchrankGold App
3. "Instagram Basic Display" → "Basic Display"
4. "User Token Generator" → "Generate Token"
5. Instagram Login → Zugriff erlauben
6. Neuen Token kopieren

## Token aktualisieren

Nach dem Erneuern musst du den Token an zwei Stellen aktualisieren:

### 1. Lokale `.env` Datei

```
IG_ACCESS_TOKEN=NEUER_TOKEN_HIER
```

### 2. GitHub Secret (für IONOS Deploy Now)

1. GitHub → Repository → Settings
2. Secrets and variables → Actions
3. `IG_ACCESS_TOKEN` bearbeiten
4. Neuen Token einfügen und speichern

## Automatische Erinnerung

Der Token ist **60 Tage** gültig. Setze dir eine Erinnerung für ca. 50 Tage nach der Erneuerung.

## Fehlerbehebung

Token testen:
```bash
curl -s "https://graph.instagram.com/me?fields=id,username&access_token=DEIN_TOKEN"
```

- ✅ Erfolg: `{"id":"...","username":"_schrankgold"}`
- ❌ Abgelaufen: `{"error":{"message":"Error validating access token..."}}`
