# Tower Duell

Deutsches Online-Stapelspiel für zwei Personen. Raum erstellen, Link teilen und abwechselnd Blöcke platzieren. Der Spieler, dessen Zug den Turm umwirft, verliert.

## Starten

Die erste Version wurde unter https://tower-duell.higgsfield.app bereitgestellt. Der Hoster antwortete beim letzten öffentlichen Zugriff jedoch mit HTTP 401 (`unauthenticated`). Daher ist Online-Spiel über diesen Host noch nicht öffentlich bestätigt. Der Client in `app/public/` kann auch auf GitHub Pages laufen; dort verbindet er sich mit diesem Spielserver. GitHub Pages allein führt keine WebSocket-Server aus.

## Physik

Vereinfachtes quasistatisches Modell: pro Kontaktfläche werden Gewichtsschwerpunkt und Windmomente aller darüber liegenden Blöcke berechnet. Verlässt die resultierende Kraft die tatsächliche Auflagefläche, kippt der Turm. Der Wind ist vor dem Zug sichtbar und nimmt mit der Blockzahl zu. Fall und Einsturz werden animiert. Dies ist kein vollständiger dynamischer Starrkörper-Solver mit Reibung und Kollisionen.

## Entwicklung

Projekt unter `app/`, Cloudflare Worker mit Durable-Object-Spielräumen. `src/logic.js` enthält deterministische Regeln; der Server prüft Zugfolge, Eingaben und Zuschauerrechte. Keine geheimen Schlüssel im Client.

`node app/tests/physics.mjs` prüft Regeln und Statik ohne Abhängigkeiten. Mit installiertem Bun und Projektabhängigkeiten: `cd app`, `bun run build`, `bun run test`.

Private Raumcodes dienen der Zuordnung, nicht als sichere Authentifizierung. Mitspielende sollten vertrauenswürdig sein.

## Prüfstatus

Die deterministischen Physik- und Eingabeprüfungen bestehen. Zwei lokale Browser wurden mit einem simulierten WebSocket-Transport auf Zugwechsel, identischen Spielstand, Niederlage, Sieg, Revanche und mobile Darstellung geprüft. Die Cloudflare-WebSocket-Tests sind mitgeliefert; sie konnten mangels Bun und installierter Abhängigkeiten in der Entwicklungsumgebung noch nicht ausgeführt werden.
