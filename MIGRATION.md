# Multi-User Migration Guide

## Übersicht

Verwalco wurde auf ein Multi-User System umgestellt. Jeder Benutzer hat nun seine eigenen Kosten-Einträge.

## Wichtige Änderungen

### Backend
- **User-Tabelle**: Neue Tabelle für Benutzer mit Username, E-Mail und Passwort
- **Kosten-Tabelle**: Erweitert um `user_id` Foreign Key
- **Authentifizierung**: Passwort-Hashing mit werkzeug.security
- **API-Endpoints**: Alle Endpoints filtern nun nach dem eingeloggten User

### Frontend
- **Registrierung**: Neue `/register` Route für Benutzerregistrierung
- **Login**: Aktualisiert mit Fehleranzeige und Link zur Registrierung
- **Header**: Zeigt den angemeldeten Benutzernamen an

## Migration durchführen

### Option 1: Bestehende Datenbank migrieren

Wenn du bereits Daten in der Datenbank hast:

```bash
python migrate_to_multiuser.py
```

Das Script wird:
1. Eine User-Tabelle erstellen
2. Einen Admin-User anlegen (Username: `admin`, Passwort: `admin123`)
3. Alle bestehenden Kosten diesem Admin-User zuweisen
4. Die Kosten-Tabelle mit `user_id` erweitern

**⚠️ WICHTIG**: Ändere das Admin-Passwort nach dem ersten Login!

### Option 2: Neue Datenbank

Wenn du von vorne anfangen möchtest:

```bash
# Alte Datenbank löschen (optional)
rm kosten.db

# App starten - Tabellen werden automatisch erstellt
python app.py
```

Dann registriere dich über `/register`.

## Erste Schritte nach der Migration

1. **Starte die Anwendung**:
   ```bash
   python app.py
   ```

2. **Bei Migration mit bestehenden Daten**:
   - Gehe zu `http://localhost:8000/login`
   - Login mit `admin` / `admin123`
   - Ändere das Passwort (aktuell noch manuell in der DB)

3. **Bei neuer Installation**:
   - Gehe zu `http://localhost:8000/register`
   - Registriere einen neuen Benutzer

## Sicherheitshinweise

### Für Produktion

1. **SECRET_KEY ändern**:
   ```bash
   export SECRET_KEY="dein-sehr-sicherer-zufälliger-schlüssel"
   ```

2. **HTTPS aktivieren**: 
   - `SESSION_COOKIE_SECURE` ist bereits für Produktion konfiguriert
   - Stelle sicher, dass dein Server HTTPS verwendet

3. **Passwort-Anforderungen**:
   - Mindestens 6 Zeichen (kann in `app.py` angepasst werden)

## Neue Features

### Benutzer-Registrierung
- Username (eindeutig)
- E-Mail (eindeutig)
- Passwort (gehasht mit werkzeug)
- Passwort-Bestätigung

### Benutzer-Isolation
- Jeder User sieht nur seine eigenen Kosten
- Konten sind user-spezifisch
- Keine Möglichkeit, Daten anderer User zu sehen

### Session-Management
- 30 Minuten Session-Timeout
- HttpOnly Cookies
- Secure Cookies in Produktion

## Troubleshooting

### "Nicht authentifiziert" Fehler
- Lösche Cookies und melde dich neu an
- Prüfe ob die Session noch gültig ist

### Migration schlägt fehl
- Stelle sicher, dass `kosten.db` nicht von einem anderen Prozess verwendet wird
- Erstelle ein Backup der Datenbank vor der Migration

### Alte Daten nicht sichtbar
- Prüfe ob du mit dem `admin` User eingeloggt bist
- Prüfe in der Datenbank ob `user_id` korrekt gesetzt wurde

## Nächste Schritte

- [ ] Passwort-Reset-Funktion implementieren
- [ ] E-Mail-Verifizierung hinzufügen
- [ ] Benutzer-Profil-Seite erstellen
- [ ] Admin-Panel für User-Management
