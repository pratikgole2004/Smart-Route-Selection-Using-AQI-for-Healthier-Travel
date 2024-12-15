const express = require('express');
const fetch = require('node-fetch');
const Route = require('../models/Route');  // Import Route model
const City = require('../models/City');  // Import City model

// Function to fetch AQI data from OpenWeather API
async function getAQI(lat, lon) {
  const apiKey = process.env.OPENWEATHER_API_KEY;  // Get the API key from .env file
  const url = `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey}`;

  console.log(`Fetching AQI data for coordinates: lat=${lat}, lon=${lon}`);
  const response = await fetch(url);
  const data = await response.json();
  
  const aqi = data.list[0].main.aqi;  // AQI value (1-5)
  const components = data.list[0].components;  // AQI components like CO, NO2, PM2.5, etc.
  
  return { aqi, components };  // Return both AQI value and components
}

// Function to fetch city coordinates using Geocoding API
async function getCityCoordinates(cityName) {
  const apiKey = process.env.GEOCODE_API_KEY;  // Get the API key from .env file
  const url = `https://api.opencagedata.com/geocode/v1/json?q=${cityName}&key=${apiKey}`;

  console.log(`Fetching coordinates for city: "${cityName}"`);
  const response = await fetch(url);
  const data = await response.json();

  if (!data.results || data.results.length === 0) {
    throw new Error(`City "${cityName}" not found.`);
  }

  const { lat, lng } = data.results[0].geometry;
  return { lat, lng };
}

// Add city to MongoDB if not already present
async function addCity(cityName) {
  const existingCity = await City.findOne({ name: cityName });
  if (existingCity) {
    console.log(`City "${cityName}" found in database.`);
    return existingCity;
  }

  const { lat, lng } = await getCityCoordinates(cityName);
  const newCity = new City({
    name: cityName,
    coordinates: { lat, lng },
  });

  console.log(`Adding city "${cityName}" to database.`);
  await newCity.save();
  return newCity;
}

// Calculate the route and AQI
async function calculatePath(sourceCity, destinationCity) {
  const sourceCoordinates = sourceCity.coordinates;
  const destinationCoordinates = destinationCity.coordinates;

  const distance = Math.sqrt(
    Math.pow(destinationCoordinates.lat - sourceCoordinates.lat, 2) +
    Math.pow(destinationCoordinates.lng - sourceCoordinates.lng, 2)
  ) * 111;  // Approximate distance in km

  // Get AQI and components for source and destination
  const sourceAQIData = await getAQI(sourceCoordinates.lat, sourceCoordinates.lng);
  const destinationAQIData = await getAQI(destinationCoordinates.lat, destinationCoordinates.lng);

  // Return the route information with AQI components included
  return {
    path: [
      { 
        name: sourceCity.name, 
        aqi: sourceAQIData.aqi, 
        components: sourceAQIData.components,  // Include components for source city
        distance: 0 
      },
      { 
        name: destinationCity.name, 
        aqi: destinationAQIData.aqi, 
        components: destinationAQIData.components,  // Include components for destination city
        distance 
      }
    ],
    totalDistance: distance,
    totalAQI: sourceAQIData.aqi + destinationAQIData.aqi,  // Combine the AQI values
  };
}

const router = express.Router();

// Route to handle the request
router.post('/routes', async (req, res) => {
  const { source, destination } = req.body;

  try {
    // Always add both cities, even if they already exist in the database
    const sourceCity = await addCity(source);
    const destinationCity = await addCity(destination);

    // Calculate path and AQI data
    const { path, totalDistance, totalAQI } = await calculatePath(sourceCity, destinationCity);

    // Save the new route to the database (regardless of whether it exists)
    const newRoute = new Route({ source, destination, totalDistance, totalAQI, path });
    await newRoute.save();

    // Return the newly calculated route
    res.json(newRoute);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;  // Use CommonJS export
