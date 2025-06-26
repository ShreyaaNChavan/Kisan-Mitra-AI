const toggleButton = document.getElementById("toggleButton");
const navbarLinks = document.getElementById("navbarLinks");

toggleButton.addEventListener("click", () => {
  navbarLinks.classList.toggle("active");
});

function scrollToChat() {
  const chatSection = document.getElementById("chat-section");
  if (chatSection) {
    chatSection.scrollIntoView({ behavior: "smooth" });
  } else {
    alert("Browse our services through the navbar!");
  }
}


function scrollToCropForm() {
  document.getElementById("crop-section").scrollIntoView({ behavior: "smooth" });
}
async function submitCropForm() {
  const form = document.getElementById("cropForm");
  const formData = new FormData(form);

  const data = {};
  for (let [key, value] of formData.entries()) {
    data[key] = parseFloat(value);
  }

  try {
    const response = await fetch("http://127.0.0.1:5000/predict_crop", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    const result = await response.json();

    if (result.recommended_crop) {
      document.getElementById("cropName").textContent = result.recommended_crop;
      document.getElementById("cropCard").classList.remove("hidden");
    } else {
      document.getElementById("cropName").textContent = "Error: " + result.error;
      document.getElementById("cropCard").classList.remove("hidden");
    }
  } catch (err) {
    document.getElementById("cropName").textContent = "Request failed!";
    document.getElementById("cropCard").classList.remove("hidden");
  }
}

/*Yield */
// Global chart variable
let inputChartInstance = null;

// Global chart instance
function submitYieldForm() {
  const loader = document.getElementById("yieldLoader");
  loader.classList.remove("hidden");  // Show spinner

  const rainfall = parseFloat(document.getElementById("rainfall").value);
  const soil_quality = parseFloat(document.getElementById("soil_quality").value);
  const farm_size = parseFloat(document.getElementById("farm_size").value);
  const sunlight = parseFloat(document.getElementById("sunlight").value);
  const fertilizer = parseFloat(document.getElementById("fertilizer").value);

  const inputs = {
    rainfall_mm: rainfall,
    soil_quality_index: soil_quality,
    farm_size_hectares: farm_size,
    sunlight_hours: sunlight,
    fertilizer_kg: fertilizer
  };

  fetch("http://127.0.0.1:5000/predict_yield", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(inputs)
  })
    .then(res => res.json())
    .then(data => {
      loader.classList.add("hidden");  // Hide spinner after success

      const predictedYield = data.predicted_yield;
      document.getElementById("predictedYield").innerText = `Predicted Yield: ${predictedYield} units`;

      drawBarChart(inputs, predictedYield);

      const perHectare = (predictedYield / farm_size).toFixed(2);
      document.getElementById("perHectare").innerText = `Per Hectare Yield: ${perHectare} units/ha`;

      const suggestions = [];

      if (fertilizer < 100) {
        suggestions.push("⚠️ Fertilizer usage is low. Consider increasing it for higher yield.");
      } else {
        suggestions.push("✅ Fertilizer usage is sufficient.");
      }

      if (soil_quality >= 8) {
        suggestions.push("✅ Excellent soil quality.");
      } else if (soil_quality >= 5) {
        suggestions.push("🟡 Soil quality is average. Soil enrichment may help.");
      } else {
        suggestions.push("⚠️ Poor soil quality. Consider using compost or organic fertilizers.");
      }

      if (rainfall > 1500) {
        suggestions.push("💧 High rainfall detected. Ensure proper drainage to avoid waterlogging.");
      } else if (rainfall < 500) {
        suggestions.push("⚠️ Rainfall is low. Consider irrigation methods.");
      } else {
        suggestions.push("✅ Rainfall is within ideal range.");
      }

      if (sunlight < 5) {
        suggestions.push("⚠️ Low sunlight hours may affect crop growth. Choose shade-tolerant crops.");
      } else {
        suggestions.push("✅ Sunlight exposure is adequate.");
      }

      const suggestionCards = document.getElementById("suggestionCards");
      suggestionCards.innerHTML = "";

      suggestions.forEach((suggestion, index) => {
        const card = document.createElement("div");
        card.className = "suggestion-card";
        card.style.animationDelay = `${index * 0.1}s`;

        const icon = document.createElement("span");
        icon.className = "icon";

        if (suggestion.includes("⚠️")) {
          icon.textContent = "⚠️";
          card.classList.add("warning");
        } else if (suggestion.includes("✅")) {
          icon.textContent = "✅";
          card.classList.add("good");
        } else if (suggestion.includes("💧")) {
          icon.textContent = "💧";
          card.classList.add("info");
        } else {
          icon.textContent = "🔎";
        }

        const text = document.createElement("span");
        text.textContent = suggestion.replace(/^[^\w]+/, "");

        card.appendChild(icon);
        card.appendChild(text);
        suggestionCards.appendChild(card);
      });

    })
    .catch(err => {
      loader.classList.add("hidden");  // Hide spinner on error
      document.getElementById("predictedYield").innerText = "Error predicting yield.";
      console.error(err);
    });
}


function drawBarChart(inputs, predictedYield) {
  const ctx = document.getElementById("inputChart").getContext("2d");

  // Destroy old chart if it exists
  if (inputChartInstance !== null) {
    inputChartInstance.destroy();
  }

  inputChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: [...Object.keys(inputs), "Predicted Yield"],
      datasets: [{
        label: "Agricultural Parameters + Yield",
        data: [...Object.values(inputs), predictedYield],
        backgroundColor: [
          "#66bb6a", "#29b6f6", "#ffca28", "#ab47bc", "#ffa726", "#ef5350"
        ]
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Value'
          }
        }
      }
    }
  });


}



/*WEATHER */
const cityInput = document.querySelector(".city-input");
const searchButton = document.querySelector(".search-btn");
const locationButton = document.querySelector(".location-btn");
const currentWeatherDiv = document.querySelector(".current-weather");
const weatherCardsDiv = document.querySelector(".weather-cards");

const API_key = "ff0c94e8259c8e9a8f87af42a89d4a0c";

const createWeathercard = (cityName, weatherItem, index) => {
  if (index === 0) {
    //HTML for main card
    return `<div class="details">
                    <h2>${cityName} (${weatherItem.dt_txt.split(" ")[0]})</h2>
                    <h4>Temperature: ${(weatherItem.main.temp - 273.15).toFixed(2)}°C </h4>
                    <h4>Humidity: ${weatherItem.main.humidity}%</h4>
                    <h4>Wind: ${weatherItem.wind.speed}M/S</h4>
                </div>
                <div class="icon">
                    <img src="http://openweathermap.org/img/wn/${weatherItem.weather[0].icon}@4x.png" alt="Warther rain">
                    <h4>${weatherItem.weather[0].description}</h4>
                </div>`;
  } else {
    //HTML for 5 days forecast
    return `<li class="card">
        <h3>(${weatherItem.dt_txt.split(" ")[0]})</h3>
        <img src="http://openweathermap.org/img/wn/${weatherItem.weather[0].icon}@2x.png"  alt="weather-rain">
        <h4>Temp: ${(weatherItem.main.temp - 273.15).toFixed(2)}°C </h4>
        <h4>Wind: ${weatherItem.wind.speed}M/S</h4>
        <h4>Humidity: ${weatherItem.main.humidity}%</h4>
    </li>`;
  }
}

const getWeatherDetails = (cityName, lat, lon) => {
  const WEATHER_API_URL = `http://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_key}`;

  fetch(WEATHER_API_URL)
    .then(res => res.json())
    .then(data => {
      //Filter the forecasts to get only forecast per day
      const uniqueForecastDays = [];
      const fiveDaysForecast = data.list.filter(forecast => {
        const forecastDate = new Date(forecast.dt_txt).getDate();
        if (!uniqueForecastDays.includes(forecastDate)) {
          return uniqueForecastDays.push(forecastDate);
        }
      });

      //Clearing previous weather data
      cityInput.value = "";
      weatherCardsDiv.innerHTML = "";
      currentWeatherDiv.innerHTML = "";

      //Creating weather cards and adding them to
      fiveDaysForecast.forEach((weatherItem, index) => {
        if (index === 0) {
          currentWeatherDiv.insertAdjacentHTML("beforeend", createWeathercard(cityName, weatherItem, index));
        }
        else {
          weatherCardsDiv.insertAdjacentHTML("beforeend", createWeathercard(cityName, weatherItem, index));

        }
      });
    })
    .catch(() => {
      alert("An Error Occurred While Fetching the Weather Forecast!");
    });
}

const getCityCoordinates = () => {
  const cityName = cityInput.value.trim(); // Removes white spaces from the city name
  if (!cityName) return; // Return if city name is empty

  const GEOCODING_API_URL = `http://api.openweathermap.org/geo/1.0/direct?q=${cityName}&limit=1&appid=${API_key}`;

  fetch(GEOCODING_API_URL)
    .then(res => res.json())
    .then(data => {
      if (!data.length) return alert(`No Coordinates found for ${cityName}`);
      const { name, lat, lon } = data[0];
      getWeatherDetails(name, lat, lon);
    })
    .catch(() => {
      alert("An Error Occurred While Fetching the Coordinates!");
    });
}

const getUserCoordinates = () => {
  navigator.geolocation.getCurrentPosition(
    position => {
      const { latitude, longitude } = position.coords;
      const REVERSE_GEOCODING_URL = `http://api.openweathermap.org/geo/1.0/reverse?lat=${latitude}&lon=${longitude}&limit=1&appid=${API_key}`;

      fetch(REVERSE_GEOCODING_URL)
        .then(res => res.json())
        .then(data => {
          const { name } = data[0];
          getWeatherDetails(name, latitude, longitude);
          //console.log(data);
        })
        .catch(() => {
          alert("An Error Occurred While Fetching the City!");
        });

    },
    error => {
      if (error.code === error.PERMISSION_DENIED) {
        alert("Geolocation Request Denied !")
      }

    }
  )
}

locationButton.addEventListener("click", getUserCoordinates);
searchButton.addEventListener("click", getCityCoordinates);
cityInput.addEventListener("keyup", e => e.key === "Enter" && getCityCoordinates());


/*Plant Disease */
document.getElementById("diseaseForm").addEventListener("submit", function(e) {
    e.preventDefault();

    const fileInput = document.getElementById("imageInput");
    const file = fileInput.files[0];

    if (!file) {
        alert("Please select an image file.");
        return;
    }

    const formData = new FormData();
    formData.append("image", file);

    fetch("http://127.0.0.1:5000/detect_disease", {
        method: "POST",
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        const resultDiv = document.getElementById("diseaseResult");
        const treatmentDiv = document.getElementById("treatmentInfo");

        if (data.disease) {
            resultDiv.innerHTML = `<h3>Predicted Disease:</h3><p>${data.disease}</p>`;

            // Call suggest_treatment API
            fetch("http://127.0.0.1:5000/suggest_treatment", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ disease: data.disease })
            })
            .then(response => response.json())
            .then(treatment => {
                if (treatment.error) {
                    treatmentDiv.innerHTML = `<p style="color:red;">${treatment.error}</p>`;
                } else {
                    treatmentDiv.innerHTML = `
                        <h3>Treatment Information</h3>
                        <p><strong>Cause:</strong> ${treatment.cause}</p>
                        <p><strong>Cure:</strong> ${treatment.cure}</p>
                    `;
                }
            })
            .catch(error => {
                console.error("Treatment fetch error:", error);
                treatmentDiv.innerHTML = `<p style="color:red;">Failed to fetch treatment info.</p>`;
            });

        } else {
            resultDiv.innerHTML = `<p style="color:red;">Error: ${data.error}</p>`;
        }
    })
    .catch(error => {
        console.error("Prediction error:", error);
        document.getElementById("diseaseResult").innerHTML = `<p style="color:red;">Failed to predict disease.</p>`;
    });
});

// Show/hide scroll button based on scroll position
window.onscroll = function () {
  const scrollBtn = document.getElementById("scrollTopBtn");
  if (document.body.scrollTop > 100 || document.documentElement.scrollTop > 100) {
    scrollBtn.style.display = "block";
  } else {
    scrollBtn.style.display = "none";
  }
};

// Scroll to top function
function scrollToTop() {
  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

function processQuery() {
  const inputElement = document.getElementById("userInput");
  const input = inputElement.value.toLowerCase().trim();
  const chatOutput = document.getElementById("chatOutput");

  const knownCrops = ["wheat", "rice", "soybean", "maize", "cotton"];
  const cropInfo = {
    wheat: {
      disease: "Rust, Smut – Treat with Mancozeb or Propiconazole.",
      fertilizer: "120 kg N, 60 kg P, 40 kg K per hectare. Split urea into 2 doses."
    },
    rice: {
      disease: "Blast, Leaf Blight – Use Bavistin or Streptocycline.",
      fertilizer: "100 kg N, 50 kg P, 50 kg K per hectare. Puddle field before sowing."
    },
    soybean: {
      disease: "Leaf spot, Rust – Use Tebuconazole or Chlorothalonil.",
      fertilizer: "20 kg N, 60 kg P, 40 kg K. Use Rhizobium for nitrogen fixation."
    },
    maize: {
      disease: "Downy mildew, Leaf blight – Treat with Mancozeb.",
      fertilizer: "135 kg N, 62 kg P, 50 kg K per hectare."
    },
    cotton: {
      disease: "Bollworm, Wilt – Use Imidacloprid or Trichoderma.",
      fertilizer: "150 kg N, 75 kg P, 75 kg K per hectare. Apply in 3 phases."
    }
  };

  let reply = "";

  // Priority: Greeting
  if (input.includes("hello") || input.includes("hi") || input.includes("namaste")) {
    reply = "Hello! I'm your Agri Assistant. Ask me about crops, fertilizers, disease treatment, or mandi prices.";
  }

  // Priority: Bot identity
  else if (input.includes("who are you") || input.includes("what can you do")) {
    reply = "I'm Agri Assistant – I can guide you with crop care, yield tips, and more.";
  }

  // Priority: Market or price questions (should NOT trigger crop)
  else if (input.includes("market") || input.includes("mandi") || input.includes("price") || input.includes("sell")) {
    reply = 'Check mandi prices in <a href="https://agmarknet.gov.in/" style="color: #03dac5;">Market Insights</a>.';
  }

  // Crop-specific logic
  else if (knownCrops.some(crop => input.includes(crop))) {
    const crop = knownCrops.find(c => input.includes(c));
    if (input.includes("disease") || input.includes("problem") || input.includes("issue")) {
      reply = `Treatment for ${crop}: ${cropInfo[crop].disease}`;
    } else if (input.includes("fertilizer") || input.includes("nutrient") || input.includes("recommend")) {
      reply = `Fertilizer for ${crop}: ${cropInfo[crop].fertilizer}`;
    } else {
      reply = `You asked about ${crop}. Do you want fertilizer recommendation or disease treatment?`;
    }
  }

  // General crop queries
  else if (input.includes("crop")) {
    reply = "Please mention the crop name (e.g., rice, wheat, soybean) and your concern.";
  }

  // Yield
  else if (input.includes("yield") || input.includes("productivity")) {
    reply = "To improve yield: use certified seeds, balanced fertilization, and timely irrigation.";
  }

  // Irrigation
  else if (input.includes("irrigation") || input.includes("water") || input.includes("drip")) {
    reply = "Use drip irrigation to save water and increase efficiency. Adjust based on crop type.";
  }

  // Fertilizer (general)
  else if (input.includes("fertilizer")) {
    reply = "Please mention the crop name for fertilizer recommendations.";
  }

  // Crop calendar
  else if (input.includes("crop calendar") || input.includes("crop schedule")) {
    reply = 'View the <a href="https://behtarzindagi.in/cropcalender/" style="color: #03dac5;">Crop Calendar</a> for month-wise activities.';
  }

  // Cattle
  else if (input.includes("cattle") || input.includes("dairy") || input.includes("cow") || input.includes("buffalo")) {
    reply = "Ensure clean water, shelter, and vaccinations for healthy livestock.";
  }

  // Thanks
  else if (input.includes("thank")) {
    reply = "You're welcome! Let me know if you have more farming questions.";
  }

  // Fallback
  else {
    reply = "Sorry, I didn’t understand. Try asking about crops, fertilizers, diseases, or markets.";
  }

  // Output to chat UI
  const userMsg = document.createElement("div");
  userMsg.style.margin = "8px 0";
  userMsg.innerHTML = `<strong>You:</strong> ${input}`;
  chatOutput.appendChild(userMsg);

  const botMsg = document.createElement("div");
  botMsg.style.margin = "8px 0";
  botMsg.innerHTML = `<strong>Bot:</strong> ${reply}`;
  chatOutput.appendChild(botMsg);

  inputElement.value = "";
  chatOutput.scrollTop = chatOutput.scrollHeight;
}

