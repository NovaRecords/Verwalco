# Changelog - Verwalco Multi-User Update

## Version 2.0.0 - Multi-User Support (Januar 2026)

### 🎉 Neue Features

#### Multi-User System
- **Benutzer-Registrierung**: Neue Benutzer können sich selbst registrieren
- **Benutzer-Authentifizierung**: Sicheres Login-System mit Passwort-Hashing
- **User-Isolation**: Jeder Benutzer sieht nur seine eigenen Daten
- **Session-Management**: 30 Minuten Session-Timeout, sichere Cookies

#### Datenbank-Änderungen
- **User-Tabelle**: Neue Tabelle für Benutzerverwaltung
  - Username (eindeutig)
  - E-Mail (eindeutig)
  - Passwort-Hash (bcrypt via werkzeug)
  - Erstellungsdatum
- **Kosten-Tabelle**: Erweitert um `user_id` Foreign Key
  - Alle Kosten sind nun einem Benutzer zugeordnet
  - CASCADE DELETE: Wenn User gelöscht wird, werden auch seine Daten gelöscht

#### Sicherheit
- **Passwort-Hashing**: Werkzeug Security für sichere Passwort-Speicherung
- **Session-Security**: HttpOnly und Secure Cookies
- **Input-Validierung**: Verbesserte Validierung bei Registrierung
- **User-spezifische Queries**: Alle API-Endpoints filtern nach User

### 🔄 Geänderte Features

#### Backend (`app.py`)
- Login-System komplett überarbeitet
- Alle API-Endpoints prüfen nun User-Authentifizierung
- `get_current_user()` Helper-Funktion hinzugefügt
- `before_request` aktualisiert für Register-Route
- Entfernung von hardcoded Admin-Credentials

#### Frontend
- **Login-Template**: 
  - Fehleranzeige hinzugefügt
  - Link zur Registrierung
- **Register-Template**: 
  - Neues Template für Benutzerregistrierung
  - Passwort-Bestätigung
  - Validierung im Frontend
- **Index-Template**: 
  - Zeigt angemeldeten Benutzernamen
  - Verbessertes Header-Layout

### 🛠️ Migrations-Tools

#### `migrate_to_multiuser.py`
- Automatisches Migrations-Script für bestehende Datenbanken
- Erstellt Admin-User für alte Daten
- Sichere Daten-Migration mit Backup
- Interaktive Ausführung

### 📚 Dokumentation

#### Neue Dateien
- **MIGRATION.md**: Schritt-für-Schritt Migrations-Anleitung
- **DEPLOYMENT_MULTIUSER.md**: Vollständiger Deployment-Guide für Server
- **CHANGELOG.md**: Diese Datei

### 🔧 Technische Details

#### Dependencies
Keine neuen Dependencies - alle benötigten Pakete waren bereits vorhanden:
- Flask 3.0.2
- Peewee 3.17.0
- Werkzeug (für Passwort-Hashing)
- Gunicorn 21.2.0

#### API-Änderungen
Alle API-Endpoints prüfen nun User-Authentifizierung:
- `GET /api/kosten` - Nur User-spezifische Kosten
- `POST /api/kosten` - Kosten werden mit User verknüpft
- `PUT /api/kosten/<id>` - Nur eigene Kosten bearbeitbar
- `DELETE /api/kosten/<id>` - Nur eigene Kosten löschbar
- `POST /api/kosten/reorder` - Nur eigene Kosten sortierbar
- `GET /api/konten` - Nur User-spezifische Konten
- `POST /api/konten/rename` - Nur eigene Konten umbenennbar

#### Neue Routes
- `GET/POST /register` - Benutzer-Registrierung
- `GET/POST /login` - Aktualisiertes Login-System
- `GET /logout` - Session-Bereinigung

### ⚠️ Breaking Changes

#### Für bestehende Installationen
1. **Datenbank-Schema**: Die Kosten-Tabelle hat ein neues Pflichtfeld `user_id`
2. **Login-Credentials**: Hardcoded Admin-Login funktioniert nicht mehr
3. **Session-Keys**: Session verwendet jetzt `user_id` statt `user`

#### Migration erforderlich
Bestehende Installationen müssen migriert werden:
```bash
python3 migrate_to_multiuser.py
```

### 🐛 Bugfixes
- Session-Handling verbessert
- Fehlerbehandlung bei ungültigen User-IDs
- Bessere Validierung bei API-Requests

### 📋 Nächste Schritte / Roadmap

#### Geplante Features
- [ ] Passwort-Reset-Funktion
- [ ] E-Mail-Verifizierung
- [ ] Benutzer-Profil-Seite
- [ ] Admin-Panel für User-Management
- [ ] Passwort-Änderungs-Funktion
- [ ] "Passwort vergessen" Feature
- [ ] 2-Faktor-Authentifizierung (optional)
- [ ] Benutzer-Rollen (Admin, User)
- [ ] Export-Funktion für User-Daten
- [ ] Aktivitäts-Log

#### Verbesserungen
- [ ] Rate Limiting für Login-Versuche
- [ ] CAPTCHA bei Registrierung (optional)
- [ ] E-Mail-Benachrichtigungen
- [ ] Dark/Light Mode Toggle
- [ ] Mobile App (PWA)

### 🔐 Sicherheitshinweise

#### Für Produktion
1. **SECRET_KEY ändern**: Verwende einen starken, zufälligen Schlüssel
2. **HTTPS verwenden**: Aktiviere SSL/TLS auf dem Server
3. **Firewall konfigurieren**: Nur notwendige Ports öffnen
4. **Regelmäßige Backups**: Datenbank täglich sichern
5. **Updates**: System und Dependencies aktuell halten

#### Standard-Credentials nach Migration
Wenn du das Migrations-Script verwendest:
- **Username**: admin
- **Passwort**: admin123
- **⚠️ WICHTIG**: Passwort sofort ändern!

### 📊 Statistiken

#### Code-Änderungen
- Dateien geändert: 3 (`app.py`, `login.html`, `index.html`)
- Dateien hinzugefügt: 4 (`register.html`, `migrate_to_multiuser.py`, `MIGRATION.md`, `DEPLOYMENT_MULTIUSER.md`)
- Zeilen Code hinzugefügt: ~600
- Neue Datenbank-Tabellen: 1 (users)
- Neue API-Endpoints: 1 (/register)

### 🙏 Danke

Dieses Update macht Verwalco zu einer vollwertigen Multi-User-Anwendung, die auf einem Server deployed werden kann und von mehreren Benutzern gleichzeitig genutzt werden kann.

---

## Frühere Versionen

### Version 1.0.0 - Initial Release
- Single-User Kostenverwaltung
- Konten-basierte Organisation
- Drag & Drop Sortierung
- Zahlungstag-Tracking
- Bezahlt/Unbezahlt Status
