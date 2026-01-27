# Verwalco Multi-User - Deployment Guide

## Übersicht

Verwalco ist jetzt ein Multi-User System. Diese Anleitung hilft dir beim Deployment auf deinem Server.

## Voraussetzungen

- Linux Server (Ubuntu/Debian empfohlen)
- Python 3.8+
- Nginx
- Domain mit DNS-Eintrag auf deinen Server
- SSL-Zertifikat (Let's Encrypt empfohlen)

## Installation auf dem Server

### 1. Server vorbereiten

```bash
# System aktualisieren
sudo apt update && sudo apt upgrade -y

# Python und Dependencies installieren
sudo apt install python3 python3-pip python3-venv nginx -y

# User für die Anwendung erstellen (optional aber empfohlen)
sudo useradd -m -s /bin/bash verwalco
sudo su - verwalco
```

### 2. Code auf Server übertragen

```bash
# Mit Git
git clone <dein-repository-url> /home/verwalco/Verwalco
cd /home/verwalco/Verwalco

# Oder mit SCP/SFTP
# Kopiere alle Dateien nach /home/verwalco/Verwalco
```

### 3. Virtual Environment einrichten

```bash
cd /home/verwalco/Verwalco
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### 4. Umgebungsvariablen konfigurieren

```bash
# .env Datei erstellen
cp .env.example .env
nano .env
```

Wichtige Einstellungen in `.env`:

```bash
# WICHTIG: Ändere dies zu einem sicheren, zufälligen String!
SECRET_KEY="dein-sehr-sicherer-zufälliger-schlüssel-hier"

# Produktionsmodus
FLASK_ENV=production

# Optional: Wenn du alte Admin-Credentials brauchst
# (Nur für Migration, danach entfernen!)
# ADMIN_USERNAME=admin
# ADMIN_PASSWORD=admin123
```

**SECRET_KEY generieren**:
```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

### 5. Datenbank initialisieren

**Option A: Neue Installation**
```bash
source venv/bin/activate
python3 app.py  # Startet kurz und erstellt Tabellen
# Drücke CTRL+C nach ein paar Sekunden
```

**Option B: Mit bestehenden Daten migrieren**
```bash
source venv/bin/activate
# Kopiere deine alte kosten.db auf den Server
python3 migrate_to_multiuser.py
```

### 6. Systemd Service einrichten

Die Datei `verwalco.service` ist bereits vorhanden. Anpassen:

```bash
sudo nano /home/verwalco/Verwalco/verwalco.service
```

Stelle sicher, dass die Pfade korrekt sind:
```ini
[Unit]
Description=Verwalco Multi-User Kostenverwaltung
After=network.target

[Service]
Type=notify
User=verwalco
Group=verwalco
WorkingDirectory=/home/verwalco/Verwalco
Environment="PATH=/home/verwalco/Verwalco/venv/bin"
EnvironmentFile=/home/verwalco/Verwalco/.env
ExecStart=/home/verwalco/Verwalco/venv/bin/gunicorn --workers 3 --bind unix:/home/verwalco/Verwalco/verwalco.sock --timeout 60 app:app
ExecReload=/bin/kill -s HUP $MAINPID
KillMode=mixed
TimeoutStopSec=5
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

Service aktivieren:
```bash
sudo cp /home/verwalco/Verwalco/verwalco.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable verwalco
sudo systemctl start verwalco
sudo systemctl status verwalco
```

### 7. Nginx konfigurieren

Die Datei `nginx.conf` ist bereits vorhanden. Anpassen:

```bash
sudo nano /etc/nginx/sites-available/verwalco
```

Beispiel-Konfiguration:
```nginx
server {
    listen 80;
    server_name deine-domain.de www.deine-domain.de;
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name deine-domain.de www.deine-domain.de;

    # SSL Zertifikate (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/deine-domain.de/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/deine-domain.de/privkey.pem;
    
    # SSL Einstellungen
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Logs
    access_log /var/log/nginx/verwalco_access.log;
    error_log /var/log/nginx/verwalco_error.log;

    # Static files
    location /static {
        alias /home/verwalco/Verwalco/static;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Application
    location / {
        proxy_pass http://unix:/home/verwalco/Verwalco/verwalco.sock;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
}
```

Nginx aktivieren:
```bash
sudo ln -s /etc/nginx/sites-available/verwalco /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 8. SSL-Zertifikat mit Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d deine-domain.de -d www.deine-domain.de
```

Folge den Anweisungen von Certbot.

### 9. Firewall konfigurieren

```bash
sudo ufw allow 'Nginx Full'
sudo ufw allow OpenSSH
sudo ufw enable
```

## Testen

1. Öffne `https://deine-domain.de` im Browser
2. Du solltest zur Login-Seite weitergeleitet werden
3. Klicke auf "Jetzt registrieren"
4. Erstelle einen neuen Benutzer
5. Teste die Funktionalität

## Wartung

### Logs anschauen

```bash
# Application Logs
sudo journalctl -u verwalco -f

# Nginx Logs
sudo tail -f /var/log/nginx/verwalco_error.log
sudo tail -f /var/log/nginx/verwalco_access.log
```

### Anwendung neu starten

```bash
sudo systemctl restart verwalco
```

### Updates einspielen

```bash
cd /home/verwalco/Verwalco
git pull  # oder Dateien manuell aktualisieren
source venv/bin/activate
pip install -r requirements.txt --upgrade
sudo systemctl restart verwalco
```

### Datenbank-Backup

```bash
# Backup erstellen
cp /home/verwalco/Verwalco/kosten.db /home/verwalco/backup_$(date +%Y%m%d_%H%M%S).db

# Automatisches Backup (Crontab)
crontab -e
# Füge hinzu:
0 2 * * * cp /home/verwalco/Verwalco/kosten.db /home/verwalco/backups/kosten_$(date +\%Y\%m\%d).db
```

## Sicherheit

### Wichtige Sicherheitsmaßnahmen

1. **SECRET_KEY**: Verwende einen starken, zufälligen Schlüssel
2. **HTTPS**: Immer SSL/TLS verwenden
3. **Firewall**: Nur notwendige Ports öffnen (80, 443, 22)
4. **Updates**: Regelmäßig System und Dependencies aktualisieren
5. **Backups**: Tägliche Datenbank-Backups
6. **Passwörter**: Starke Passwörter verwenden (min. 12 Zeichen)
7. **Fail2Ban**: Optional für Brute-Force-Schutz

### Fail2Ban einrichten (optional)

```bash
sudo apt install fail2ban -y
sudo nano /etc/fail2ban/jail.local
```

```ini
[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/verwalco_error.log
```

```bash
sudo systemctl restart fail2ban
```

## Troubleshooting

### Service startet nicht

```bash
sudo journalctl -u verwalco -n 50
# Prüfe Pfade und Berechtigungen
ls -la /home/verwalco/Verwalco/
```

### 502 Bad Gateway

```bash
# Prüfe ob Service läuft
sudo systemctl status verwalco

# Prüfe Socket-Datei
ls -la /home/verwalco/Verwalco/verwalco.sock

# Prüfe Nginx-Konfiguration
sudo nginx -t
```

### Datenbank-Fehler

```bash
# Prüfe Berechtigungen
ls -la /home/verwalco/Verwalco/kosten.db
sudo chown verwalco:verwalco /home/verwalco/Verwalco/kosten.db
```

### Session-Probleme

- Lösche Browser-Cookies
- Prüfe ob `SECRET_KEY` gesetzt ist
- Prüfe ob `SESSION_COOKIE_SECURE` korrekt konfiguriert ist (nur bei HTTPS)

## Performance-Optimierung

### Gunicorn Workers anpassen

Faustregel: `(2 x CPU_Cores) + 1`

```bash
# In verwalco.service
ExecStart=/home/verwalco/Verwalco/venv/bin/gunicorn --workers 5 --bind unix:/home/verwalco/Verwalco/verwalco.sock app:app
```

### Nginx Caching

Füge in Nginx-Config hinzu:
```nginx
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=verwalco_cache:10m max_size=100m;

location /static {
    proxy_cache verwalco_cache;
    proxy_cache_valid 200 30d;
}
```

## Support

Bei Problemen:
1. Prüfe die Logs
2. Stelle sicher, dass alle Dependencies installiert sind
3. Prüfe Berechtigungen
4. Prüfe Firewall-Regeln

## Nächste Schritte

- [ ] Monitoring einrichten (z.B. Uptime Robot)
- [ ] Backup-Strategie implementieren
- [ ] E-Mail-Benachrichtigungen konfigurieren
- [ ] Rate Limiting für API-Endpoints
- [ ] Admin-Panel für User-Management
