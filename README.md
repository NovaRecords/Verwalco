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
   git clone git@github.com:NovaRecords/Verwalco.git
   cd Verwalco
   ```

3. Erstellen Sie eine virtuelle Umgebung und aktivieren Sie diese:
   ```bash
   python3 -m venv venv         # macOS
   source venv/bin/activate

   python -m venv venv         # Linux
   source venv/bin/activate    # oder
   .venv/bin/activate
   
   python -m venv venv          # Für Windows
   ./venv/Scripts/activate  
   ```

4. Installieren Sie die erforderlichen Pakete:
   ```bash
   pip install -r requirements.txt
   ```

## Anwendung starten (Local)

1. Stellen Sie sicher, dass die virtuelle Umgebung aktiviert ist.

2. Starten Sie die Anwendung:
   ```bash
   python app.py
   ```

3. Öffnen Sie einen Webbrowser und navigieren Sie zu:
   ```
   http://localhost:8000
   ```

## Anwendung starten (Server)

1. Stellen Sie sicher, dass die virtuelle Umgebung aktiviert ist.

2. Starten Sie die Anwendung:
   ```bash
   gunicorn app:app -b 0.0.0.0:8000
   ```

3. Öffnen Sie einen Webbrowser und navigieren Sie zu:
   ```
   http://server-ip:8000
   ```

## Login

- login: admin
- Passwort: password
- Die zugangsdaten können Sie in dem 
file app.py in der Zeile 13 und 14 ändern.

## Technische Details

Die Anwendung basiert auf:
- Flask 3.0.2
- peewee 3.17.0
- python-dotenv 1.0.0

