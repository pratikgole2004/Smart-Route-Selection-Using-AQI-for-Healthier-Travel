const mongoose = require('mongoose');

const CitySchema = new mongoose.Schema({
  name: String,  // City name
  coordinates: {
    lat: Number,  // Latitude
    lng: Number   // Longitude
  },
});

module.exports = mongoose.model('City', CitySchema);
