from flask import Flask, render_template, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///kosten.db'
db = SQLAlchemy(app)

class Kosten(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    bezeichnung = db.Column(db.String(100), nullable=False)
    betrag = db.Column(db.Float, nullable=False)
    zahlungstag = db.Column(db.Integer, nullable=False)
    konto = db.Column(db.String(100), nullable=False)
    bezahlt = db.Column(db.Boolean, default=False)
    position = db.Column(db.Integer, default=0)

with app.app_context():
    db.create_all()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/kosten', methods=['GET'])
def get_kosten():
    kosten = Kosten.query.order_by(Kosten.konto, Kosten.position, Kosten.zahlungstag).all()
    return jsonify([{
        'id': k.id,
        'bezeichnung': k.bezeichnung,
        'betrag': k.betrag,
        'zahlungstag': k.zahlungstag,
        'konto': k.konto,
        'bezahlt': k.bezahlt,
        'position': k.position
    } for k in kosten])

@app.route('/api/kosten', methods=['POST'])
def add_kosten():
    try:
        data = request.json
        if not all(key in data for key in ['bezeichnung', 'betrag', 'zahlungstag', 'konto']):
            return jsonify({'success': False, 'error': 'Fehlende Felder'}), 400
            
        # Get the maximum position for the given konto
        max_position = db.session.query(db.func.max(Kosten.position)).filter(Kosten.konto == data['konto']).scalar()
        if max_position is None:
            max_position = -1
            
        neue_kosten = Kosten(
            bezeichnung=data['bezeichnung'],
            betrag=float(data['betrag']),
            zahlungstag=int(data['zahlungstag']),
            konto=data['konto'],
            bezahlt=False,
            position=max_position + 1
        )
        db.session.add(neue_kosten)
        db.session.commit()
        return jsonify({'success': True, 'id': neue_kosten.id})
    except ValueError as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': 'Ungültige Werte: ' + str(e)}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/kosten/<int:id>', methods=['PUT'])
def update_kosten(id):
    kosten = Kosten.query.get_or_404(id)
    data = request.json
    if 'bezahlt' in data:
        kosten.bezahlt = data['bezahlt']
    else:
        kosten.bezeichnung = data['bezeichnung']
        kosten.betrag = float(data['betrag'])
        kosten.zahlungstag = int(data['zahlungstag'])
        kosten.konto = data['konto']
    db.session.commit()
    return jsonify({'success': True})

@app.route('/api/kosten/<int:id>', methods=['DELETE'])
def delete_kosten(id):
    kosten = Kosten.query.get_or_404(id)
    db.session.delete(kosten)
    db.session.commit()
    return jsonify({'success': True})

@app.route('/api/kosten/reorder', methods=['POST'])
def reorder_kosten():
    data = request.json
    try:
        for item in data:
            kosten = Kosten.query.get_or_404(item['id'])
            kosten.position = item['position']
        db.session.commit()
        return jsonify({'success': True})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)
