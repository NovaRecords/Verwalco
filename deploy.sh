#!/bin/bash

###############################################################################
# Verwalco Multi-User - Automatisches Deployment Script
# Für Ubuntu 24.04 Server
###############################################################################

set -e  # Exit bei Fehler

# Farben für Output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}"
echo "============================================================"
echo "  Verwalco Multi-User - Automatisches Deployment"
echo "============================================================"
echo -e "${NC}"

# Prüfe ob als root ausgeführt
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Bitte als root ausführen: sudo bash deploy.sh${NC}"
    exit 1
fi

# Domain abfragen
read -p "Domain (z.B. verwalco.de): " DOMAIN
if [ -z "$DOMAIN" ]; then
    echo -e "${RED}Domain ist erforderlich!${NC}"
    exit 1
fi

# E-Mail für Let's Encrypt
read -p "E-Mail für SSL-Zertifikat: " EMAIL
if [ -z "$EMAIL" ]; then
    echo -e "${RED}E-Mail ist erforderlich!${NC}"
    exit 1
fi

# Installation-Verzeichnis
INSTALL_DIR="/var/www/verwalco"

echo -e "\n${YELLOW}[1/10] System aktualisieren...${NC}"
apt update && apt upgrade -y

echo -e "\n${YELLOW}[2/10] Notwendige Pakete installieren...${NC}"
apt install -y python3 python3-pip python3-venv nginx git certbot python3-certbot-nginx ufw

echo -e "\n${YELLOW}[3/10] Firewall konfigurieren...${NC}"
ufw --force enable
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
echo -e "${GREEN}✓ Firewall konfiguriert${NC}"

echo -e "\n${YELLOW}[4/10] Code von GitHub klonen...${NC}"
if [ -d "$INSTALL_DIR" ]; then
    echo "Verzeichnis existiert bereits, wird gelöscht..."
    rm -rf "$INSTALL_DIR"
fi
mkdir -p "$INSTALL_DIR"
git clone https://github.com/NovaRecords/Verwalco.git "$INSTALL_DIR"
cd "$INSTALL_DIR"
echo -e "${GREEN}✓ Code geklont${NC}"

echo -e "\n${YELLOW}[5/10] Virtual Environment einrichten...${NC}"
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
echo -e "${GREEN}✓ Dependencies installiert${NC}"

echo -e "\n${YELLOW}[6/10] .env Datei erstellen...${NC}"
SECRET_KEY=$(python3 -c "import secrets; print(secrets.token_hex(32))")
cat > .env << EOF
# Verwalco Produktions-Umgebung
FLASK_ENV=production
SECRET_KEY=$SECRET_KEY
EOF
echo -e "${GREEN}✓ .env erstellt mit SECRET_KEY${NC}"

echo -e "\n${YELLOW}[7/10] Datenbank initialisieren...${NC}"
python3 << 'PYEOF'
from app import db, User, PasswordReset, Kosten
db.connect()
db.create_tables([User, PasswordReset, Kosten])
db.close()
print("✓ Datenbank-Tabellen erstellt")
PYEOF
echo -e "${GREEN}✓ Datenbank initialisiert${NC}"

echo -e "\n${YELLOW}[8/10] Systemd Service einrichten...${NC}"
cat > /etc/systemd/system/verwalco.service << EOF
[Unit]
Description=Verwalco Multi-User Kostenverwaltung
After=network.target

[Service]
Type=notify
User=root
Group=root
WorkingDirectory=$INSTALL_DIR
Environment="PATH=$INSTALL_DIR/venv/bin"
EnvironmentFile=$INSTALL_DIR/.env
ExecStart=$INSTALL_DIR/venv/bin/gunicorn --workers 3 --bind unix:$INSTALL_DIR/verwalco.sock --timeout 60 app:app
ExecReload=/bin/kill -s HUP \$MAINPID
KillMode=mixed
TimeoutStopSec=5
PrivateTmp=true
Restart=always

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable verwalco
systemctl start verwalco
sleep 2
if systemctl is-active --quiet verwalco; then
    echo -e "${GREEN}✓ Verwalco Service läuft${NC}"
else
    echo -e "${RED}✗ Service konnte nicht gestartet werden${NC}"
    journalctl -u verwalco -n 20 --no-pager
    exit 1
fi

echo -e "\n${YELLOW}[9/10] Nginx konfigurieren...${NC}"
cat > /etc/nginx/sites-available/verwalco << EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;

    access_log /var/log/nginx/verwalco_access.log;
    error_log /var/log/nginx/verwalco_error.log;

    location /static {
        alias $INSTALL_DIR/static;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    location / {
        proxy_pass http://unix:$INSTALL_DIR/verwalco.sock;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
EOF

ln -sf /etc/nginx/sites-available/verwalco /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

nginx -t
if [ $? -eq 0 ]; then
    systemctl restart nginx
    echo -e "${GREEN}✓ Nginx konfiguriert${NC}"
else
    echo -e "${RED}✗ Nginx Konfiguration fehlerhaft${NC}"
    exit 1
fi

echo -e "\n${YELLOW}[10/10] SSL-Zertifikat mit Let's Encrypt...${NC}"
echo -e "${YELLOW}Stelle sicher, dass DNS bereits auf diesen Server zeigt!${NC}"
read -p "DNS ist konfiguriert und bereit? (j/n): " DNS_READY

if [ "$DNS_READY" = "j" ] || [ "$DNS_READY" = "J" ]; then
    certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email $EMAIL --redirect
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ SSL-Zertifikat installiert${NC}"
    else
        echo -e "${YELLOW}⚠ SSL-Zertifikat konnte nicht installiert werden${NC}"
        echo -e "${YELLOW}Führe später manuell aus: sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN${NC}"
    fi
else
    echo -e "${YELLOW}⚠ SSL-Zertifikat übersprungen${NC}"
    echo -e "${YELLOW}Führe später manuell aus: sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN${NC}"
fi

echo -e "\n${GREEN}"
echo "============================================================"
echo "  ✓ Deployment erfolgreich abgeschlossen!"
echo "============================================================"
echo -e "${NC}"
echo ""
echo "Nächste Schritte:"
echo "1. Öffne https://$DOMAIN im Browser"
echo "2. Klicke auf 'Jetzt registrieren'"
echo "3. Erstelle deinen ersten Benutzer"
echo ""
echo "Nützliche Befehle:"
echo "  - Logs anzeigen:        sudo journalctl -u verwalco -f"
echo "  - Service neu starten:  sudo systemctl restart verwalco"
echo "  - Service Status:       sudo systemctl status verwalco"
echo "  - Nginx neu laden:      sudo systemctl reload nginx"
echo ""
echo "Viel Erfolg mit Verwalco! 🚀"
echo ""
