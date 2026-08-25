const fs = require('fs');
const path = require('path');

let mappingData = null;

function loadMappingData() {
  if (!mappingData) {
    const mappingPath = path.join(__dirname, '..', '..', 'data', 'acju', 'location-mapping.json');
    mappingData = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
  }
  return mappingData;
}

/**
 * Maps a Sri Lankan district (and optional DS division) to an ACJU location.
 * @param {string} district The name of the district
 * @param {string} ds_division The name of the DS division
 * @returns {Object|null} The mapping object containing acju_slug and confidence
 */
function resolveACJULocation(district, ds_division) {
  if (!district) return null;

  // Handle specific DS division exceptions first
  if (district.toLowerCase() === 'ampara' && ds_division) {
    const dsName = ds_division.toLowerCase();
    if (dsName.includes('padiyatalawa') || dsName.includes('padiyathalawa') || dsName.includes('dehiattakandiya') || dsName.includes('dehiaththakandiya')) {
      return {
        acju_slug: 'badulla-monaragala-padiyatalawa-dehiaththakandiya',
        confidence: 'verified' // Explicitly verified DS division
      };
    }
  }

  const mappings = loadMappingData();
  const match = mappings.find(m => m.district.toLowerCase() === district.toLowerCase());

  if (match) {
    return {
      acju_slug: match.acju_slug,
      // If it's Ampara and we know the DS (and it's not the exceptions), we are verified. If no DS, we are just mapped.
      confidence: (match.district.toLowerCase() === 'ampara' && ds_division) ? 'verified' : match.confidence
    };
  }
  return null;
}

module.exports = {
  resolveACJULocation
};
