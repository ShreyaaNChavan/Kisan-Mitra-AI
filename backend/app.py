# backend/app.py

from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import json
import numpy as np
import pickle
import joblib

from PIL import Image
import torch
from torchvision import transforms, models
import torch.nn as nn

# ---------------- BASIC SETUP ----------------
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

app = Flask(__name__)
CORS(app)

# ---------------- LOAD LIGHT MODELS (SAFE) ----------------

with open(os.path.join(BASE_DIR, "models", "model.pkl"), "rb") as f:
    crop_model = pickle.load(f)

with open(os.path.join(BASE_DIR, "models", "minmaxscaler.pkl"), "rb") as f:
    crop_scaler = pickle.load(f)

yield_model = joblib.load(os.path.join(BASE_DIR, "models", "crop_yield_model.pkl"))

# ---------------- LAZY LOAD HEAVY MODEL ----------------

disease_model = None

def load_disease_model():
    global disease_model
    if disease_model is None:
        try:
            model = models.resnet18(weights=None)
            model.fc = nn.Linear(model.fc.in_features, 21)

            model.load_state_dict(
                torch.load(
                    os.path.join(BASE_DIR, "models", "plant_disease_resnet18.pth"),
                    map_location=torch.device("cpu")
                )
            )

            model.eval()
            disease_model = model
            print("Disease model loaded successfully")

        except Exception as e:
            print("Error loading disease model:", e)

# ---------------- TRANSFORM ----------------

transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406],
                         std=[0.229, 0.224, 0.225])
])

# ---------------- CROP PREDICTION ----------------

@app.route("/predict_crop", methods=["POST"])
def predict_crop():
    try:
        data = request.json

        features = np.array([[data["N"], data["P"], data["K"],
                              data["temperature"], data["humidity"],
                              data["ph"], data["rainfall"]]])

        scaled = crop_scaler.transform(features)
        prediction = crop_model.predict(scaled)

        crop_mapping = {
            0: "apple", 1: "banana", 2: "blackgram", 3: "chickpea", 4: "coconut",
            5: "coffee", 6: "cotton", 7: "grapes", 8: "jute", 9: "kidneybeans",
            10: "lentil", 11: "maize", 12: "mango", 13: "mothbeans", 14: "mungbean",
            15: "muskmelon", 16: "orange", 17: "papaya", 18: "pigeonpeas", 19: "pomegranate",
            20: "rice", 21: "watermelon", 22: "wheat"
        }

        return jsonify({
            "recommended_crop": crop_mapping.get(prediction[0], "Unknown")
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 400


# ---------------- YIELD PREDICTION ----------------

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


# ---------------- DISEASE CLASSES ----------------

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

# ---------------- DISEASE PREDICTION ----------------

@app.route("/detect_disease", methods=["POST"])
def detect_disease():
    try:
        load_disease_model()  # lazy load

        if disease_model is None:
            return jsonify({"error": "Model not available"}), 500

        if 'image' not in request.files:
            return jsonify({"error": "No image uploaded"}), 400

        file = request.files['image']
        image = Image.open(file.stream).convert("RGB")
        input_tensor = transform(image).unsqueeze(0)

        with torch.no_grad():
            outputs = disease_model(input_tensor)
            _, predicted = torch.max(outputs, 1)

        disease = disease_classes.get(predicted.item(), "Unknown")

        return jsonify({"disease": disease})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ---------------- TREATMENT ----------------

with open(os.path.join(BASE_DIR, "plant_disease.json"), "r") as f:
    treatment_data = json.load(f)

treatment_lookup = {entry["name"]: entry for entry in treatment_data}

@app.route("/suggest_treatment", methods=["POST"])
def suggest_treatment():
    try:
        disease = request.json.get("disease")

        info = treatment_lookup.get(disease)

        if not info:
            return jsonify({"error": "No data found"}), 404

        return jsonify({
            "disease": disease,
            "cause": info.get("cause"),
            "cure": info.get("cure")
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ---------------- RUN ----------------

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
