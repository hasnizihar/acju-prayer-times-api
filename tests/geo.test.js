const { resolveSriLankaLocation } = require('../api/utils/sriLankaGeoResolver');
const { resolveACJULocation } = require('../api/utils/acjuLocationResolver');

describe('Geographic Resolution - Production Tests', () => {
  
  describe('Sri Lanka Boundary & Edge Cases', () => {
    it('throws error for coordinates way outside Sri Lanka (London)', () => {
      expect(() => resolveSriLankaLocation(51.5072, 0.1276)).toThrow('LOCATION_OUTSIDE_SRI_LANKA');
    });

    it('throws error for ocean coordinates immediately outside Sri Lanka (Deep sea off Galle)', () => {
      // Very far south
      expect(() => resolveSriLankaLocation(4.0, 80.2)).toThrow('LOCATION_OUTSIDE_SRI_LANKA');
    });

    it('returns null for coordinates within the bounding box but in the ocean (Unmapped by Survey Dept)', () => {
      // E.g. off the coast of Colombo, in the water but inside the broad bounding box
      const result = resolveSriLankaLocation(6.9271, 79.5100);
      expect(result).toBeNull();
    });

    it('resolves Northern edge properly (Point Pedro area)', () => {
      const loc = resolveSriLankaLocation(9.8174, 80.2486);
      expect(loc).not.toBeNull();
      expect(loc.district).toBe('Jaffna');
    });
    
    it('resolves Eastern edge properly (Sangamankandy Point area)', () => {
      const loc = resolveSriLankaLocation(7.0182, 81.8286);
      expect(loc).not.toBeNull();
      expect(loc.district).toBe('Ampara');
    });
  });

  describe('ACJU Location Resolver - Ampara Exceptions', () => {
    it('maps standard Ampara (e.g. Kalmunai area) to batticaloa-ampara with verified confidence', () => {
      // Kalmunai area
      const mapped = resolveACJULocation('Ampara', 'Kalmunai');
      expect(mapped.acju_slug).toBe('batticaloa-ampara');
      expect(mapped.confidence).toBe('verified');
    });

    it('maps Padiyathalawa (Ampara District) to badulla-monaragala category with verified confidence', () => {
      // Padiyathalawa
      const mapped = resolveACJULocation('Ampara', 'Padiyathalawa');
      expect(mapped.acju_slug).toBe('badulla-monaragala-padiyatalawa-dehiaththakandiya');
      expect(mapped.confidence).toBe('verified');
    });

    it('maps Dehiattakandiya (Ampara District) to badulla-monaragala category with verified confidence', () => {
      const mapped = resolveACJULocation('Ampara', 'Dehiattakandiya');
      expect(mapped.acju_slug).toBe('badulla-monaragala-padiyatalawa-dehiaththakandiya');
      expect(mapped.confidence).toBe('verified');
    });

    it('maps Ampara without DS division to batticaloa-ampara with mapped confidence', () => {
      const mapped = resolveACJULocation('Ampara', null);
      expect(mapped.acju_slug).toBe('batticaloa-ampara');
      expect(mapped.confidence).toBe('mapped');
    });
  });

  describe('ACJU Location Resolver - Complete District Mapping Check', () => {
    const districtsToTest = [
      { d: 'Colombo', slug: 'colombo-gampaha-kalutara', conf: 'high' },
      { d: 'Gampaha', slug: 'colombo-gampaha-kalutara', conf: 'high' },
      { d: 'Kalutara', slug: 'colombo-gampaha-kalutara', conf: 'high' },
      { d: 'Jaffna', slug: 'jaffna-nallur', conf: 'high' },
      { d: 'Mullaitivu', slug: 'mullaitivu-kilinochchi-vavuniya', conf: 'high' },
      { d: 'Kilinochchi', slug: 'mullaitivu-kilinochchi-vavuniya', conf: 'high' },
      { d: 'Vavuniya', slug: 'mullaitivu-kilinochchi-vavuniya', conf: 'high' },
      { d: 'Mannar', slug: 'mannar-puttalam', conf: 'high' },
      { d: 'Puttalam', slug: 'mannar-puttalam', conf: 'high' },
      { d: 'Anuradhapura', slug: 'anuradhapura-polonnaruwa', conf: 'high' },
      { d: 'Polonnaruwa', slug: 'anuradhapura-polonnaruwa', conf: 'high' },
      { d: 'Kurunegala', slug: 'kurunegala', conf: 'high' },
      { d: 'Kandy', slug: 'kandy-matale-nuwara-eliya', conf: 'high' },
      { d: 'Matale', slug: 'kandy-matale-nuwara-eliya', conf: 'high' },
      { d: 'Nuwara Eliya', slug: 'kandy-matale-nuwara-eliya', conf: 'high' },
      { d: 'Batticaloa', slug: 'batticaloa-ampara', conf: 'high' },
      { d: 'Ampara', slug: 'batticaloa-ampara', conf: 'mapped' }, // Generic check without DS
      { d: 'Trincomalee', slug: 'trincomalee', conf: 'high' },
      { d: 'Badulla', slug: 'badulla-monaragala-padiyatalawa-dehiaththakandiya', conf: 'high' },
      { d: 'Monaragala', slug: 'badulla-monaragala-padiyatalawa-dehiaththakandiya', conf: 'high' },
      { d: 'Ratnapura', slug: 'ratnapura-kegalle', conf: 'high' },
      { d: 'Kegalle', slug: 'ratnapura-kegalle', conf: 'high' },
      { d: 'Galle', slug: 'galle-matara', conf: 'high' },
      { d: 'Matara', slug: 'galle-matara', conf: 'high' },
      { d: 'Hambantota', slug: 'hambantota', conf: 'high' }
    ];

    for (const testCase of districtsToTest) {
      it(`maps ${testCase.d} correctly to ${testCase.slug}`, () => {
        const mapped = resolveACJULocation(testCase.d, null);
        expect(mapped).not.toBeNull();
        expect(mapped.acju_slug).toBe(testCase.slug);
        expect(mapped.confidence).toBe(testCase.conf);
      });
    }

    it('returns null for invalid district', () => {
      const mapped = resolveACJULocation('FakeDistrict', null);
      expect(mapped).toBeNull();
    });
  });
});
