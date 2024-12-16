# Verwalco - Verwaltung und Kontrolle

Eine Webanwendung zur Verwaltung und Kontrolle der Laufenden Kosten.

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

