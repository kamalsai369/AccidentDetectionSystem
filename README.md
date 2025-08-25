# Accident Detection Web Application

A comprehensive web-based accident detection system that uses machine learning to analyze images and detect accidents in real-time.

## Features

### 🖼️ Image Upload & Analysis
- Drag and drop image upload
- Instant accident detection with confidence scoring
- Detailed results with probability distribution
- Processing time metrics

### 📹 Live Camera Detection
- Real-time webcam monitoring
- Auto-detection mode with configurable intervals
- Live status indicators and alerts
- Capture and analyze functionality

### 📊 Detection History
- Complete history of all detections
- Filter by accident/no-accident
- Sort by date or confidence level
- Bulk history management

### 📈 Analytics Dashboard
- Real-time statistics
- Detection timeline visualization
- Confidence distribution charts
- Performance metrics

## Installation

1. **Install Dependencies**
```bash
pip install -r requirements.txt
```

2. **Ensure Model File**
Make sure your trained model `final_accident_detection_model.h5` is in the project directory.

3. **Run the Application**
```bash
python app.py
```

4. **Access the Web Interface**
Open your browser and navigate to: `http://localhost:5000`

## Project Structure

```
accident-detection/
│
├── app.py                 # Flask backend server
├── requirements.txt       # Python dependencies
├── final_accident_detection_model.h5  # Trained ML model
│
├── templates/
│   └── index.html        # Main web interface
│
├── static/
│   ├── style.css         # Styling and responsive design
│   └── script.js         # Frontend JavaScript functionality
│
└── AccidentDetection.ipynb  # Original Jupyter notebook
```

## Usage Guide

### Image Upload
1. Navigate to the "Image Upload" tab
2. Drag and drop an image or click "Choose File"
3. Click "Analyze Image" to get results
4. View confidence scores and probability distribution

### Live Camera
1. Click "Start Camera" to begin webcam access
2. Use "Capture & Analyze" for single frame analysis
3. Enable "Auto Detection" for continuous monitoring
4. Monitor live results in real-time

### History & Analytics
1. View all previous detections in the "Detection History" tab
2. Filter and sort results as needed
3. Check overall statistics in the "Analytics" tab
4. Monitor system performance and accuracy

## API Endpoints

- `POST /api/predict` - Upload image for analysis
- `POST /api/predict_base64` - Analyze base64 encoded image
- `GET /api/history` - Retrieve detection history
- `GET /api/stats` - Get system statistics
- `POST /api/clear_history` - Clear detection history

## Technical Features

### Frontend
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Real-time Updates**: Live camera feed with auto-detection
- **Interactive Charts**: Visual analytics and statistics
- **Progressive Enhancement**: Graceful degradation for older browsers

### Backend
- **Flask API**: RESTful endpoints for all functionality
- **TensorFlow Integration**: Seamless model inference
- **Image Processing**: Support for multiple image formats
- **CORS Enabled**: Cross-origin resource sharing support

### Security & Performance
- **Input Validation**: Comprehensive file type and size checking
- **Error Handling**: Robust error management and user feedback
- **Optimized Processing**: Efficient image preprocessing pipeline
- **Memory Management**: Proper resource cleanup and management

## Browser Compatibility

- Chrome 60+
- Firefox 55+
- Safari 11+
- Edge 79+

## Performance Notes

- **Image Processing**: ~100-500ms per image depending on size
- **Model Inference**: ~50-200ms depending on hardware
- **Memory Usage**: ~200-500MB RAM during operation
- **Camera Resolution**: Supports up to 1280x720 for optimal performance

## Troubleshooting

### Camera Issues
- Ensure camera permissions are granted
- Check if other applications are using the camera
- Try refreshing the page and restarting camera

### Model Loading Issues
- Verify `final_accident_detection_model.h5` exists
- Check file permissions
- Ensure TensorFlow compatibility

### Performance Issues
- Reduce auto-detection frequency
- Use smaller image sizes
- Close other resource-intensive applications

## Development

To extend or modify the application:

1. **Backend Changes**: Modify `app.py` for new API endpoints
2. **Frontend Updates**: Update `templates/index.html`, `static/style.css`, or `static/script.js`
3. **Model Updates**: Replace the model file and update class names if needed

## License

This project is for educational and demonstration purposes.
