# Goodnotes-WebDAV-Testempfänger

Ein kleiner WebDAV-Server, der alles speichert, was Goodnotes per Auto-Backup hochlädt, und jede Anfrage protokolliert. Er gehört nicht zur Schulmanager-App. Er soll nur zeigen, wie Goodnotes Dateien benennt, ablegt und beim Umbenennen verschiebt, bevor die echte Anbindung gebaut wird.

Keine Abhängigkeiten außer Node.js 18+.

## Starten

Auf dem Server im Repo-Ordner:

```sh
docker run --rm -it -p 6970:6970 \
  -v "$PWD/tools/goodnotes-webdav-probe:/probe" \
  -v "$PWD/probe-data:/data" \
  -e DATA_DIR=/data -e PROBE_USER=goodnotes -e PROBE_PASS='ein-langes-passwort' \
  node:22-alpine node /probe/probe.mjs
```

Oder ohne Docker:

```sh
PROBE_PASS='ein-langes-passwort' node tools/goodnotes-webdav-probe/probe.mjs
```

| Variable     | Standard        | Bedeutung                                   |
|--------------|-----------------|---------------------------------------------|
| `PORT`       | `6970`          | Port, auf dem der Empfänger lauscht         |
| `DATA_DIR`   | `./probe-data`  | Ablage für Dateien und Protokoll            |
| `PROBE_USER` | `goodnotes`     | Benutzername für Goodnotes                  |
| `PROBE_PASS` | zufällig        | Passwort; ohne Angabe wird eins erzeugt und beim Start angezeigt |

## Reverse-Proxy

`schooldav.home.seancorcoran.de` auf `http://<server>:6970` weiterleiten, HTTPS am Proxy, Zugriff nur aus dem Heimnetz. Der Empfänger erwartet, an der Wurzel (`/`) zu liegen, nicht unter einem Unterpfad.

## In Goodnotes einrichten

Einstellungen → Auto-Backup → WebDAV:

- Server: `https://schooldav.home.seancorcoran.de/`
- Benutzer / Passwort: wie oben
- Format: **beides** (Goodnotes und PDF), damit wir sehen, wie beide Dateiarten heißen
- App im Vordergrund lassen, bis die erste Sicherung fertig ist

## Testablauf

Nach der ersten vollständigen Sicherung bitte der Reihe nach, jeweils ein bis zwei Minuten warten:

1. In einem Heft etwas auf eine bestehende Seite schreiben.
2. Am Ende eines Hefts eine Seite anfügen.
3. In der Mitte eines Hefts eine Seite einfügen.
4. Ein Heft umbenennen.
5. Ein Heft in einen anderen Ordner verschieben.
6. Einen Ordner umbenennen.
7. Ein Heft löschen.
8. Ein neues Heft anlegen.

Am besten notierst du dir die Uhrzeit jedes Schritts.

## Was ich zurück brauche

- `probe-data/requests.jsonl` (eine Zeile pro Anfrage, ohne Passwörter)
- die Ordnerstruktur, z. B. Ausgabe von `find probe-data/files`
- deine Uhrzeiten zu den Schritten

`forwardedFor` im Protokoll zeigt, mit welcher IP das iPad beim Proxy ankam. Daran sehen wir, ob die Heimnetz-Regel greift.
