const mongoose = require('mongoose');

const RouteSchema = new mongoose.Schema({
  source: String,  // Source city name
  destination: String,  // Destination city name
  totalDistance: Number,  // Total distance in km
  totalAQI: Number,  // Total AQI along the route
  path: [
    {
      name: String,  // City name
      aqi: Number,  // AQI for the city
      components: {  // AQI components for the city
        co: Number,
        no: Number,
        no2: Number,
        o3: Number,
        so2: Number,
        pm2_5: Number,
        pm10: Number,
        nh3: Number
      },
      distance: Number  // Distance from the start city in km
    }
  ],
});

module.exports = mongoose.model('Route', RouteSchema);
