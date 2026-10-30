# Tower Duell

## Direkt spielen

https://reiskornlimit.github.io/hunger-nordafrika/tower-duell/

„Neuer Raum“ wählen und den Einladungslink mit einem Freund teilen. Beide Seiten offen lassen. Ihr stapelt abwechselnd; wer den Turm umwirft, verliert. Alternativ könnt ihr an einem Gerät spielen.

## Technik

Die Dateien im Repository-Hauptverzeichnis laufen vollständig statisch auf GitHub Pages. PeerJS 1.5.5 (MIT, unter vendor/) vermittelt eine WebRTC-Datenverbindung über den öffentlichen PeerJS-Signalisierungsdienst. Ein Browser übernimmt die Spielleitung und prüft Züge. Es wird kein eigener Spielserver und kein Higgsfield-Login benötigt. Der ursprüngliche Serverentwurf unter app/ ist archivierter Entwicklungsstand und wird von der statischen Version nicht verwendet.

Wenn die direkte WebRTC-Verbindung nach neun Sekunden nicht steht, verwenden beide Browser automatisch einen HTTPS-Ersatzkanal über ntfy.sh. Dieser überträgt ausschließlich zufällige Raum-/Verbindungskennungen und Spielzüge; keine Namen oder Kontodaten. ntfy-Themen sind öffentlich: Der zufällige Raumcode sollte nur mit dem Mitspieler geteilt werden. Für den öffentlichen Dienst gelten Tages- und Anfragelimits; bei Überschreitung erscheint ein Fehler. Eine dauerhafte Produktionslösung sollte einen eigenen Relaydienst oder TURN-Server verwenden. Keine Garantie für Betrugsschutz gegenüber einem manipulierten Gastgeber.

## Physik

Vereinfachtes quasistatisches Modell: Schwerpunkt, Auflagefläche und Windmomente aller darüber liegenden Blöcke entscheiden über Stabilität. Kein vollständiger dynamischer Starrkörper-Solver. Wind steigt mit der Turmhöhe; ein Einsturz wird animiert.

## Eigene GitHub-Pages-Adresse

In Settings → Pages die Quelle „Deploy from a branch“, Branch „main“, Ordner „/(root)“ auswählen. Dann läuft derselbe Stand auch unter https://reiskornlimit.github.io/tower-duell/.
