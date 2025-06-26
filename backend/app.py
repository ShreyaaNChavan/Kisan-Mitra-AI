# backend/app.py
from flask_cors import CORS
from flask import Flask, request, jsonify
import pickle
import numpy as np

from flask import Flask, request, jsonify, render_template, send_from_directory, redirect
import json
import uuid
import os
import joblib


import torch
from torchvision import transforms
from PIL import Image

app = Flask(__name__)
CORS(app)

# --- Load Models and Scalers ---
with open("models/model.pkl", "rb") as f:
    crop_model = pickle.load(f)

with open("models/minmaxscaler.pkl", "rb") as f:
    crop_scaler = pickle.load(f)

# Later you can add more models like:
# with open("models/yield_model.pkl", "rb") as f:
#     yield_model = pickle.load(f)

# --- Crop Recommendation API ---
@app.route("/predict_crop", methods=["POST"])
def predict_crop():
    try:
        data = request.json

        # Extract features from request
        features = np.array([[data["N"], data["P"], data["K"],
                              data["temperature"], data["humidity"],
                              data["ph"], data["rainfall"]]])

        # Scale input
        scaled = crop_scaler.transform(features)

        # Predict numeric label
        prediction = crop_model.predict(scaled)

        # Mapping numeric label to actual crop name
        crop_mapping = {
            0: "apple", 1: "banana", 2: "blackgram", 3: "chickpea", 4: "coconut",
            5: "coffee", 6: "cotton", 7: "grapes", 8: "jute", 9: "kidneybeans",
            10: "lentil", 11: "maize", 12: "mango", 13: "mothbeans", 14: "mungbean",
            15: "muskmelon", 16: "orange", 17: "papaya", 18: "pigeonpeas", 19: "pomegranate",
            20: "rice", 21: "watermelon", 22: "wheat"
        }

        crop_index = prediction[0]
        crop_name = crop_mapping.get(crop_index, "Unknown")

        return jsonify({"recommended_crop": crop_name})

    except Exception as e:
        return jsonify({"error": str(e)}), 400


# --- Future API: Yield Prediction ---
# @app.route("/predict_yield", methods=["POST"])
# def predict_yield():
#     # Load & use yield model here
#     return jsonify({"predicted_yield": "Coming soon"})
# --- Load Yield Model ---

import joblib  # Add this import at the top if not already present
yield_model = joblib.load("models/crop_yield_model.pkl")
# --- Yield Prediction API ---
@app.route("/predict_yield", methods=["POST"])
def predict_yield():
    try:
        data = request.json

        features = np.array([[data["rainfall_mm"],
                              data["soil_quality_index"],
                              data["farm_size_hectares"],
                              data["sunlight_hours"],
                              data["fertilizer_kg"]]])

        prediction = yield_model.predict(features)
        return jsonify({"predicted_yield": round(prediction[0], 2)})

    except Exception as e:
        return jsonify({"error": str(e)}), 400


# --- Future API: Crop Disease Detection ---
# @app.route("/detect_disease", methods=["POST"])
# def detect_disease():
#     return jsonify({"disease": "Coming soon"})
# ---------------- Plant Disease Detection ----------------


from torchvision import models
import torch.nn as nn

# Define the model architecture
disease_model = models.resnet18(weights=None)
disease_model.fc = nn.Linear(disease_model.fc.in_features, 21)  # 21 classes
disease_model.load_state_dict(torch.load("models/plant_disease_resnet18.pth", map_location=torch.device('cpu')))
disease_model.eval()


# === STEP 3: Define Class Index to Name Mapping ===
disease_classes = {
    0: 'Apple___Apple_scab',
    1: 'Apple___Black_rot',
    2: 'Apple___Cedar_apple_rust',
    3: 'Apple___healthy',
    4: 'Corn_(maize)___Cercospora_leaf_spot',
    5: 'Corn_(maize)___Common_rust',
    6: 'Corn_(maize)___Northern_Leaf_Blight',
    7: 'Corn_(maize)___healthy',
    8: 'Potato___Early_blight',
    9: 'Potato___Late_blight',
    10: 'Potato___healthy',
    11: 'Tomato___Bacterial_spot',
    12: 'Tomato___Early_blight',
    13: 'Tomato___Late_blight',
    14: 'Tomato___Leaf_Mold',
    15: 'Tomato___Septoria_leaf_spot',
    16: 'Tomato___Spider_mites',
    17: 'Tomato___Target_Spot',
    18: 'Tomato___Tomato_Yellow_Leaf_Curl_Virus',
    19: 'Tomato___Tomato_mosaic_virus',
    20: 'Tomato___healthy'
}


# === STEP 4: Define Image Transformations ===
transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406],
                         std=[0.229, 0.224, 0.225])
])

# === STEP 5: Define Disease Prediction Endpoint ===
@app.route("/detect_disease", methods=["POST"])
def detect_disease():
    try:
        if 'image' not in request.files:
            return jsonify({"error": "No image uploaded"}), 400

        file = request.files['image']
        image = Image.open(file.stream).convert("RGB")
        input_tensor = transform(image).unsqueeze(0)

        with torch.no_grad():
            outputs = disease_model(input_tensor)
            _, predicted = torch.max(outputs, 1)
            class_id = predicted.item()

        disease = disease_classes.get(class_id, "Unknown")
        return jsonify({"disease": disease})

    except Exception as e:
        return jsonify({"error": str(e)}), 500




with open("plant_disease.json", "r") as f:
    treatment_data = json.load(f)

# Convert list to dictionary for fast lookup
treatment_lookup = {entry["name"]: entry for entry in treatment_data}
@app.route("/suggest_treatment", methods=["POST"])
def suggest_treatment():
    try:
        data = request.json
        disease = data.get("disease")

        info = treatment_lookup.get(disease)

        if not info:
            return jsonify({"error": f"No data found for disease '{disease}'"}), 404

        return jsonify({
            "disease": disease,
            "cause": info.get("cause", "Not available"),
            "cure": info.get("cure", "Not available")
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True)
