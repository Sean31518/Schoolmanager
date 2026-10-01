# Schulmanager

Selbst gehosteter Schulorganizer für Stundenplan, Hausaufgaben, Klausuren und
Karteikarten, der deine Goodnotes-Hefte direkt einbindet.

[![Lizenz: AGPL-3.0](https://img.shields.io/badge/Lizenz-AGPL--3.0-blue.svg)](LICENSE)

## Worum es geht

Mitschriften entstehen in Goodnotes auf dem iPad, alles andere (Stundenplan,
Hausaufgaben, Klausurtermine, Vokabeln) braucht einen eigenen Ort. Schulmanager
ist dieser Ort und gleichzeitig das Backup-Ziel von Goodnotes: Jedes Heft kommt
automatisch als PDF an, und du verknüpfst einzelne Seiten mit der Hausaufgabe
oder der Klausur, zu der sie gehören. Alles läuft auf deinem eigenen Server, in
einem Docker-Container, für die ganze Familie mit getrennten Konten.

## Funktionen

- **Stundenplan** mit eigenem Zeitraster, Doppelstunden und optionalem
  Vertretungsplan aus IServ (Entfall, Raum- und Lehrerwechsel).
- **Hefte aus Goodnotes**, automatisch nach Fach sortiert. Umbenennen und
  Verschieben in Goodnotes wird mitverfolgt, ältere PDF-Versionen bleiben
  erhalten.
- **Seiten verknüpfen**: Hausaufgaben, Termine, Klausuren (als Lernstoff),
  Karteikarten und Notizen zeigen auf ganze Hefte oder Seitenbereiche. Fügst du
  in Goodnotes Seiten ein, wandert der Link mit.
- **Karteikarten** in Stapeln pro Fach, mit Lernmodus.
- **Kalender** mit Terminen, Klausuren und automatischem Import von Schulferien
  und Feiertagen nach Bundesland.
- **Dashboard** mit heutigem Stundenplan, offenen Hausaufgaben, nächster
  Klausur und zuletzt geschriebenen Heften.
- **Erinnerungen** per Push-Benachrichtigung an Klausuren und fällige
  Hausaufgaben.
- Globale Suche, installierbar als App (PWA), Hell/Dunkel, Datenexport als JSON.
- **Mehrere Konten** mit vollständig getrennten Daten; das erste Konto wird
  Admin und kann die Registrierung schließen.

## Schnellstart

Voraussetzung: Docker mit Docker Compose.

```sh
git clone https://github.com/Sean31518/Schoolmanager.git
cd Schoolmanager
cp .env.example .env
```

In der `.env` mindestens die beiden JWT-Secrets durch eigene Zufallswerte
ersetzen:

```sh
openssl rand -hex 32   # einmal für JWT_ACCESS_SECRET, einmal für JWT_REFRESH_SECRET
```

Dann starten:

```sh
docker compose up --build -d
```

Die App läuft auf <http://localhost:6969>. Das erste Konto, das du dort
registrierst, ist automatisch Admin.

Alle Daten (SQLite-Datenbank und Goodnotes-PDFs) liegen im Docker-Volume
`schulmanager-data` unter `/data`.

## Konfiguration

Alle Einstellungen kommen aus der `.env`. Die Vorlage `.env.example` erklärt
jede Variable ausführlich.

| Variable | Standard | Wofür |
|---|---|---|
| `PORT` | `6969` | Port der Web-App |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` | – | **Pflicht.** Signieren die Login-Tokens |
| `COOKIE_SECURE` | `false` | Auf `true`, sobald die App nur noch per HTTPS erreichbar ist |
| `ALLOW_REGISTRATION` | `true` | `false` sperrt Registrierungen hart, unabhängig vom Schalter im Admin-Bereich |
| `DAV_PORT` | `6970` | WebDAV-Server für Goodnotes; `0` schaltet ihn ab |
| `DAV_PUBLIC_URL` | – | Adresse, die in Goodnotes eingetragen wird (wird in den Einstellungen angezeigt) |
| `DAV_MAX_UPLOAD_MB` | `1024` | Größte erlaubte Datei pro Upload |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | – | Push-Erinnerungen (optional) |
| `CREDENTIALS_ENCRYPTION_KEY` | – | Verschlüsselt hinterlegte IServ-Zugangsdaten (optional) |
| `DATABASE_URL`, `UPLOADS_DIR` | `/data/...` | Speicherorte im Container; nur ändern, wenn du auch das Volume anpasst |

Optionale Funktionen, deren Variablen fehlen, sind einfach abgeschaltet. Der
Rest der App läuft normal weiter.

## Optionale Funktionen einrichten

### Reverse Proxy und HTTPS

Für den Zugriff von außen, für Push-Benachrichtigungen und für Goodnotes braucht
es HTTPS. Stell die App hinter einen Reverse Proxy mit TLS-Zertifikat (z. B.
Nginx Proxy Manager, Caddy, Traefik) und setz danach `COOKIE_SECURE=true`.

### Goodnotes-Backup

Schulmanager ist selbst der WebDAV-Server für das Auto-Backup von Goodnotes.

1. Leite eine eigene HTTPS-Adresse über deinen Reverse Proxy auf den WebDAV-Port
   weiter, z. B. `https://schooldav.example.de` → `http://<server>:6970`. Der
   WebDAV-Server erwartet, an der Wurzel `/` zu liegen. Am besten nur aus dem
   Heimnetz erreichbar machen.
2. Der Proxy darf Uploads nicht begrenzen, denn Hefte mit Bildern werden schnell
   200 MB groß. Bei Nginx: `client_max_body_size 0;`.
3. Trag die Adresse als `DAV_PUBLIC_URL` in die `.env` ein und starte neu.
4. Erstell in Schulmanager unter **Einstellungen → Goodnotes** ein App-Passwort.
   Es ist nicht dein Login-Passwort und lässt sich jederzeit widerrufen.
5. In Goodnotes unter **Einstellungen → Backup → Auto-Backup → WebDAV** die
   Adresse, deine E-Mail als Benutzername und das App-Passwort eintragen. Als
   Format **PDF** wählen; das Goodnotes-Format wird nicht gespeichert.

So ordnet Schulmanager Hefte einem Fach zu:

1. Der innerste Ordner, der wie ein Fach heißt (`Schule/Q1/Mathe/Analysis` →
   Mathe). Führende Nummern wie in `1 Französisch` werden ignoriert.
2. Sonst der Name des Hefts selbst (`Q3/Mathe` → Mathe).
3. Sonst landet das Heft unter **Hefte → Ohne Fach**. Dort weist du einem Ordner
   von Hand ein Fach zu, und das gilt dann auch für später hinzukommende Hefte.

Goodnotes überträgt keine Löschungen. Ein dort gelöschtes Heft archivierst du in
Schulmanager. Sichert Goodnotes es später wieder, ist es automatisch zurück.

Wenn sich in Goodnotes Seiten verschieben, sucht Schulmanager verknüpfte Seiten
anhand ihres Inhalts wieder. Ist das nicht eindeutig, wird der Link als
„unsicher“ markiert, bis du ihn mit einem Klick bestätigst.

### Push-Erinnerungen

Erinnert an Klausuren (drei Tage und einen Tag vorher) und an Hausaufgaben, die
morgen fällig sind, auch wenn die App geschlossen ist. Braucht HTTPS.

```sh
npx web-push generate-vapid-keys
```

Beide Schlüssel als `VAPID_PUBLIC_KEY` und `VAPID_PRIVATE_KEY` in die `.env`,
dazu `VAPID_SUBJECT=mailto:deine-adresse@example.com`. Nach dem Neustart in der
App unter **Einstellungen → Erinnerungen** aktivieren.

### IServ-Vertretungsplan

Holt alle 30 Minuten den Stundenplan samt Vertretungen aus IServ. Dafür einen
Schlüssel erzeugen und als `CREDENTIALS_ENCRYPTION_KEY` in die `.env` setzen:

```sh
openssl rand -hex 32
```

Die IServ-Zugangsdaten trägt danach jedes Konto selbst unter **Einstellungen →
IServ** ein. Sie werden mit diesem Schlüssel verschlüsselt gespeichert.

## Betrieb

### Aktualisieren

```sh
git pull
docker compose up --build -d
```

Datenbank-Migrationen laufen beim Start des Containers automatisch.

### Sichern

Die Datenbank ist eine einzelne SQLite-Datei:

```sh
docker compose stop schulmanager
docker run --rm -v schulmanager_schulmanager-data:/data -v "$PWD":/backup alpine \
  cp /data/schulmanager.db /backup/schulmanager-backup.db
docker compose start schulmanager
```

Die Goodnotes-PDFs liegen daneben unter `/data/uploads`. Sie zu sichern ist
optional, weil Goodnotes sie ohnehin hat und beim nächsten Backup erneut
hochlädt.

Zusätzlich kann jedes Konto unter **Einstellungen → Daten** seine Daten als
JSON exportieren und in ein anderes Konto importieren. Hefte und deren
Verknüpfungen sind darin nicht enthalten.

## Entwicklung

Voraussetzung: Node.js 20 oder neuer.

```sh
npm install
cp .env.example backend/.env   # Werte für lokal anpassen, z. B. DATABASE_URL="file:./dev.db"
npm run prisma:migrate         # legt die Dev-Datenbank an
npm run dev:backend            # API auf 6969, WebDAV auf 6970
npm run dev:frontend           # Vite mit Proxy von /api auf das Backend
```

Tests (vitest und supertest, gegen eine eigene `backend/prisma/test.db`):

```sh
npm run test:backend
```

Frontend-Typen prüfst du mit `npm run build`, nicht mit einem bloßen
`tsc --noEmit`: Die `tsconfig.json` im Frontend verweist nur auf Unterprojekte
und prüft allein gar nichts.

Migrationen nur mit `npx prisma migrate dev --name …` im `backend/` anlegen,
Ordnernamen nie von Hand vergeben. Prisma wendet sie in alphabetischer
Reihenfolge an.

### Aufbau

```
backend/    API (Express, Prisma, SQLite) und WebDAV-Server
  src/modules/   ein Ordner pro Bereich: routes, controller, service, schema
frontend/   React-App (Vite, Tailwind, React Query, pdf.js)
  src/features/  ein Ordner pro Bereich
docker/     Dockerfile und Entrypoint
```

Die REST-API unter `/api/*` ist unabhängig vom Frontend, damit später auch
andere Clients sie nutzen können.

## Lizenz

[GNU AGPL-3.0](LICENSE). Wer eine veränderte Version als Dienst für andere
betreibt, muss den geänderten Quellcode ebenfalls offenlegen.
