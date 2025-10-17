import { describe, it, expect } from 'vitest';
import {
  validateMinimumParticipants,
  validateMaximumParticipants,
  validateFeeRange,
} from './businessRules';

describe('businessRules validators', () => {
  describe('validateMinimumParticipants', () => {
    it('should pass when participant count is 1 or more', () => {
      expect(() => validateMinimumParticipants(1)).not.toThrow();
      expect(() => validateMinimumParticipants(5)).not.toThrow();
      expect(() => validateMinimumParticipants(100)).not.toThrow();
    });

    it('should throw error when participant count is less than 1', () => {
      expect(() => validateMinimumParticipants(0)).toThrow(
        'At least one dancer is required for an entry'
      );
      expect(() => validateMinimumParticipants(-1)).toThrow(
        'At least one dancer is required for an entry'
      );
    });
  });

  describe('validateMaximumParticipants', () => {
    it('should pass when participant count is within limit', () => {
      expect(() => validateMaximumParticipants(1)).not.toThrow();
      expect(() => validateMaximumParticipants(50)).not.toThrow();
      expect(() => validateMaximumParticipants(100)).not.toThrow();
    });

    it('should throw error when participant count exceeds limit', () => {
      expect(() => validateMaximumParticipants(101)).toThrow(
        'Too many participants. Maximum 100 dancers allowed.'
      );
      expect(() => validateMaximumParticipants(200)).toThrow(
        'Too many participants. Maximum 100 dancers allowed.'
      );
    });

    it('should respect custom limit parameter', () => {
      expect(() => validateMaximumParticipants(50, 50)).not.toThrow();
      expect(() => validateMaximumParticipants(51, 50)).toThrow(
        'Too many participants. Maximum 50 dancers allowed.'
      );
    });
  });

  describe('validateFeeRange', () => {
    it('should pass when fee is within default range', () => {
      expect(() => validateFeeRange(0)).not.toThrow();
      expect(() => validateFeeRange(50)).not.toThrow();
      expect(() => validateFeeRange(10000)).not.toThrow();
    });

    it('should throw error when fee is below minimum', () => {
      expect(() => validateFeeRange(-1)).toThrow('Fee cannot be less than $0.00');
      expect(() => validateFeeRange(-100)).toThrow('Fee cannot be less than $0.00');
    });

    it('should throw error when fee exceeds maximum', () => {
      expect(() => validateFeeRange(10001)).toThrow('Fee cannot exceed $10000.00');
      expect(() => validateFeeRange(50000)).toThrow('Fee cannot exceed $10000.00');
    });

    it('should respect custom min/max parameters', () => {
      expect(() => validateFeeRange(50, 10, 100)).not.toThrow();
      expect(() => validateFeeRange(5, 10, 100)).toThrow('Fee cannot be less than $10.00');
      expect(() => validateFeeRange(150, 10, 100)).toThrow('Fee cannot exceed $100.00');
    });
  });
});
