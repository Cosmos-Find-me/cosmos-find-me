import { describe, it, expect } from 'vitest';
import { getLoginErrorMessage, getPasswordResetErrorMessage } from '../authErrors';

describe('getLoginErrorMessage', () => {
  describe('network errors', () => {
    it('maps "Failed to fetch" to an actionable message', () => {
      const result = getLoginErrorMessage(new Error('Failed to fetch'));
      expect(result).toContain('Unable to reach');
      expect(result).toContain('try again');
    });

    it('maps NetworkError to an actionable message', () => {
      const result = getLoginErrorMessage(new Error('NetworkError when attempting to fetch resource'));
      expect(result).toContain('Unable to reach');
    });

    it('maps "Network request failed" to an actionable message', () => {
      const result = getLoginErrorMessage(new Error('Network request failed'));
      expect(result).toContain('Unable to reach');
    });

    it('does not surface raw "Failed to fetch" to the user', () => {
      const result = getLoginErrorMessage(new Error('Failed to fetch'));
      expect(result).not.toBe('Failed to fetch');
    });
  });

  describe('invalid credentials', () => {
    it('maps Supabase invalid login message', () => {
      const result = getLoginErrorMessage({ message: 'Invalid login credentials' });
      expect(result).toContain('Incorrect email or password');
    });

    it('handles lowercase variant', () => {
      const result = getLoginErrorMessage({ message: 'invalid login credentials' });
      expect(result).toContain('Incorrect email or password');
    });
  });

  describe('email not confirmed', () => {
    it('maps unconfirmed email error', () => {
      const result = getLoginErrorMessage({ message: 'Email not confirmed' });
      expect(result).toContain('verified');
      expect(result).toContain('inbox');
    });

    it('maps email_not_confirmed code', () => {
      const result = getLoginErrorMessage({ message: 'email_not_confirmed' });
      expect(result).toContain('verified');
    });
  });

  describe('rate limiting', () => {
    it('maps "Too many requests"', () => {
      const result = getLoginErrorMessage({ message: 'Too many requests' });
      expect(result).toContain('wait');
    });

    it('maps over_email_send_rate_limit', () => {
      const result = getLoginErrorMessage({ message: 'over_email_send_rate_limit' });
      expect(result).toContain('wait');
    });

    it('maps rate_limit', () => {
      const result = getLoginErrorMessage({ message: 'rate_limit exceeded' });
      expect(result).toContain('wait');
    });
  });

  describe('user not found', () => {
    it('maps user not found to invite-only guidance', () => {
      const result = getLoginErrorMessage({ message: 'User not found' });
      expect(result).toContain('administrator');
    });

    it('maps signup_disabled to invite-only guidance', () => {
      const result = getLoginErrorMessage({ message: 'signup_disabled' });
      expect(result).toContain('administrator');
    });
  });

  describe('auth disabled', () => {
    it('maps auth_api_disabled', () => {
      const result = getLoginErrorMessage({ message: 'auth_api_disabled' });
      expect(result).toContain('disabled');
    });
  });

  describe('fallback', () => {
    it('passes through unrecognized messages as-is', () => {
      const result = getLoginErrorMessage({ message: 'Some unexpected supabase error' });
      expect(result).toBe('Some unexpected supabase error');
    });

    it('returns a generic message when error has no message', () => {
      const result = getLoginErrorMessage({});
      expect(result).toContain('Something went wrong');
    });

    it('handles null gracefully', () => {
      const result = getLoginErrorMessage(null);
      expect(result).toContain('Something went wrong');
    });

    it('handles plain Error objects', () => {
      const result = getLoginErrorMessage(new Error('Failed to fetch'));
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });
});

describe('getPasswordResetErrorMessage', () => {
  it('maps "Failed to fetch" for reset flow', () => {
    const result = getPasswordResetErrorMessage(new Error('Failed to fetch'));
    expect(result).toContain('Unable to send');
    expect(result).not.toBe('Failed to fetch');
  });

  it('maps rate limit for reset flow', () => {
    const result = getPasswordResetErrorMessage({ message: 'over_email_send_rate_limit' });
    expect(result).toContain('wait');
  });

  it('maps user not found for reset flow', () => {
    const result = getPasswordResetErrorMessage({ message: 'User not found' });
    expect(result).toContain('No account found');
  });

  it('passes through unrecognized messages', () => {
    const result = getPasswordResetErrorMessage({ message: 'unexpected error' });
    expect(result).toBe('unexpected error');
  });
});
