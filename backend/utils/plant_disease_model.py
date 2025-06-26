import torch
from torchvision import models, transforms
from PIL import Image

# 21 class names in correct order
class_names = ['Apple___Apple_scab', 'Apple___Black_rot', 'Apple___Cedar_apple_rust',
               'Apple___healthy', 'Corn_(maize)___Cercospora_leaf_spot', 'Corn_(maize)___Common_rust',
               'Corn_(maize)___Northern_Leaf_Blight', 'Corn_(maize)___healthy',
               'Potato___Early_blight', 'Potato___Late_blight', 'Potato___healthy',
               'Tomato___Bacterial_spot', 'Tomato___Early_blight', 'Tomato___Late_blight',
               'Tomato___Leaf_Mold', 'Tomato___Septoria_leaf_spot', 'Tomato___Spider_mites',
               'Tomato___Target_Spot', 'Tomato___Tomato_Yellow_Leaf_Curl_Virus',
               'Tomato___Tomato_mosaic_virus', 'Tomato___healthy']

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# Load the model
model = models.resnet18(weights=None)  # Avoid pretrained warning
model.fc = torch.nn.Linear(model.fc.in_features, len(class_names))
model.load_state_dict(torch.load("D://Agritech//backend//models//plant_disease_resnet18.pth", map_location=device))
model.eval()

# Define transforms
transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
    transforms.Normalize(mean=[0.485, 0.456, 0.406],
                         std=[0.229, 0.224, 0.225])
])

# Predict function
def predict_disease(image_path):
    image = Image.open(image_path).convert('RGB')
    image = transform(image).unsqueeze(0).to(device)

    with torch.no_grad():
        outputs = model(image)
        _, predicted = outputs.max(1)
        return class_names[predicted.item()]
