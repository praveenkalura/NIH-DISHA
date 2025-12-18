"""
Flask server for IPA Stats calculations
Provides API endpoints for adequacy and productivity calculations
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import tempfile
from werkzeug.utils import secure_filename
import json

from adequacy_calculation import compute_adequacy_from_csv
from productivity_calculation import compute_productivity_from_csv
from equity import compute_equity_from_csv
from cropping_intensity import compute_cropping_intensity_from_csv
from irrigation_utilization import compute_irrigation_utilization_from_csv

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Configure upload folder
UPLOAD_FOLDER = tempfile.gettempdir()
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

ALLOWED_EXTENSIONS = {'csv'}


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def convert_to_serializable(obj):
    """Convert numpy/pandas types to JSON serializable types"""
    if isinstance(obj, dict):
        return {k: convert_to_serializable(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [convert_to_serializable(item) for item in obj]
    elif hasattr(obj, 'item'):  # numpy types
        return obj.item()
    elif obj is None or isinstance(obj, (str, int, float, bool)):
        return obj
    else:
        return str(obj)


@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'ok', 'message': 'Python backend is running'})


@app.route('/api/adequacy', methods=['POST'])
def calculate_adequacy():
    """Calculate adequacy from uploaded CSV file"""
    try:
        # Check if file is present
        if 'file' not in request.files:
            # Try to use default file
            default_path = os.path.join(os.path.dirname(__file__), '..', 'public', 'data', 'Data_perSeason_perCrop.csv')
            if os.path.exists(default_path):
                result = compute_adequacy_from_csv(default_path)
                return jsonify(convert_to_serializable(result))
            else:
                return jsonify({'error': 'No file provided and default file not found'}), 400
        
        file = request.files['file']
        
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({'error': 'File type not allowed. Only CSV files are accepted'}), 400
        
        # Save file temporarily
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        # Compute adequacy
        result = compute_adequacy_from_csv(filepath)
        
        # Clean up temporary file
        os.remove(filepath)
        
        # Convert result to JSON serializable format
        return jsonify(convert_to_serializable(result))
    
    except Exception as e:
        import traceback
        return jsonify({
            'error': str(e),
            'traceback': traceback.format_exc()
        }), 500


@app.route('/api/productivity', methods=['POST'])
def calculate_productivity():
    """Calculate productivity from uploaded CSV file"""
    try:
        print("[PRODUCTIVITY] Request received")  # Debug log
        
        # Check if file is present
        if 'file' not in request.files:
            # Try to use default file
            default_path = os.path.join(os.path.dirname(__file__), '..', 'public', 'data', 'stats_IndiaSchemes_perCrop_Ong.csv')
            print(f"[PRODUCTIVITY] No file uploaded, using default: {default_path}")  # Debug log
            if os.path.exists(default_path):
                result = compute_productivity_from_csv(default_path)
                print(f"[PRODUCTIVITY] Calculation successful")
                return jsonify(convert_to_serializable(result))
            else:
                print(f"[PRODUCTIVITY] Default file not found at {default_path}")  # Debug log
                return jsonify({'error': 'No file provided and default file not found'}), 400
        
        file = request.files['file']
        print(f"[PRODUCTIVITY] File received: {file.filename}")  # Debug log
        
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({'error': 'File type not allowed. Only CSV files are accepted'}), 400
        
        # Save file temporarily
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        print(f"[PRODUCTIVITY] File saved to: {filepath}")  # Debug log
        
        # Compute productivity
        print(f"[PRODUCTIVITY] Starting calculation...")  # Debug log
        result = compute_productivity_from_csv(filepath)
        print(f"[PRODUCTIVITY] Calculation complete")  # Debug log
        
        # Clean up temporary file
        os.remove(filepath)
        
        # Convert result to JSON serializable format
        serializable_result = convert_to_serializable(result)
        print(f"[PRODUCTIVITY] Returning result with {len(result.get('summary', []))} summary rows")  # Debug log
        return jsonify(serializable_result)
    
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"[PRODUCTIVITY ERROR] {error_trace}")  # Debug log
        return jsonify({
            'error': str(e),
            'traceback': error_trace
        }), 500


@app.route('/api/equity', methods=['POST'])
def calculate_equity():
    """Calculate equity from uploaded CSV file"""
    try:
        print("[EQUITY] Request received")  # Debug log
        
        # Get crop_id from request if provided
        crop_id = request.form.get('crop_id', type=int)
        
        # Check if file is present
        if 'file' not in request.files:
            # Try to use default file
            default_path = os.path.join(os.path.dirname(__file__), '..', 'public', 'data', 'Data_perSeason_perCrop.csv')
            print(f"[EQUITY] No file uploaded, using default: {default_path}")  # Debug log
            if os.path.exists(default_path):
                result = compute_equity_from_csv(default_path, crop_id)
                print(f"[EQUITY] Calculation successful")
                return jsonify(convert_to_serializable(result))
            else:
                print(f"[EQUITY] Default file not found at {default_path}")  # Debug log
                return jsonify({'error': 'No file provided and default file not found'}), 400
        
        file = request.files['file']
        print(f"[EQUITY] File received: {file.filename}")  # Debug log
        
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({'error': 'File type not allowed. Only CSV files are accepted'}), 400
        
        # Save file temporarily
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        print(f"[EQUITY] File saved to: {filepath}")  # Debug log
        
        # Compute equity
        print(f"[EQUITY] Starting calculation...")  # Debug log
        result = compute_equity_from_csv(filepath, crop_id)
        print(f"[EQUITY] Calculation complete")  # Debug log
        
        # Clean up temporary file
        os.remove(filepath)
        
        # Convert result to JSON serializable format
        serializable_result = convert_to_serializable(result)
        print(f"[EQUITY] Returning result with {len(result.get('summary', []))} summary rows")  # Debug log
        return jsonify(serializable_result)
    
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"[EQUITY ERROR] {error_trace}")  # Debug log
        return jsonify({
            'error': str(e),
            'traceback': error_trace
        }), 500


@app.route('/api/cropping-intensity', methods=['POST'])
def calculate_cropping_intensity():
    """Calculate cropping intensity from uploaded CSV file"""
    try:
        print("[CROPPING_INTENSITY] Request received")  # Debug log
        
        # Get CCA from request
        cca = request.form.get('cca', type=float)
        if not cca or cca <= 0:
            return jsonify({'error': 'Valid CCA (Culturable Command Area) is required'}), 400
        
        # Check if file is present
        if 'file' not in request.files:
            # Try to use default file
            default_path = os.path.join(os.path.dirname(__file__), '..', 'public', 'data', 'Data_perSeason_perCrop.csv')
            print(f"[CROPPING_INTENSITY] No file uploaded, using default: {default_path}")  # Debug log
            if os.path.exists(default_path):
                result = compute_cropping_intensity_from_csv(default_path, cca)
                print(f"[CROPPING_INTENSITY] Calculation successful")
                return jsonify(convert_to_serializable(result))
            else:
                print(f"[CROPPING_INTENSITY] Default file not found at {default_path}")  # Debug log
                return jsonify({'error': 'No file provided and default file not found'}), 400
        
        file = request.files['file']
        print(f"[CROPPING_INTENSITY] File received: {file.filename}")  # Debug log
        
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({'error': 'File type not allowed. Only CSV files are accepted'}), 400
        
        # Save file temporarily
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        print(f"[CROPPING_INTENSITY] File saved to: {filepath}")  # Debug log
        
        # Compute cropping intensity
        print(f"[CROPPING_INTENSITY] Starting calculation with CCA={cca}...")  # Debug log
        result = compute_cropping_intensity_from_csv(filepath, cca)
        print(f"[CROPPING_INTENSITY] Calculation complete")  # Debug log
        
        # Clean up temporary file
        os.remove(filepath)
        
        # Convert result to JSON serializable format
        return jsonify(convert_to_serializable(result))
    
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"[CROPPING_INTENSITY ERROR] {error_trace}")  # Debug log
        return jsonify({
            'error': str(e),
            'traceback': error_trace
        }), 500


@app.route('/api/irrigation-utilization', methods=['POST'])
def calculate_irrigation_utilization():
    """Calculate irrigation utilization from uploaded CSV file"""
    try:
        print("[IRRIGATION_UTILIZATION] Request received")  # Debug log
        
        # Get CCA from request
        cca = request.form.get('cca', type=float)
        if not cca or cca <= 0:
            return jsonify({'error': 'Valid CCA (Culturable Command Area) is required'}), 400
        
        # Check if file is present
        if 'file' not in request.files:
            # Try to use default file
            default_path = os.path.join(os.path.dirname(__file__), '..', 'public', 'data', 'Data_perSeason_perCrop.csv')
            print(f"[IRRIGATION_UTILIZATION] No file uploaded, using default: {default_path}")  # Debug log
            if os.path.exists(default_path):
                result = compute_irrigation_utilization_from_csv(default_path, cca)
                print(f"[IRRIGATION_UTILIZATION] Calculation successful")
                return jsonify(convert_to_serializable(result))
            else:
                print(f"[IRRIGATION_UTILIZATION] Default file not found at {default_path}")  # Debug log
                return jsonify({'error': 'No file provided and default file not found'}), 400
        
        file = request.files['file']
        print(f"[IRRIGATION_UTILIZATION] File received: {file.filename}")  # Debug log
        
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not allowed_file(file.filename):
            return jsonify({'error': 'File type not allowed. Only CSV files are accepted'}), 400
        
        # Save file temporarily
        filename = secure_filename(file.filename)
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        print(f"[IRRIGATION_UTILIZATION] File saved to: {filepath}")  # Debug log
        
        # Compute irrigation utilization
        print(f"[IRRIGATION_UTILIZATION] Starting calculation with CCA={cca}...")  # Debug log
        result = compute_irrigation_utilization_from_csv(filepath, cca)
        print(f"[IRRIGATION_UTILIZATION] Calculation complete")  # Debug log
        
        # Clean up temporary file
        os.remove(filepath)
        
        # Convert result to JSON serializable format
        return jsonify(convert_to_serializable(result))
    
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"[IRRIGATION_UTILIZATION ERROR] {error_trace}")  # Debug log
        return jsonify({
            'error': str(e),
            'traceback': error_trace
        }), 500


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f"Starting Python backend server on port {port}")
    print("Available endpoints:")
    print(f"  - GET  http://localhost:{port}/api/health")
    print(f"  - POST http://localhost:{port}/api/adequacy")
    print(f"  - POST http://localhost:{port}/api/productivity")
    print(f"  - POST http://localhost:{port}/api/equity")
    print(f"  - POST http://localhost:{port}/api/cropping-intensity")
    print(f"  - POST http://localhost:{port}/api/irrigation-utilization")
    app.run(debug=True, port=port, host='0.0.0.0')
