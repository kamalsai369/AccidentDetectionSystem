# Flask Backend for Accident Detection System
from flask import Flask, request, jsonify, render_template, send_from_directory
from flask_cors import CORS
import tensorflow as tf
from tensorflow import keras
import numpy as np
import cv2
import os
import base64
import io
from PIL import Image
import json
from datetime import datetime
import threading
import time

app = Flask(__name__)
CORS(app)

class AccidentDetectionAPI:
    def __init__(self, model_path, img_size=(224, 224), confidence_threshold=0.7):
        self.model_path = model_path
        self.img_size = img_size
        self.confidence_threshold = confidence_threshold
        self.class_names = ['accident', 'no_accident']
        
        # Load model
        try:
            self.model = keras.models.load_model(model_path)
            print(f"✓ Model loaded successfully")
        except Exception as e:
            print(f"❌ Error loading model: {e}")
            self.model = None
    
    def preprocess_image(self, image):
        """Preprocess image for prediction"""
        try:
            # Resize image
            image = cv2.resize(image, self.img_size)
            # Normalize
            image = image.astype('float32') / 255.0
            # Add batch dimension
            image = np.expand_dims(image, axis=0)
            return image
        except Exception as e:
            raise Exception(f"Error preprocessing image: {e}")
    
    def predict_image(self, image):
        """Predict accident from image"""
        if self.model is None:
            return {"error": "Model not loaded"}
        
        try:
            # Preprocess
            processed_image = self.preprocess_image(image)
            
            # Predict
            start_time = time.time()
            predictions = self.model.predict(processed_image, verbose=0)
            prediction_time = time.time() - start_time
            
            # Get results
            predicted_class_idx = np.argmax(predictions[0])
            confidence = float(predictions[0][predicted_class_idx])
            predicted_class = self.class_names[predicted_class_idx]
            
            result = {
                'predicted_class': predicted_class,
                'confidence': confidence,
                'is_accident': predicted_class == 'accident' and confidence >= self.confidence_threshold,
                'prediction_time': prediction_time,
                'timestamp': datetime.now().isoformat(),
                'all_probabilities': {
                    self.class_names[i]: float(predictions[0][i])
                    for i in range(len(self.class_names))
                }
            }
            
            return result
            
        except Exception as e:
            return {"error": f"Prediction failed: {str(e)}"}

# Initialize the detector
detector = AccidentDetectionAPI('final_accident_detection_model.h5')

# Store predictions history
predictions_history = []

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
        
        # Read image
        image_bytes = file.read()
        image = Image.open(io.BytesIO(image_bytes))
        image = np.array(image)
        
        # Convert to RGB if necessary
        if len(image.shape) == 3:
            image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)
        
        # Make prediction
        result = detector.predict_image(image)
        
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
        image_data = data['image'].split(',')[1]  # Remove data:image/jpeg;base64,
        image_bytes = base64.b64decode(image_data)
        image = Image.open(io.BytesIO(image_bytes))
        image = np.array(image)
        
        # Convert to RGB if necessary
        if len(image.shape) == 3:
            image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)
        
        # Make prediction
        result = detector.predict_image(image)
        
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
            'accuracy_rate': 0
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

if __name__ == '__main__':
    # Create templates directory if it doesn't exist
    os.makedirs('templates', exist_ok=True)
    os.makedirs('static', exist_ok=True)
    
    print("🚀 Starting Accident Detection API Server...")
    print("📱 Access the web interface at: http://localhost:5000")
    app.run(debug=True, host='0.0.0.0', port=5000)
