const fs = require('fs');
const path = require('path');
const booleanPointInPolygon = require('@turf/boolean-point-in-polygon').default;
const { point } = require('@turf/helpers');

let districtsGeoJSON = null;
let dsDivisionsGeoJSON = null;

function loadDistrictsGeoJSON() {
  if (!districtsGeoJSON) {
    const geoPath = path.join(__dirname, '..', '..', 'data', 'geography', 'districts.geojson');
    districtsGeoJSON = JSON.parse(fs.readFileSync(geoPath, 'utf8'));
  }
  return districtsGeoJSON;
}

function loadDSDivisionsGeoJSON() {
  if (!dsDivisionsGeoJSON) {
    const geoPath = path.join(__dirname, '..', '..', 'data', 'geography', 'ds_divisions.geojson');
    dsDivisionsGeoJSON = JSON.parse(fs.readFileSync(geoPath, 'utf8'));
  }
  return dsDivisionsGeoJSON;
}

/**
 * Checks if a coordinate is strictly within Sri Lanka's outer bounds.
 */
function isWithinSriLanka(lat, lng) {
  // Bounding box for Sri Lanka outer limits: 
  if (lat < 5.8 || lat > 9.9 || lng < 79.5 || lng > 82.0) {
    return false;
  }
  return true;
}

/**
 * Resolves GPS coordinates to a Sri Lankan district and DS Division.
 * @param {number} lat Latitude
 * @param {number} lng Longitude
 * @returns {Object|null} { district, ds_division }, or throws if unmapped/outside
 */
function resolveSriLankaLocation(lat, lng) {
  if (!isWithinSriLanka(lat, lng)) {
    const err = new Error('LOCATION_OUTSIDE_SRI_LANKA');
    err.code = 'LOCATION_OUTSIDE_SRI_LANKA';
    throw err;
  }

  const districtsData = loadDistrictsGeoJSON();
  const dsdData = loadDSDivisionsGeoJSON();
  const pt = point([lng, lat]);

  let district = null;
  let ds_division = null;

  // Find District (ADM2)
  for (const feature of districtsData.features) {
    if (booleanPointInPolygon(pt, feature)) {
      const rawName = feature.properties.shapeName || feature.properties.district;
      district = rawName ? rawName.replace(' District', '').trim() : null;
      break;
    }
  }

  if (!district) {
    return null; // Could not map to a district even though it's inside the bounding box
  }

  // Find DS Division (ADM3)
  for (const feature of dsdData.features) {
    if (booleanPointInPolygon(pt, feature)) {
      ds_division = feature.properties.shapeName || null;
      break;
    }
  }

  return { district, ds_division };
}

module.exports = {
  resolveSriLankaLocation
};
