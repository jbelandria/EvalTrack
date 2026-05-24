import sqlite3
from flask_login import UserMixin
from backend.database import get_db_connection

class User(UserMixin):
    def __init__(self, id, username, email):
        self.id = id
        self.username = username
        self.email = email

    @staticmethod
    def get(user_id):
        """Get user by ID"""
        conn = get_db_connection()
        user_data = conn.execute('SELECT * FROM users WHERE id = ?', (user_id,)).fetchone()
        conn.close()
        if user_data:
            return User(user_data['id'], user_data['username'], user_data['email'])
        return None

    @staticmethod
    def get_by_username(username):
        """Get user by username"""
        conn = get_db_connection()
        user_data = conn.execute('SELECT * FROM users WHERE username = ?', (username,)).fetchone()
        conn.close()
        if user_data:
            return User(user_data['id'], user_data['username'], user_data['email'])
        return None

    @staticmethod
    def get_by_email(email):
        """Get user by email"""
        conn = get_db_connection()
        user_data = conn.execute('SELECT * FROM users WHERE email = ?', (email,)).fetchone()
        conn.close()
        if user_data:
            return User(user_data['id'], user_data['username'], user_data['email'])
        return None

    @staticmethod
    def create(username, email, password_hash):
        """Create a new user"""
        conn = get_db_connection()
        try:
            conn.execute(
                'INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)',
                (username, email, password_hash)
            )
            conn.commit()
            user_id = conn.execute('SELECT last_insert_rowid()').fetchone()[0]
            conn.close()
            return User(user_id, username, email)
        except sqlite3.IntegrityError:
            conn.close()
            return None

    @staticmethod
    def verify_password(username, password):
        """Verify user password"""
        from werkzeug.security import check_password_hash
        conn = get_db_connection()
        user_data = conn.execute('SELECT * FROM users WHERE username = ?', (username,)).fetchone()
        conn.close()
        if user_data and check_password_hash(user_data['password_hash'], password):
            return User(user_data['id'], user_data['username'], user_data['email'])
        return None
