"""
Simple wrapper to import the Flask app from proxy.py
This ensures Render can find 'app:app' when it auto-detects the configuration
"""
from proxy import app

if __name__ == '__main__':
    app.run(debug=True)