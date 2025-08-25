// Global Variables
let currentTab = 'upload';
let cameraStream = null;
let autoDetectInterval = null;
let isAutoDetecting = false;

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeTabs();
    initializeUpload();
    initializeCamera();
    initializeHistory();
    loadStats();
    
    // Auto-refresh stats every 30 seconds
    setInterval(loadStats, 30000);
});

// Tab Management
function initializeTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabName = button.dataset.tab;
            switchTab(tabName);
        });
    });
}

function switchTab(tabName) {
    // Update buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Update content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');
    
    currentTab = tabName;
    
    // Tab-specific initialization
    if (tabName === 'history') {
        loadHistory();
    } else if (tabName === 'analytics') {
        loadAnalytics();
    }
}

// Upload Functionality
function initializeUpload() {
    const uploadArea = document.getElementById('upload-area');
    const fileInput = document.getElementById('file-input');
    const imagePreview = document.getElementById('image-preview');
    const previewImg = document.getElementById('preview-img');
    const analyzeBtn = document.getElementById('analyze-btn');
    const clearBtn = document.getElementById('clear-btn');
    
    // Drag and drop
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileSelect(files[0]);
        }
    });
    
    // File input
    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFileSelect(e.target.files[0]);
        }
    });
    
    // Analyze button
    analyzeBtn.addEventListener('click', () => {
        analyzeImage();
    });
    
    // Clear button
    clearBtn.addEventListener('click', () => {
        clearPreview();
    });
}

function handleFileSelect(file) {
    if (!file.type.startsWith('image/')) {
        showNotification('Please select a valid image file', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
        document.getElementById('preview-img').src = e.target.result;
        document.getElementById('upload-area').style.display = 'none';
        document.getElementById('image-preview').style.display = 'block';
    };
    reader.readAsDataURL(file);
}

function clearPreview() {
    document.getElementById('upload-area').style.display = 'block';
    document.getElementById('image-preview').style.display = 'none';
    document.getElementById('results-section').style.display = 'none';
    document.getElementById('file-input').value = '';
}

async function analyzeImage() {
    const fileInput = document.getElementById('file-input');
    
    if (!fileInput.files.length) {
        showNotification('Please select an image first', 'error');
        return;
    }
    
    showLoading();
    
    const formData = new FormData();
    formData.append('image', fileInput.files[0]);
    
    try {
        const response = await fetch('/api/predict', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.error) {
            throw new Error(result.error);
        }
        
        displayResults(result);
        loadStats(); // Refresh stats
        
    } catch (error) {
        showNotification(`Analysis failed: ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
}

function displayResults(result) {
    // Show results section
    document.getElementById('results-section').style.display = 'block';
    
    // Update status
    const statusElement = document.getElementById('result-status');
    statusElement.textContent = result.is_accident ? 'ACCIDENT DETECTED' : 'NO ACCIDENT';
    statusElement.className = `result-status ${result.predicted_class.replace(' ', '-')}`;
    
    // Update confidence meter
    const confidence = Math.round(result.confidence * 100);
    document.getElementById('confidence-fill').style.width = `${confidence}%`;
    document.getElementById('confidence-value').textContent = `${confidence}%`;
    
    // Update details
    document.getElementById('classification').textContent = result.predicted_class.toUpperCase();
    document.getElementById('processing-time').textContent = `${Math.round(result.prediction_time * 1000)}ms`;
    document.getElementById('timestamp').textContent = new Date(result.timestamp).toLocaleString();
    
    // Update probability chart
    const accidentProb = Math.round((result.all_probabilities.accident || 0) * 100);
    const noAccidentProb = Math.round((result.all_probabilities.no_accident || 0) * 100);
    
    document.getElementById('accident-prob').style.width = `${accidentProb}%`;
    document.getElementById('accident-value').textContent = `${accidentProb}%`;
    document.getElementById('no-accident-prob').style.width = `${noAccidentProb}%`;
    document.getElementById('no-accident-value').textContent = `${noAccidentProb}%`;
    
    // Show notification
    const message = result.is_accident ? 'Accident detected in image!' : 'No accident detected';
    const type = result.is_accident ? 'warning' : 'success';
    showNotification(message, type);
}

// Camera Functionality
function initializeCamera() {
    const startBtn = document.getElementById('start-camera');
    const stopBtn = document.getElementById('stop-camera');
    const captureBtn = document.getElementById('capture-photo');
    const autoDetectToggle = document.getElementById('auto-detect');
    
    startBtn.addEventListener('click', startCamera);
    stopBtn.addEventListener('click', stopCamera);
    captureBtn.addEventListener('click', captureAndAnalyze);
    autoDetectToggle.addEventListener('change', toggleAutoDetect);
}

async function startCamera() {
    try {
        cameraStream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                width: { ideal: 1280 },
                height: { ideal: 720 }
            } 
        });
        
        const video = document.getElementById('camera-video');
        video.srcObject = cameraStream;
        
        document.getElementById('start-camera').style.display = 'none';
        document.getElementById('stop-camera').style.display = 'inline-flex';
        document.getElementById('capture-photo').disabled = false;
        
        showNotification('Camera started successfully', 'success');
        
    } catch (error) {
        showNotification('Failed to access camera', 'error');
        console.error('Camera error:', error);
    }
}

function stopCamera() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }
    
    if (autoDetectInterval) {
        clearInterval(autoDetectInterval);
        autoDetectInterval = null;
        isAutoDetecting = false;
    }
    
    document.getElementById('start-camera').style.display = 'inline-flex';
    document.getElementById('stop-camera').style.display = 'none';
    document.getElementById('capture-photo').disabled = true;
    document.getElementById('auto-detect').checked = false;
    document.getElementById('live-results').style.display = 'none';
    
    showNotification('Camera stopped', 'success');
}

function toggleAutoDetect() {
    const isEnabled = document.getElementById('auto-detect').checked;
    
    if (isEnabled && cameraStream) {
        startAutoDetection();
    } else {
        stopAutoDetection();
    }
}

function startAutoDetection() {
    if (isAutoDetecting) return;
    
    isAutoDetecting = true;
    document.getElementById('live-results').style.display = 'block';
    
    autoDetectInterval = setInterval(() => {
        captureAndAnalyzeAuto();
    }, 2000); // Analyze every 2 seconds
    
    showNotification('Auto detection started', 'success');
}

function stopAutoDetection() {
    if (autoDetectInterval) {
        clearInterval(autoDetectInterval);
        autoDetectInterval = null;
    }
    
    isAutoDetecting = false;
    document.getElementById('live-results').style.display = 'none';
}

async function captureAndAnalyze() {
    if (!cameraStream) {
        showNotification('Camera not started', 'error');
        return;
    }
    
    const canvas = document.getElementById('camera-canvas');
    const video = document.getElementById('camera-video');
    const ctx = canvas.getContext('2d');
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    
    showLoading();
    
    try {
        const imageData = canvas.toDataURL('image/jpeg');
        const response = await fetch('/api/predict_base64', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ image: imageData })
        });
        
        const result = await response.json();
        
        if (result.error) {
            throw new Error(result.error);
        }
        
        displayResults(result);
        loadStats();
        
    } catch (error) {
        showNotification(`Analysis failed: ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
}

async function captureAndAnalyzeAuto() {
    if (!cameraStream || !isAutoDetecting) return;
    
    const canvas = document.getElementById('camera-canvas');
    const video = document.getElementById('camera-video');
    const ctx = canvas.getContext('2d');
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    
    try {
        const imageData = canvas.toDataURL('image/jpeg');
        const response = await fetch('/api/predict_base64', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ image: imageData })
        });
        
        const result = await response.json();
        
        if (result.error) {
            console.error('Auto detection error:', result.error);
            return;
        }
        
        updateLiveResults(result);
        
    } catch (error) {
        console.error('Auto detection failed:', error);
    }
}

function updateLiveResults(result) {
    const indicator = document.getElementById('live-indicator');
    const classification = document.getElementById('live-classification');
    const confidence = document.getElementById('live-confidence');
    
    const confidencePercent = Math.round(result.confidence * 100);
    
    if (result.is_accident) {
        indicator.className = 'status-indicator accident';
        classification.textContent = 'ACCIDENT DETECTED!';
        document.getElementById('detection-status').innerHTML = '<i class="fas fa-exclamation-triangle"></i> ACCIDENT DETECTED!';
        document.getElementById('detection-status').style.background = 'rgba(220, 38, 38, 0.9)';
    } else {
        indicator.className = 'status-indicator';
        classification.textContent = 'No Accident';
        document.getElementById('detection-status').innerHTML = '<i class="fas fa-shield-alt"></i> Monitoring...';
        document.getElementById('detection-status').style.background = 'rgba(0, 0, 0, 0.7)';
    }
    
    confidence.textContent = `${confidencePercent}%`;
}

// History Functionality
function initializeHistory() {
    document.getElementById('refresh-history').addEventListener('click', loadHistory);
    document.getElementById('clear-history').addEventListener('click', clearHistory);
    document.getElementById('filter-type').addEventListener('change', filterHistory);
    document.getElementById('sort-order').addEventListener('change', filterHistory);
}

async function loadHistory() {
    try {
        const response = await fetch('/api/history');
        const history = await response.json();
        
        displayHistory(history);
        
    } catch (error) {
        showNotification('Failed to load history', 'error');
    }
}

function displayHistory(history) {
    const historyList = document.getElementById('history-list');
    
    if (history.length === 0) {
        historyList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-history"></i>
                <p>No detection history available</p>
            </div>
        `;
        return;
    }
    
    // Apply filters
    const filterType = document.getElementById('filter-type').value;
    const sortOrder = document.getElementById('sort-order').value;
    
    let filteredHistory = history;
    
    // Filter by type
    if (filterType !== 'all') {
        filteredHistory = history.filter(item => item.predicted_class === filterType);
    }
    
    // Sort
    switch (sortOrder) {
        case 'newest':
            filteredHistory.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            break;
        case 'oldest':
            filteredHistory.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            break;
        case 'confidence':
            filteredHistory.sort((a, b) => b.confidence - a.confidence);
            break;
    }
    
    const historyHTML = filteredHistory.map(item => `
        <div class="history-item">
            <div class="history-status ${item.predicted_class.replace(' ', '-')}"></div>
            <div class="history-details">
                <h4>${item.filename || 'Unknown'}</h4>
                <div class="history-meta">
                    ${item.predicted_class.toUpperCase()} • 
                    ${new Date(item.timestamp).toLocaleString()} • 
                    ${Math.round((item.prediction_time || 0) * 1000)}ms
                </div>
            </div>
            <div class="history-confidence">${Math.round(item.confidence * 100)}%</div>
        </div>
    `).join('');
    
    historyList.innerHTML = historyHTML;
}

function filterHistory() {
    loadHistory(); // Reload with current filters
}

async function clearHistory() {
    if (!confirm('Are you sure you want to clear all history?')) {
        return;
    }
    
    try {
        const response = await fetch('/api/clear_history', {
            method: 'POST'
        });
        
        if (response.ok) {
            loadHistory();
            loadStats();
            showNotification('History cleared successfully', 'success');
        } else {
            throw new Error('Failed to clear history');
        }
        
    } catch (error) {
        showNotification('Failed to clear history', 'error');
    }
}

// Analytics Functionality
async function loadAnalytics() {
    try {
        const [statsResponse, historyResponse] = await Promise.all([
            fetch('/api/stats'),
            fetch('/api/history')
        ]);
        
        const stats = await statsResponse.json();
        const history = await historyResponse.json();
        
        displayAnalytics(stats, history);
        
    } catch (error) {
        showNotification('Failed to load analytics', 'error');
    }
}

function displayAnalytics(stats, history) {
    // Update metric cards
    document.getElementById('total-incidents').textContent = stats.accidents_detected || 0;
    document.getElementById('safe-detections').textContent = stats.no_accidents || 0;
    document.getElementById('avg-confidence').textContent = `${Math.round((stats.average_confidence || 0) * 100)}%`;
    
    // Calculate average processing time
    const avgProcessing = history.length > 0 
        ? history.reduce((sum, item) => sum + (item.prediction_time || 0), 0) / history.length
        : 0;
    document.getElementById('avg-processing').textContent = `${Math.round(avgProcessing * 1000)}ms`;
    
    // Generate simple timeline
    generateTimeline(history);
    generateConfidenceDistribution(history);
}

function generateTimeline(history) {
    const timelineChart = document.getElementById('timeline-chart');
    
    if (history.length === 0) {
        timelineChart.innerHTML = `
            <div class="chart-placeholder">
                <i class="fas fa-chart-line"></i>
                <p>No data available for timeline</p>
            </div>
        `;
        return;
    }
    
    // Group by hour
    const hourlyData = {};
    history.forEach(item => {
        const hour = new Date(item.timestamp).getHours();
        if (!hourlyData[hour]) {
            hourlyData[hour] = { total: 0, accidents: 0 };
        }
        hourlyData[hour].total++;
        if (item.is_accident) {
            hourlyData[hour].accidents++;
        }
    });
    
    // Create simple bar chart
    const chartHTML = Object.entries(hourlyData)
        .sort(([a], [b]) => parseInt(a) - parseInt(b))
        .map(([hour, data]) => {
            const accidentRate = (data.accidents / data.total) * 100;
            return `
                <div style="display: flex; align-items: center; margin-bottom: 0.5rem;">
                    <span style="width: 60px; font-size: 0.875rem;">${hour}:00</span>
                    <div style="flex: 1; background: #f1f5f9; height: 20px; border-radius: 4px; overflow: hidden; margin: 0 0.5rem;">
                        <div style="width: ${(data.total / Math.max(...Object.values(hourlyData).map(d => d.total))) * 100}%; height: 100%; background: ${accidentRate > 0 ? '#dc2626' : '#059669'};"></div>
                    </div>
                    <span style="width: 40px; font-size: 0.875rem; text-align: right;">${data.total}</span>
                </div>
            `;
        }).join('');
    
    timelineChart.innerHTML = chartHTML || `
        <div class="chart-placeholder">
            <i class="fas fa-chart-line"></i>
            <p>No data available for timeline</p>
        </div>
    `;
}

function generateConfidenceDistribution(history) {
    const distributionChart = document.getElementById('confidence-distribution');
    
    if (history.length === 0) {
        distributionChart.innerHTML = `
            <div class="chart-placeholder">
                <i class="fas fa-chart-bar"></i>
                <p>No data available for distribution</p>
            </div>
        `;
        return;
    }
    
    // Group by confidence ranges
    const ranges = {
        '0-20%': 0,
        '21-40%': 0,
        '41-60%': 0,
        '61-80%': 0,
        '81-100%': 0
    };
    
    history.forEach(item => {
        const confidence = Math.round(item.confidence * 100);
        if (confidence <= 20) ranges['0-20%']++;
        else if (confidence <= 40) ranges['21-40%']++;
        else if (confidence <= 60) ranges['41-60%']++;
        else if (confidence <= 80) ranges['61-80%']++;
        else ranges['81-100%']++;
    });
    
    const maxCount = Math.max(...Object.values(ranges));
    
    const chartHTML = Object.entries(ranges).map(([range, count]) => `
        <div style="display: flex; align-items: center; margin-bottom: 0.5rem;">
            <span style="width: 80px; font-size: 0.875rem;">${range}</span>
            <div style="flex: 1; background: #f1f5f9; height: 20px; border-radius: 4px; overflow: hidden; margin: 0 0.5rem;">
                <div style="width: ${maxCount > 0 ? (count / maxCount) * 100 : 0}%; height: 100%; background: #2563eb;"></div>
            </div>
            <span style="width: 40px; font-size: 0.875rem; text-align: right;">${count}</span>
        </div>
    `).join('');
    
    distributionChart.innerHTML = chartHTML;
}

// Stats Loading
async function loadStats() {
    try {
        const response = await fetch('/api/stats');
        const stats = await response.json();
        
        document.getElementById('total-predictions').textContent = stats.total_predictions || 0;
        document.getElementById('accidents-detected').textContent = stats.accidents_detected || 0;
        document.getElementById('accuracy-rate').textContent = `${Math.round(stats.accident_rate || 0)}%`;
        
    } catch (error) {
        console.error('Failed to load stats:', error);
    }
}

// Utility Functions
function showLoading() {
    document.getElementById('loading-overlay').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loading-overlay').style.display = 'none';
}

function showNotification(message, type = 'success') {
    const container = document.getElementById('notification-container');
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.5rem;">
            <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-exclamation-triangle'}"></i>
            <span>${message}</span>
        </div>
    `;
    
    container.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 5000);
}

// Error handling for fetch requests
window.addEventListener('unhandledrejection', event => {
    console.error('Unhandled promise rejection:', event.reason);
    showNotification('An unexpected error occurred', 'error');
});
