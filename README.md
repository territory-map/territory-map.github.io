# Territory-Map

Website: https://territory-map.github.io/

Karten, Gebäude, Routenplanung und Exporte funktionieren direkt im Browser.

## Eigene Pläne

Jedes Browserprofil speichert seine Pläne lokal. Änderungen werden nicht an andere Besucher übertragen. Wer denselben Browser mit demselben Profil verwendet, teilt dessen lokale Daten.

Mit **Plan speichern** lässt sich ein Plan als JSON-Datei sichern. Mit **Plan laden** kann die Datei wieder geöffnet oder auf einem anderen Gerät verwendet werden. Beim Wechsel der Webadresse müssen vorhandene Pläne als Datei übertragen werden.

## Veröffentlichung

Unter **Actions → Territory-Map veröffentlichen → Run workflow** den Zweig `main` auswählen und starten. Erst ein erfolgreicher Lauf veröffentlicht die Website.

Die 23 `upload-*.zip`-Dateien bleiben im Repository gepackt. `assemble.py` prüft ihre Prüfsummen und setzt das vollständige Paket zusammen. Anschließend prüft der Workflow die Datenvollständigkeit und alle 72 Funktionstests.

Alle 21 Karten und die Originaldaten gehören zum vollständigen Paket. Der sichtbare Name und der Seitentitel werden beim Bereitstellen auf Territory-Map angepasst.
