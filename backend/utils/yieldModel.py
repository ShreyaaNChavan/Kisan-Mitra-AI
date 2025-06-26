import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import (
    mean_squared_error,
    r2_score,
    mean_absolute_error,
)
import numpy as np
import joblib

# Step 1: Load the Dataset
file_path = r"D:\Agritech\backend\datasets\crop_yield_data.csv"  # Ensure it ends with .csv
df = pd.read_csv(file_path)

# Step 2: Define Features and Target
X = df[["rainfall_mm", "soil_quality_index", "farm_size_hectares", "sunlight_hours", "fertilizer_kg"]]
y = df["crop_yield"]

# Step 3: Split Dataset
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Step 4: Train Model
model = RandomForestRegressor(random_state=42)
model.fit(X_train, y_train)

# Step 5: Evaluate Model
y_pred = model.predict(X_test)

mse = mean_squared_error(y_test, y_pred)
rmse = np.sqrt(mse)
mae = mean_absolute_error(y_test, y_pred)
r2 = r2_score(y_test, y_pred)

print("Model Evaluation:")
print(f"Mean Squared Error (MSE): {mse:.2f}")
print(f"Root Mean Squared Error (RMSE): {rmse:.2f}")
print(f"Mean Absolute Error (MAE): {mae:.2f}")
print(f"R-squared (R²): {r2:.2f}")

# Step 6: Save Model
model_filename = "crop_yield_model.pkl"
joblib.dump(model, model_filename)
print(f"Model saved as {model_filename}")
