# Verwalco - Verwaltung und Kontrolle

Eine Webanwendung zur Verwaltung und Kontrolle der Laufenden Kosten.
Man trägt die Laufenden Kosten ein und trennt die nach Konten.
Man gibt Bezeichnung, den Betrag, Zahlungstag und Konto ein.
Man kann die Einträge beliebig verschieben, bearbeiten und löschen.
Bei dieser Version sind die Muster-Einträge vorhanden, um su sehen 
wie das ganze aussieht. Man kann die Einträge natürlich alle löschen.

Wenn die Liste fertig ist, sieht man unten die Gesamtsumme der Ausgaben.
Man klickt den Checkbox "Bezahlt" bei der abgebuchten Beträgen im laufe des Monats.
Bezahlte Posten werden vom Gesamtbetrag abgezogen.
Man sieht unten noch offenen Gesamtbetrag und weißt dann ganz genau was noch alles
und wann abgebucht wird. So hat man besseren Überblick über die Ausgaben und man kann
den Family-Budget besser planen.

## Installation

1. Stellen Sie sicher, dass Python (Version 3.x) auf Ihrem System installiert ist.

2. Klonen Sie das Repository:
   ```bash
   git clone [repository-url]
   cd Verwalco
   ```

3. Erstellen Sie eine virtuelle Umgebung und aktivieren Sie diese:
   ```bash
   python -m venv venv
   source venv/bin/activate  # Für macOS/Linux
   # oder
   .\venv\Scripts\activate  # Für Windows
   ```

4. Installieren Sie die erforderlichen Pakete:
   ```bash
   pip install -r requirements.txt
   ```

## Anwendung starten

1. Stellen Sie sicher, dass die virtuelle Umgebung aktiviert ist.

2. Starten Sie die Anwendung:
   ```bash
   python app.py
   ```

3. Öffnen Sie einen Webbrowser und navigieren Sie zu:
   ```
   http://localhost:5000
   ```

## Technische Details

Die Anwendung basiert auf:
- Flask 3.0.0
- Flask-SQLAlchemy 3.1.1
- SQLAlchemy 2.0.23

