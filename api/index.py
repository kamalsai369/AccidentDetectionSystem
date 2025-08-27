# Vercel-compatible Flask Application for Accident Detection System
from flask import Flask, request, jsonify, render_template, send_from_directory
from flask_cors import CORS
import os
import base64
import io
import json
from datetime import datetime
import time
import tempfile
import urllib.request

# Note: TensorFlow and heavy ML libraries may not work well on Vercel
# This is a lightweight version for demonstration
# For production ML inference, consider using external ML API services

app = Flask(__name__, 
            template_folder='../templates',
            static_folder='../static')
CORS(app)

# Global variables for storing predictions (in production, use a database)
predictions_history = []

class MockAccidentDetector:
    """
    Mock detector for Vercel deployment since TensorFlow is too heavy
    In production, replace this with calls to external ML APIs
    """
    def __init__(self):
        self.class_names = ['accident', 'no_accident']
        
    def predict_image(self, image_data):
        """Mock prediction - replace with actual ML API call"""
        # Simulate ML inference delay
        time.sleep(0.1)
        
        # Mock prediction based on image characteristics
        # In production, this would call your ML model API
        import random
        
        # Simulate realistic predictions
        is_accident = random.choice([True, False, False, False])  # 25% accident rate
        
        if is_accident:
            accident_confidence = random.uniform(0.7, 0.95)
            no_accident_confidence = 1 - accident_confidence
        else:
            no_accident_confidence = random.uniform(0.7, 0.95)
            accident_confidence = 1 - no_accident_confidence
            
        predicted_class = 'accident' if is_accident else 'no_accident'
        confidence = accident_confidence if is_accident else no_accident_confidence
        
        result = {
            'predicted_class': predicted_class,
            'confidence': confidence,
            'is_accident': is_accident and confidence >= 0.7,
            'prediction_time': 0.1,
            'timestamp': datetime.now().isoformat(),
            'all_probabilities': {
                'accident': accident_confidence,
                'no_accident': no_accident_confidence
            }
        }
        
        return result

# Initialize the mock detector
detector = MockAccidentDetector()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/predict', methods=['POST'])
def predict():
    try:
        if 'image' not in request.files:
            return jsonify({'error': 'No image provided'}), 400
        
        file = request.files['image']
        if file.filename == '':
            return jsonify({'error': 'No image selected'}), 400
        
        # Read image (basic validation)
        image_bytes = file.read()
        if len(image_bytes) == 0:
            return jsonify({'error': 'Empty image file'}), 400
        
        # Mock prediction
        result = detector.predict_image(image_bytes)
        
        # Add to history
        result['filename'] = file.filename
        predictions_history.append(result)
        
        # Keep only last 50 predictions
        if len(predictions_history) > 50:
            predictions_history.pop(0)
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/predict_base64', methods=['POST'])
def predict_base64():
    try:
        data = request.get_json()
        
        if 'image' not in data:
            return jsonify({'error': 'No image data provided'}), 400
        
        # Decode base64 image
        try:
            image_data = data['image'].split(',')[1]  # Remove data:image/jpeg;base64,
            image_bytes = base64.b64decode(image_data)
        except:
            return jsonify({'error': 'Invalid base64 image data'}), 400
        
        # Mock prediction
        result = detector.predict_image(image_bytes)
        
        # Add to history
        result['filename'] = 'webcam_capture'
        predictions_history.append(result)
        
        # Keep only last 50 predictions
        if len(predictions_history) > 50:
            predictions_history.pop(0)
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/history')
def get_history():
    return jsonify(predictions_history)

@app.route('/api/stats')
def get_stats():
    if not predictions_history:
        return jsonify({
            'total_predictions': 0,
            'accidents_detected': 0,
            'average_confidence': 0,
            'accident_rate': 0
        })
    
    total = len(predictions_history)
    accidents = sum(1 for p in predictions_history if p.get('is_accident', False))
    avg_confidence = sum(p.get('confidence', 0) for p in predictions_history) / total
    
    return jsonify({
        'total_predictions': total,
        'accidents_detected': accidents,
        'no_accidents': total - accidents,
        'average_confidence': avg_confidence,
        'accident_rate': (accidents / total) * 100 if total > 0 else 0
    })

@app.route('/api/clear_history', methods=['POST'])
def clear_history():
    global predictions_history
    predictions_history = []
    return jsonify({'message': 'History cleared successfully'})

@app.route('/static/<path:filename>')
def static_files(filename):
    return send_from_directory('../static', filename)

# Vercel serverless function handler
def handler(request, context):
    return app(request.environ, lambda status, headers: None)

# For local development
if __name__ == '__main__':
    app.run(debug=True)
