const apiKey = "5c4831ef7cf243d23acff9ed8118baca";
let map, marker, hourlyChart, trendsChart;
let customSettings = {
    showUV: true,
    showSun: true,
    showFeelsLike: true,
};

function toggleTheme() {
    document.body.classList.toggle("dark-theme");
}

function saveCustomSettings() {
    customSettings.showUV = document.getElementById("showUV").checked;
    customSettings.showSun = document.getElementById("showSun").checked;
    customSettings.showFeelsLike =
        document.getElementById("showFeelsLike").checked;
    alert("Налаштування збережено!");
}

function getWeatherByCity() {
    const city = document.getElementById("city").value;
    const unit = document.getElementById("unit").value;
    if (!city) {
        alert("Будь ласка, введіть назву міста.");
        return;
    }
    fetch(
        `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=${unit}&lang=ua&appid=${apiKey}`
    )
        .then((response) => response.json())
        .then((data) => {
            if (data.cod !== 200) {
                alert(`Помилка: ${data.message}`);
                return;
            }
            displayWeather(data, unit);
            updateMap(data.coord.lat, data.coord.lon, data, unit);
            getForecast(city, unit);
        })
        .catch((err) => {
            console.error(err);
            alert("Помилка при завантаженні даних.");
        });
}

function getWeatherByLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lon = position.coords.longitude;
                const unit = document.getElementById("unit").value;
                fetch(
                    `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=${unit}&lang=ua&appid=${apiKey}`
                )
                    .then((response) => response.json())
                    .then((data) => {
                        if (data.cod !== 200) {
                            alert(`Помилка: ${data.message}`);
                            return;
                        }
                        displayWeather(data, unit);
                        updateMap(lat, lon, data, unit);
                        getForecastByCoords(lat, lon, unit);
                    })
                    .catch((err) => {
                        console.error(err);
                        alert("Помилка при завантаженні даних.");
                    });
            },
            (error) => {
                alert("Не вдалося отримати вашу локацію.");
            }
        );
    } else {
        alert("Ваш браузер не підтримує геолокацію.");
    }
}

function displayWeather(data, unit) {
    const unitSymbol = unit === "metric" ? "°C" : "°F";
    const iconUrl = `http://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;
    const weatherDiv = document.getElementById("weather");
    weatherDiv.innerHTML = `
    <div class="weather-card">
      <h2>${data.name}</h2>
      <img src="${iconUrl}" alt="${data.weather[0].description}">
      <p><strong>Температура:</strong> ${data.main.temp}${unitSymbol}</p>
      <p><strong>Вологість:</strong> ${data.main.humidity}%</p>
      <p><strong>Опис:</strong> ${data.weather[0].description}</p>
    </div>
  `;
}

function updateMap(lat, lon, data, unit) {
    if (!map) {
        map = L.map("map").setView([lat, lon], 10);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "&copy; OpenStreetMap contributors",
        }).addTo(map);
    } else {
        map.setView([lat, lon], 10);
    }
    if (marker) {
        marker.setLatLng([lat, lon]);
    } else {
        marker = L.marker([lat, lon]).addTo(map);
    }
    marker
        .bindPopup(
            `<strong>${data.name}</strong><br>Температура: ${data.main.temp} ${
                unit === "metric" ? "°C" : "°F"
            }`
        )
        .openPopup();
}

function getForecast(city, unit) {
    fetch(
        `https://api.openweathermap.org/data/2.5/forecast?q=${city}&units=${unit}&lang=ua&appid=${apiKey}`
    )
        .then((response) => response.json())
        .then((forecastData) => {
            displayForecast(forecastData, unit === "metric" ? "°C" : "°F");
            drawHourlyChart(forecastData, unit === "metric" ? "°C" : "°F");
            drawTrendsChart(forecastData, unit === "metric" ? "°C" : "°F");
        })
        .catch((err) => {
            console.error(err);
            alert("Помилка при завантаженні прогнозу.");
        });
}

function getForecastByCoords(lat, lon, unit) {
    fetch(
        `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=${unit}&lang=ua&appid=${apiKey}`
    )
        .then((response) => response.json())
        .then((forecastData) => {
            displayForecast(forecastData, unit === "metric" ? "°C" : "°F");
            drawHourlyChart(forecastData, unit === "metric" ? "°C" : "°F");
            drawTrendsChart(forecastData, unit === "metric" ? "°C" : "°F");
        })
        .catch((err) => {
            console.error(err);
            alert("Помилка при завантаженні прогнозу.");
        });
}

function displayForecast(forecastData, unitSymbol) {
    const forecastDiv = document.getElementById("forecast");
    let forecastHTML = "";
    const days = {};
    forecastData.list.forEach((item) => {
        const date = item.dt_txt.split(" ")[0];
        if (!days[date]) {
            days[date] = [];
        }
        days[date].push(item);
    });
    for (const date in days) {
        const dayData = days[date];
        const temps = dayData.map((i) => i.main.temp);
        const avgTemp = (
            temps.reduce((a, b) => a + b, 0) / temps.length
        ).toFixed(1);
        const icon = dayData[0].weather[0].icon;
        const description = dayData[0].weather[0].description;
        forecastHTML += `
      <div class="forecast-card">
        <img src="http://openweathermap.org/img/wn/${icon}@2x.png" alt="${description}">
        <div class="forecast-details">
          <p><strong>${date}</strong></p>
          <p>Середня температура: ${avgTemp}${unitSymbol}</p>
          <p>${description}</p>
        </div>
      </div>
    `;
    }
    forecastDiv.innerHTML = forecastHTML;
}

function drawHourlyChart(forecastData, unitSymbol) {
    const ctx = document.getElementById("hourlyChart").getContext("2d");
    const labels = [];
    const temps = [];
    forecastData.list.slice(0, 8).forEach((item) => {
        labels.push(item.dt_txt.split(" ")[1].substring(0, 5));
        temps.push(item.main.temp);
    });
    if (hourlyChart) hourlyChart.destroy();
    hourlyChart = new Chart(ctx, {
        type: "line",
        data: {
            labels: labels,
            datasets: [
                {
                    label: "Температура " + unitSymbol,
                    data: temps,
                    borderColor: "#0071e3",
                    backgroundColor: "rgba(0,113,227,0.2)",
                    fill: true,
                },
            ],
        },
        options: {
            responsive: true,
            scales: {
                x: { display: true },
                y: { display: true },
            },
        },
    });
}

function drawTrendsChart(forecastData, unitSymbol) {
    const ctx = document.getElementById("trendsChart").getContext("2d");
    const labels = [];
    const avgTemps = [];
    const days = {};
    forecastData.list.forEach((item) => {
        const date = item.dt_txt.split(" ")[0];
        if (!days[date]) {
            days[date] = [];
        }
        days[date].push(item.main.temp);
    });
    for (const date in days) {
        labels.push(date);
        const temps = days[date];
        avgTemps.push(
            (temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1)
        );
    }
    if (trendsChart) trendsChart.destroy();
    trendsChart = new Chart(ctx, {
        type: "bar",
        data: {
            labels: labels,
            datasets: [
                {
                    label: "Середня температура " + unitSymbol,
                    data: avgTemps,
                    backgroundColor: "#0071e3",
                },
            ],
        },
        options: {
            responsive: true,
            scales: {
                x: { display: true },
                y: { display: true },
            },
        },
    });
}
