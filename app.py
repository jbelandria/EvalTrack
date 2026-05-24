import os
from flask import Flask, render_template, request, jsonify, redirect, url_for, session
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from werkzeug.security import generate_password_hash
from backend.database import init_db, get_db_connection
from backend.models import User

app = Flask(__name__)
app.secret_key = os.getenv('SESSION_SECRET', 'dev-secret-key-change-in-production')

login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

@login_manager.user_loader
def load_user(user_id):
    return User.get(user_id)

@app.route('/')
def index():
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))
    return redirect(url_for('login'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))
    if request.method == 'POST':
        data = request.get_json()
        user = User.verify_password(data.get('username'), data.get('password'))
        if user:
            login_user(user)
            return jsonify({'success': True, 'message': 'Login exitoso'})
        return jsonify({'success': False, 'message': 'Usuario o contraseña incorrectos'}), 401
    return render_template('login.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if current_user.is_authenticated:
        return redirect(url_for('dashboard'))
    if request.method == 'POST':
        data = request.get_json()
        username = data.get('username')
        email = data.get('email')
        password = data.get('password')

        if User.get_by_username(username):
            return jsonify({'success': False, 'message': 'El usuario ya existe'}), 400
        if User.get_by_email(email):
            return jsonify({'success': False, 'message': 'El correo ya está registrado'}), 400

        user = User.create(username, email, generate_password_hash(password))
        if user:
            login_user(user)
            return jsonify({'success': True, 'message': 'Registro exitoso'})
        return jsonify({'success': False, 'message': 'Error al registrar'}), 400
    return render_template('register.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('login'))

@app.route('/dashboard')
@login_required
def dashboard():
    return render_template('dashboard.html', username=current_user.username)

@app.route('/agenda')
@login_required
def agenda():
    return render_template('agenda.html')

@app.route('/evaluations')
@login_required
def evaluations():
    return render_template('evaluations.html')

@app.route('/summary')
@login_required
def summary():
    return render_template('summary.html')

# --- API: Agenda ---

@app.route('/api/agenda', methods=['GET', 'POST'])
@login_required
def api_agenda():
    conn = get_db_connection()
    if request.method == 'POST':
        data = request.get_json()
        conn.execute(
            'INSERT INTO weekly_agenda (user_id, day_of_week, time_start, time_end, activity, subject) VALUES (?, ?, ?, ?, ?, ?)',
            (current_user.id, data['day_of_week'], data['time_start'], data['time_end'], data['activity'], data.get('subject', ''))
        )
        conn.commit()
        conn.close()
        return jsonify({'success': True, 'message': 'Actividad agregada'})

    activities = conn.execute(
        'SELECT * FROM weekly_agenda WHERE user_id = ? ORDER BY day_of_week, time_start',
        (current_user.id,)
    ).fetchall()
    conn.close()
    return jsonify([dict(a) for a in activities])

@app.route('/api/agenda/<int:activity_id>', methods=['PUT', 'DELETE'])
@login_required
def api_agenda_item(activity_id):
    conn = get_db_connection()
    if request.method == 'DELETE':
        conn.execute('DELETE FROM weekly_agenda WHERE id = ? AND user_id = ?', (activity_id, current_user.id))
        conn.commit()
        conn.close()
        return jsonify({'success': True, 'message': 'Actividad eliminada'})

    data = request.get_json()
    conn.execute(
        'UPDATE weekly_agenda SET day_of_week = ?, time_start = ?, time_end = ?, activity = ?, subject = ? WHERE id = ? AND user_id = ?',
        (data['day_of_week'], data['time_start'], data['time_end'], data['activity'], data.get('subject', ''), activity_id, current_user.id)
    )
    conn.commit()
    conn.close()
    return jsonify({'success': True, 'message': 'Actividad actualizada'})

# --- API: Materias ---

@app.route('/api/subjects', methods=['GET', 'POST'])
@login_required
def api_subjects():
    conn = get_db_connection()
    if request.method == 'POST':
        data = request.get_json()
        try:
            conn.execute('INSERT INTO subjects (user_id, name) VALUES (?, ?)', (current_user.id, data['name']))
            conn.commit()
            subject_id = conn.execute('SELECT last_insert_rowid()').fetchone()[0]
            conn.close()
            return jsonify({'success': True, 'message': 'Materia agregada', 'id': subject_id})
        except Exception:
            conn.close()
            return jsonify({'success': False, 'message': 'La materia ya existe'}), 400

    subjects = conn.execute('SELECT * FROM subjects WHERE user_id = ? ORDER BY name', (current_user.id,)).fetchall()
    conn.close()
    return jsonify([dict(s) for s in subjects])

# --- API: Evaluaciones ---

@app.route('/api/evaluations', methods=['GET', 'POST'])
@login_required
def api_evaluations():
    conn = get_db_connection()
    if request.method == 'POST':
        data = request.get_json()
        grade = float(data.get('grade', 0))
        weight = float(data.get('weight', 0))

        if grade < 1 or grade > 20:
            conn.close()
            return jsonify({'success': False, 'message': 'La nota debe estar entre 1 y 20'}), 400
        if weight < 0 or weight > 100:
            conn.close()
            return jsonify({'success': False, 'message': 'El peso debe estar entre 0 y 100'}), 400

        conn.execute(
            'INSERT INTO evaluations (user_id, subject_id, evaluation_type, grade, weight) VALUES (?, ?, ?, ?, ?)',
            (current_user.id, data['subject_id'], data['evaluation_type'], grade, weight)
        )
        conn.commit()
        conn.close()
        return jsonify({'success': True, 'message': 'Evaluación agregada'})

    evaluations = conn.execute('''
        SELECT e.*, s.name as subject_name
        FROM evaluations e
        JOIN subjects s ON e.subject_id = s.id
        WHERE e.user_id = ?
        ORDER BY e.date_completed DESC
    ''', (current_user.id,)).fetchall()
    conn.close()
    return jsonify([dict(e) for e in evaluations])

@app.route('/api/evaluations/<int:evaluation_id>', methods=['PUT', 'DELETE'])
@login_required
def api_evaluation_item(evaluation_id):
    conn = get_db_connection()
    if request.method == 'DELETE':
        conn.execute('DELETE FROM evaluations WHERE id = ? AND user_id = ?', (evaluation_id, current_user.id))
        conn.commit()
        conn.close()
        return jsonify({'success': True, 'message': 'Evaluación eliminada'})

    data = request.get_json()
    grade = float(data.get('grade', 0))
    weight = float(data.get('weight', 0))

    if grade < 1 or grade > 20:
        conn.close()
        return jsonify({'success': False, 'message': 'La nota debe estar entre 1 y 20'}), 400
    if weight < 0 or weight > 100:
        conn.close()
        return jsonify({'success': False, 'message': 'El peso debe estar entre 0 y 100'}), 400

    conn.execute(
        'UPDATE evaluations SET subject_id = ?, evaluation_type = ?, grade = ?, weight = ? WHERE id = ? AND user_id = ?',
        (data['subject_id'], data['evaluation_type'], grade, weight, evaluation_id, current_user.id)
    )
    conn.commit()
    conn.close()
    return jsonify({'success': True, 'message': 'Evaluación actualizada'})

# --- API: Resumen ---

@app.route('/api/summary')
@login_required
def api_summary():
    conn = get_db_connection()
    subjects = conn.execute('SELECT * FROM subjects WHERE user_id = ? ORDER BY name', (current_user.id,)).fetchall()

    summary = []
    for subject in subjects:
        evals = conn.execute(
            'SELECT grade, weight FROM evaluations WHERE user_id = ? AND subject_id = ?',
            (current_user.id, subject['id'])
        ).fetchall()

        if evals:
            total_weighted = sum(e['grade'] * e['weight'] for e in evals)
            total_weight = sum(e['weight'] for e in evals)
            final_grade = round(total_weighted / total_weight, 2) if total_weight > 0 else 0
            summary.append({
                'subject_id': subject['id'],
                'subject_name': subject['name'],
                'final_grade': final_grade,
                'total_evaluations': len(evals),
                'status': 'Aprobado' if final_grade >= 10 else 'Aplazado'
            })

    conn.close()
    return jsonify(summary)

if __name__ == '__main__':
    init_db()
    app.run(host='0.0.0.0', port=5000, debug=True)
