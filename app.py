from flask import Flask, render_template, request, jsonify
from peewee import *
from datetime import datetime
from playhouse.shortcuts import model_to_dict

app = Flask(__name__)
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

@app.before_request
def before_request():
    db.connect(reuse_if_open=True)

@app.after_request
def after_request(response):
    db.close()
    return response

# Erstelle die Tabellen beim Start
db.connect()
db.create_tables([Kosten])
db.close()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/kosten', methods=['GET'])
def get_kosten():
    kosten = list(Kosten.select().order_by(Kosten.konto, Kosten.position, Kosten.zahlungstag))
    return jsonify([model_to_dict(k) for k in kosten])

@app.route('/api/kosten', methods=['POST'])
def add_kosten():
    try:
        data = request.get_json()
        if not all(key in data for key in ['bezeichnung', 'betrag', 'zahlungstag', 'konto']):
            return jsonify({'success': False, 'error': 'Fehlende Felder'}), 400

        # Get the maximum position for the given konto
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
    app.run(debug=True)
