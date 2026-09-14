# Schulmanager

Ein selbst gehosteter, freier (FOSS) Schulmanager: Stundenplan, Fächer mit frei
gestaltbaren Notizbereichen (Regelheft, Vokabelheft, ...), Hausaufgaben,
Dashboard und Kalender mit automatischem Ferien-/Feiertage-Import.

## Tech-Stack

- **Backend**: Node.js/TypeScript, Express, Prisma ORM, SQLite
- **Frontend**: React + Vite, TailwindCSS, TipTap (Rich-Text), React Query
- **Deployment**: Docker (ein Container, ein Port, ein Volume)

## Betrieb mit Docker (empfohlen)

1. `.env` aus der Vorlage erstellen und Secrets anpassen:

   ```sh
   cp .env.example .env
   # JWT_ACCESS_SECRET und JWT_REFRESH_SECRET z.B. mit `openssl rand -hex 32` setzen
   ```

2. Bauen und starten:

   ```sh
   docker compose up --build -d
   ```

3. Im Browser öffnen: <http://localhost:6666>

Die Daten liegen persistent im Docker-Volume `schulmanager-data`
(SQLite-Datei `/data/schulmanager.db` im Container).

### Backup

Da die gesamte Anwendung eine einzelne SQLite-Datei nutzt, genügt es, diese
Datei aus dem Volume zu sichern:

```sh
docker compose stop schulmanager
docker run --rm -v schulmanager_schulmanager-data:/data -v "$PWD":/backup alpine \
  cp /data/schulmanager.db /backup/schulmanager-backup.db
docker compose start schulmanager
```

## Lokale Entwicklung (ohne Docker)

Voraussetzungen: Node.js 20+.

```sh
npm install
npm run prisma:migrate      # legt backend/dev.db an und wendet Migrationen an
npm run dev:backend         # Backend auf Port 6666
npm run dev:frontend        # Frontend (Vite) mit Proxy auf /api -> Backend
```

Das Backend liest seine Konfiguration aus `backend/.env` (siehe
`.env.example` für alle Variablen).

## Projektstruktur

```
backend/    Node.js/TypeScript-API (Prisma + SQLite)
frontend/   React-Frontend (Vite)
docker/     Dockerfile + Entrypoint
```

Die REST-API unter `/api/*` ist bewusst unabhängig vom Frontend gehalten,
damit später auch eine Mobile-/Desktop-App dieselbe API nutzen kann.

## Lizenz

[AGPL-3.0](LICENSE)
