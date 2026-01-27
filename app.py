from flask import Flask, render_template, request, jsonify, redirect, url_for, session
from peewee import *
from datetime import datetime, timedelta
from playhouse.shortcuts import model_to_dict
from functools import wraps
from werkzeug.security import generate_password_hash, check_password_hash
import os
import secrets

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'dein-geheimer-schluessel')  # Ändern Sie dies zu einem sicheren Schlüssel
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SECURE'] = os.environ.get('FLASK_ENV') == 'production'  # HTTPS in Produktion
app.config['PERMANENT_SESSION_LIFETIME'] = 1800  # 30 Minuten Session-Timeout


def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return redirect('/login')
        return f(*args, **kwargs)
    return decorated_function

def get_current_user():
    if 'user_id' in session:
        return User.get_or_none(User.id == session['user_id'])
    return None

db = SqliteDatabase('kosten.db')

class BaseModel(Model):
    class Meta:
        database = db

class User(BaseModel):
    username = CharField(unique=True)
    email = CharField(unique=True)
    password_hash = CharField()
    created_at = DateTimeField(default=datetime.now)

    class Meta:
        table_name = 'users'

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

class PasswordReset(BaseModel):
    user = ForeignKeyField(User, backref='password_resets', on_delete='CASCADE')
    token = CharField(unique=True, index=True)
    created_at = DateTimeField(default=datetime.now)
    expires_at = DateTimeField()
    used = BooleanField(default=False)

    class Meta:
        table_name = 'password_resets'

    @classmethod
    def create_for_user(cls, user):
        token = secrets.token_urlsafe(32)
        expires_at = datetime.now() + timedelta(hours=1)
        return cls.create(user=user, token=token, expires_at=expires_at)

    def is_valid(self):
        return not self.used and datetime.now() < self.expires_at

class Kosten(BaseModel):
    user = ForeignKeyField(User, backref='kosten', on_delete='CASCADE')
    bezeichnung = CharField()
    betrag = FloatField()
    zahlungstag = IntegerField()
    konto = CharField()
    bezahlt = BooleanField(default=False)
    position = IntegerField(default=0)

    class Meta:
        table_name = 'kosten'

@app.route('/register', methods=['GET', 'POST'])
def register():
    if 'user_id' in session:
        return redirect('/')
    
    if request.method == 'POST':
        username = request.form.get('username')
        email = request.form.get('email')
        password = request.form.get('password')
        password_confirm = request.form.get('password_confirm')
        
        error = None
        
        if not username or not email or not password:
            error = 'Alle Felder sind erforderlich'
        elif password != password_confirm:
            error = 'Passwörter stimmen nicht überein'
        elif len(password) < 6:
            error = 'Passwort muss mindestens 6 Zeichen lang sein'
        elif User.select().where(User.username == username).exists():
            error = 'Benutzername bereits vergeben'
        elif User.select().where(User.email == email).exists():
            error = 'E-Mail bereits registriert'
        
        if error is None:
            try:
                user = User.create(
                    username=username,
                    email=email,
                    password_hash=generate_password_hash(password)
                )
                session['user_id'] = user.id
                session['username'] = user.username
                return redirect('/')
            except Exception as e:
                error = f'Registrierung fehlgeschlagen: {str(e)}'
        
        return render_template('register.html', error=error)
    
    return render_template('register.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if 'user_id' in session:
        return redirect('/')
        
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        error = None
        user = User.get_or_none(User.username == username)
        
        if user is None:
            error = 'Ungültiger Benutzername oder Passwort'
        elif not user.check_password(password):
            error = 'Ungültiger Benutzername oder Passwort'
        
        if error is None:
            session['user_id'] = user.id
            session['username'] = user.username
            return redirect('/')
        
        return render_template('login.html', error=error)
            
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.clear()
    return redirect('/login')

@app.route('/forgot-password', methods=['GET', 'POST'])
def forgot_password():
    if 'user_id' in session:
        return redirect('/')
    
    if request.method == 'POST':
        email = request.form.get('email')
        
        user = User.get_or_none(User.email == email)
        
        if user:
            # Alte, ungenutzte Tokens für diesen User löschen
            PasswordReset.delete().where(
                (PasswordReset.user == user) & (PasswordReset.used == False)
            ).execute()
            
            # Neuen Reset-Token erstellen
            reset = PasswordReset.create_for_user(user)
            
            # In Produktion: E-Mail senden
            # Für jetzt: Token direkt anzeigen
            reset_url = url_for('reset_password', token=reset.token, _external=True)
            
            return render_template('forgot_password.html', 
                                 success=True, 
                                 reset_url=reset_url,
                                 email=email)
        else:
            # Aus Sicherheitsgründen zeigen wir immer eine Erfolgs-Nachricht
            # (verhindert User-Enumeration)
            return render_template('forgot_password.html', 
                                 success=True,
                                 email=email)
    
    return render_template('forgot_password.html')

@app.route('/reset-password/<token>', methods=['GET', 'POST'])
def reset_password(token):
    if 'user_id' in session:
        return redirect('/')
    
    reset = PasswordReset.get_or_none(PasswordReset.token == token)
    
    if not reset or not reset.is_valid():
        return render_template('reset_password.html', 
                             error='Dieser Link ist ungültig oder abgelaufen.',
                             invalid=True)
    
    if request.method == 'POST':
        password = request.form.get('password')
        password_confirm = request.form.get('password_confirm')
        
        error = None
        
        if not password:
            error = 'Passwort ist erforderlich'
        elif len(password) < 6:
            error = 'Passwort muss mindestens 6 Zeichen lang sein'
        elif password != password_confirm:
            error = 'Passwörter stimmen nicht überein'
        
        if error is None:
            try:
                # Passwort aktualisieren
                user = reset.user
                user.password_hash = generate_password_hash(password)
                user.save()
                
                # Token als verwendet markieren
                reset.used = True
                reset.save()
                
                return render_template('reset_password.html', 
                                     success=True,
                                     username=user.username)
            except Exception as e:
                error = f'Fehler beim Zurücksetzen: {str(e)}'
        
        return render_template('reset_password.html', 
                             error=error,
                             token=token)
    
    return render_template('reset_password.html', token=token)

@app.route('/')
@login_required
def index():
    return render_template('index.html')

@app.before_request
def before_request():
    if not request.endpoint:
        return

    if request.endpoint.startswith('static'):
        return

    if request.endpoint not in ['login', 'register', 'forgot_password', 'reset_password'] and 'user_id' not in session:
        return redirect('/login')

    db.connect(reuse_if_open=True)

@app.after_request
def after_request(response):
    db.close()
    return response

@app.route('/api/kosten', methods=['GET'])
@login_required
def get_kosten():
    user = get_current_user()
    if not user:
        return jsonify({'success': False, 'error': 'Nicht authentifiziert'}), 401
    
    kosten = list(Kosten.select().where(Kosten.user == user).order_by(Kosten.konto, Kosten.position, Kosten.zahlungstag))
    return jsonify([model_to_dict(k) for k in kosten])

@app.route('/api/kosten', methods=['POST'])
@login_required
def add_kosten():
    try:
        user = get_current_user()
        if not user:
            return jsonify({'success': False, 'error': 'Nicht authentifiziert'}), 401
        
        data = request.get_json()
        app.logger.debug(f'Received data: {data}')
        if not all(key in data for key in ['bezeichnung', 'betrag', 'zahlungstag', 'konto']):
            return jsonify({'success': False, 'error': 'Fehlende Felder'}), 400

        max_position = (Kosten
                       .select(fn.MAX(Kosten.position))
                       .where((Kosten.user == user) & (Kosten.konto == data['konto']))
                       .scalar() or -1)

        # Stelle sicher, dass betrag ein gültiger Float ist
        try:
            betrag_str = str(data['betrag']).strip()
            if ',' in betrag_str:
                # Replace only the last comma with a dot and remove all dots (thousand separators)
                parts = betrag_str.rsplit(',', 1)  # Split at last comma
                integer_part = parts[0].replace('.', '')
                decimal_part = parts[1] if len(parts) > 1 else '0'
                betrag_str = f"{integer_part}.{decimal_part}"
            betrag = float(betrag_str)
            app.logger.debug(f'Final betrag value: {betrag}')
        except ValueError as e:
            app.logger.debug(f'ValueError during conversion: {str(e)}')
            return jsonify({'success': False, 'error': 'Ungültiges Zahlenformat für Betrag'}), 400

        kosten = Kosten.create(
            user=user,
            bezeichnung=data['bezeichnung'],
            betrag=betrag,
            zahlungstag=int(data['zahlungstag']),
            konto=data['konto'],
            position=max_position + 1
        )
        
        return jsonify({
            'success': True,
            'data': model_to_dict(kosten)
        })
    except ValueError as e:
        return jsonify({'success': False, 'error': f'Ungültige Werte: {str(e)}'}), 400
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/kosten/<int:id>', methods=['PUT'])
@login_required
def update_kosten(id):
    try:
        user = get_current_user()
        if not user:
            return jsonify({'success': False, 'error': 'Nicht authentifiziert'}), 401
        
        data = request.get_json()
        kosten = Kosten.get_or_none((Kosten.id == id) & (Kosten.user == user))
        
        if not kosten:
            return jsonify({'success': False, 'error': 'Eintrag nicht gefunden'}), 404

        if 'bezahlt' in data:
            kosten.bezahlt = data['bezahlt']
        else:
            kosten.bezeichnung = data['bezeichnung']
            # Convert German number format to Python float
            betrag_str = str(data['betrag'])
            if ',' in betrag_str:
                # Replace only the last comma with a dot and remove all dots (thousand separators)
                parts = betrag_str.rsplit(',', 1)  # Split at last comma
                integer_part = parts[0].replace('.', '')
                decimal_part = parts[1] if len(parts) > 1 else '0'
                betrag_str = f"{integer_part}.{decimal_part}"
            kosten.betrag = float(betrag_str)
            kosten.zahlungstag = int(data['zahlungstag'])
            kosten.konto = data['konto']
        
        kosten.save()
        return jsonify({
            'success': True,
            'data': model_to_dict(kosten)
        })
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/kosten/<int:id>', methods=['DELETE'])
@login_required
def delete_kosten(id):
    try:
        user = get_current_user()
        if not user:
            return jsonify({'success': False, 'error': 'Nicht authentifiziert'}), 401
        
        kosten = Kosten.get_or_none((Kosten.id == id) & (Kosten.user == user))
        if not kosten:
            return jsonify({'success': False, 'error': 'Eintrag nicht gefunden'}), 404
            
        kosten.delete_instance()
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/kosten/reorder', methods=['POST'])
@login_required
def reorder_kosten():
    try:
        user = get_current_user()
        if not user:
            return jsonify({'success': False, 'error': 'Nicht authentifiziert'}), 401
        
        data = request.get_json()
        with db.atomic():
            for item in data:
                Kosten.update(position=item['position']).where((Kosten.id == item['id']) & (Kosten.user == user)).execute()
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/konten', methods=['GET'])
@login_required
def get_konten():
    user = get_current_user()
    if not user:
        return jsonify({'success': False, 'error': 'Nicht authentifiziert'}), 401
    
    konten = (Kosten
              .select(Kosten.konto)
              .where(Kosten.user == user)
              .distinct()
              .order_by(Kosten.konto))
    return jsonify([k.konto for k in konten])

@app.route('/api/konten/rename', methods=['POST'])
@login_required
def rename_konto():
    try:
        user = get_current_user()
        if not user:
            return jsonify({'success': False, 'error': 'Nicht authentifiziert'}), 401
        
        data = request.get_json()
        if not all(key in data for key in ['old_name', 'new_name']):
            return jsonify({'success': False, 'error': 'Fehlende Felder'}), 400

        old_name = data['old_name']
        new_name = data['new_name']

        if not old_name or not new_name:
            return jsonify({'success': False, 'error': 'Kontoname darf nicht leer sein'}), 400

        with db.atomic():
            Kosten.update(konto=new_name).where((Kosten.konto == old_name) & (Kosten.user == user)).execute()
            
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    db.connect()
    db.create_tables([User, PasswordReset, Kosten])
    db.close()
    # Debug-Modus nur für lokale Entwicklung
    app.run(host='0.0.0.0', port=8000, debug=os.environ.get('FLASK_ENV') != 'production')
