# Schulmanager

Ein selbst gehosteter, freier (FOSS) Schulmanager: Stundenplan, Hausaufgaben,
Klausuren, Karteikarten, Dashboard und Kalender mit automatischem
Ferien-/Feiertage-Import. Notizen schreibst du in Goodnotes - Schulmanager
empfängt deren Auto-Backup per WebDAV und verknüpft Hefte und einzelne Seiten
mit Hausaufgaben, Klausuren und Karteikarten.

## Funktionsumfang

- **Stundenplan**: frei konfigurierbares Zeitraster (Stunden- und Pausenzeiten),
  Fach-Zuordnung pro Wochentag/Stunde
- **Hefte aus Goodnotes**: Goodnotes sichert jedes Heft als PDF per WebDAV
  hierher. Ein Heft landet automatisch beim Fach, wenn ein Ordner darüber
  oder das Heft selbst so heißt (führende Nummern wie "1 Französisch" werden
  ignoriert); sonst unter "Ohne Fach", wo du einem Ordner ein Fach zuweist.
  Umbenennen und Verschieben in Goodnotes wird mitverfolgt, ältere
  PDF-Versionen bleiben einstellbar erhalten.
- **Verknüpfungen**: Hausaufgaben, Termine/Klausuren (als Lernstoff),
  Karteikarten und Dashboard-Notizen verweisen auf ganze Hefte oder
  Seitenbereiche. Fügst du in Goodnotes Seiten ein, wandert der Link mit;
  ist das nicht eindeutig, wird er als "unsicher" markiert.
- **Fächer**: eigene Farbe, Hefte des Fachs und Karteikarten-Stapel mit Lernmodus
- **Dashboard**: Hausaufgaben mit Abgabedatum, zuletzt in Goodnotes
  geschriebene Hefte, freie Notizen (z.B. Schließfachnummer)
- **Kalender**: manuelle Termine/Klausuren sowie ein Import von Schulferien
  (ferien-api.de) und gesetzlichen Feiertagen (Nager.Date) nach Bundesland,
  wiederholbar ohne Duplikate
- **Mehrbenutzerfähig**: eigene Konten mit vollständig isolierten Daten

## Tech-Stack

- **Backend**: Node.js/TypeScript, Express, Prisma ORM, SQLite
- **Frontend**: React + Vite, TailwindCSS, TipTap (Rich-Text), React Query, pdf.js
- **Deployment**: Docker (ein Container, ein Volume; Port 6969 für die App,
  6970 für WebDAV)

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

3. Im Browser öffnen: <http://localhost:6969> (bzw. der in `.env` unter
   `PORT` gesetzte Port)

Die Daten liegen persistent im Docker-Volume `schulmanager-data`
(SQLite-Datei `/data/schulmanager.db` im Container).

### Push-Benachrichtigungen (Erinnerungen) einrichten

Optional: Erinnert per Push-Benachrichtigung an Klausuren (in 3 Tagen/morgen)
und an morgen fällige Hausaufgaben - auch wenn die App gerade nicht offen ist.
Ohne Einrichtung bleibt die Funktion einfach deaktiviert, der Rest der App
läuft unverändert weiter.

Voraussetzungen:
- Die Seite muss über **HTTPS** erreichbar sein (Browser verlangen das für
  Service Worker/Push) - z.B. über einen Reverse Proxy mit TLS-Zertifikat.
- Ein VAPID-Schlüsselpaar in der `.env`:

  ```sh
  npx web-push generate-vapid-keys
  ```

  Beide Werte plus eine Kontaktadresse in die `.env` eintragen:

  ```
  VAPID_PUBLIC_KEY=...
  VAPID_PRIVATE_KEY=...
  VAPID_SUBJECT=mailto:deine-adresse@example.com
  ```

- Container neu starten (`docker compose up -d`), dann in den Einstellungen
  unter "Erinnerungen" auf "Benachrichtigungen aktivieren" tippen.

### Goodnotes-Backup einrichten

Schulmanager ist selbst der WebDAV-Server für das Auto-Backup von Goodnotes
(iPad/iPhone). Er lauscht auf `DAV_PORT` (Standard 6970) an der Wurzel `/`.

1. Den Port über deinen Reverse Proxy mit **HTTPS** unter einer eigenen
   Adresse freigeben, z.B. `https://schooldav.example.de` → `http://<server>:6970`.
   Am besten nur aus dem Heimnetz erreichbar machen. Die Adresse in der `.env`
   als `DAV_PUBLIC_URL` eintragen, dann zeigt Schulmanager sie in den
   Einstellungen an.
   Der Proxy darf Uploads nicht begrenzen (Hefte werden schnell 200 MB groß,
   bei nginx z.B. `client_max_body_size 0;`).
2. In Schulmanager unter Einstellungen → Goodnotes ein **App-Passwort**
   erstellen. Es ist nicht dein Login-Passwort und lässt sich jederzeit
   widerrufen.
3. In Goodnotes: Einstellungen → Backup → Auto-Backup → WebDAV. Dort die
   Adresse, deine E-Mail als Benutzername und das App-Passwort eintragen.
   Als Format **PDF** wählen; das Goodnotes-Format wird nicht gespeichert.

Goodnotes überträgt Löschungen nicht. Ein in Goodnotes gelöschtes Heft
archivierst du deshalb in Schulmanager selbst. Lädt Goodnotes es später
wieder hoch, ist es automatisch zurück.

### Backup

Die Datenbank ist eine einzelne SQLite-Datei; die Goodnotes-PDFs liegen
daneben unter `/data/uploads` (Goodnotes selbst behält sie ebenfalls). Für
die eigenen Daten genügt es, die Datenbank aus dem Volume zu sichern:

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
npm run dev:backend         # Backend auf Port 6969, WebDAV auf 6970
npm run dev:frontend        # Frontend (Vite) mit Proxy auf /api -> Backend
```

Das Backend liest seine Konfiguration aus `backend/.env` (siehe
`.env.example` für alle Variablen).

### Tests

```sh
npm run test:backend
```

Die Backend-Tests (vitest + supertest) laufen gegen eine eigene SQLite-Datei
(`backend/prisma/test.db`, wird automatisch migriert und ist nicht Teil des
Repos) und decken Auth-Flows, die Isolation zwischen Benutzerkonten und den
Ferien-/Feiertage-Import ab.

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
