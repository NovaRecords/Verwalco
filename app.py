from flask import Flask, render_template, request, jsonify, redirect, url_for, session
from peewee import *
from datetime import datetime
from playhouse.shortcuts import model_to_dict
from functools import wraps
import os

app = Flask(__name__)
app.secret_key = 'dein-geheimer-schluessel'  # Ändern Sie dies zu einem sicheren Schlüssel
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['PERMANENT_SESSION_LIFETIME'] = 1800  # 30 Minuten Session-Timeout

ADMIN_USERNAME = "nova1006"
ADMIN_PASSWORD = "A9jutk@100605"

def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user' not in session:
            return redirect('/login')
        return f(*args, **kwargs)
    return decorated_function

db = SqliteDatabase('kosten.db')

class BaseModel(Model):
    class Meta:
        database = db

class Kosten(BaseModel):
    bezeichnung = CharField()
    betrag = FloatField()
    zahlungstag = IntegerField()
    konto = CharField()
    bezahlt = BooleanField(default=False)
    position = IntegerField(default=0)

    class Meta:
        table_name = 'kosten'

@app.route('/login', methods=['GET', 'POST'])
def login():
    if 'user' in session:
        return redirect('/')
        
    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        
        if username == ADMIN_USERNAME and password == ADMIN_PASSWORD:
            session['user'] = username
            return redirect('/')
            
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.pop('user', None)
    return redirect('/login')

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

    if request.endpoint != 'login' and 'user' not in session:
        return redirect('/login')

    db.connect(reuse_if_open=True)

@app.after_request
def after_request(response):
    db.close()
    return response

@app.route('/api/kosten', methods=['GET'])
@login_required
def get_kosten():
    kosten = list(Kosten.select().order_by(Kosten.konto, Kosten.position, Kosten.zahlungstag))
    return jsonify([model_to_dict(k) for k in kosten])

@app.route('/api/kosten', methods=['POST'])
@login_required
def add_kosten():
    try:
        data = request.get_json()
        if not all(key in data for key in ['bezeichnung', 'betrag', 'zahlungstag', 'konto']):
            return jsonify({'success': False, 'error': 'Fehlende Felder'}), 400

        max_position = (Kosten
                       .select(fn.MAX(Kosten.position))
                       .where(Kosten.konto == data['konto'])
                       .scalar() or -1)

        kosten = Kosten.create(
            bezeichnung=data['bezeichnung'],
            betrag=float(data['betrag']),
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
        data = request.get_json()
        kosten = Kosten.get_or_none(Kosten.id == id)
        
        if not kosten:
            return jsonify({'success': False, 'error': 'Eintrag nicht gefunden'}), 404

        if 'bezahlt' in data:
            kosten.bezahlt = data['bezahlt']
        else:
            kosten.bezeichnung = data['bezeichnung']
            kosten.betrag = float(data['betrag'])
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
        kosten = Kosten.get_or_none(Kosten.id == id)
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
        data = request.get_json()
        with db.atomic():
            for item in data:
                Kosten.update(position=item['position']).where(Kosten.id == item['id']).execute()
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    db.connect()
    db.create_tables([Kosten])
    db.close()
    app.run(host='0.0.0.0', port=8000, debug=False)
