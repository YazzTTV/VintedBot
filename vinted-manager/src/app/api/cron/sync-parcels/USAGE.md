# Cron Sync Parcels — Usage

Endpoint sécurisé pour sync tous les colis non livrés et envoyer un email d'alerte.

## Auth

```
Authorization: Bearer ${CRON_SECRET}
```

`CRON_SECRET` est dans `.env` (généré automatiquement).

## Appel manuel (curl)

```bash
curl -H "Authorization: Bearer $(grep CRON_SECRET .env | cut -d= -f2)" \
  http://localhost:3001/api/cron/sync-parcels
```

Réponse :

```json
{
  "success": true,
  "data": {
    "synced": 8,
    "failed": 1,
    "total": 9,
    "alertsCount": 2,
    "emailSent": true
  }
}
```

## Configuration Vercel Cron

Ajoute `vercel.json` à la racine :

```json
{
  "crons": [
    {
      "path": "/api/cron/sync-parcels",
      "schedule": "0 8,20 * * *"
    }
  ]
}
```

(Sync à 8h et 20h tous les jours)

Vercel injecte automatiquement le header `Authorization` depuis `CRON_SECRET` configuré dans Vercel env vars.

## Configuration crontab macOS

```bash
crontab -e
```

Ajoute :

```
0 8,20 * * * curl -s -H "Authorization: Bearer XXX" http://localhost:3001/api/cron/sync-parcels > /tmp/vinted-cron.log 2>&1
```

Remplace `XXX` par la valeur de `CRON_SECRET`.

## Configuration launchd (macOS, recommandé)

Crée `~/Library/LaunchAgents/com.vinted.cron-sync.plist` :

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.vinted.cron-sync</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/bin/curl</string>
        <string>-s</string>
        <string>-H</string>
        <string>Authorization: Bearer XXX</string>
        <string>http://localhost:3001/api/cron/sync-parcels</string>
    </array>
    <key>StartCalendarInterval</key>
    <array>
        <dict><key>Hour</key><integer>8</integer><key>Minute</key><integer>0</integer></dict>
        <dict><key>Hour</key><integer>20</integer><key>Minute</key><integer>0</integer></dict>
    </array>
</dict>
</plist>
```

Puis :

```bash
launchctl load ~/Library/LaunchAgents/com.vinted.cron-sync.plist
```

## Email d'alerte

L'email est envoyé via Resend si :
- `alerts.length > 0`
- `RESEND_API_KEY` défini dans `.env`
- `NOTIFICATION_EMAIL` défini dans `.env`

Sinon le sync continue et `emailSent: false`.
