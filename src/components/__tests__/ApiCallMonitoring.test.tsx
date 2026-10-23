import { StrictMode } from 'react';
import { render, act } from '@testing-library/react';
import { vi } from 'vitest';
import AppContainer from '../AppContainer';

/**
 * Tests to prevent infinite API call loops
 * Based on 2024 best practices for monitoring fetch calls
 */

// Mock the profile context
vi.mock('../../contexts/ProfileContext', () => ({
  useProfile: () => ({
    activeUserProfile: { id: 'test-user', name: 'Test User' },
    setUserProfile: vi.fn(),
    createProfileForUser: vi.fn()
  })
}));

// Mock Next.js navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    refresh: vi.fn()
  })
}));

// Mock CompanyGraph to avoid Canvas creation issues in tests
vi.mock('../CompanyGraph', () => ({
  default: vi.fn(() => null)
}));

describe('API Call Monitoring Tests', () => {
  let fetchSpy: any;
  let consoleErrorSpy: any;

  beforeEach(() => {
    fetchSpy = vi.spyOn(global, 'fetch').mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          authenticated: true,
          hasData: true,
          userId: 'test-user',
          companyData: {
            user_id: 'test-user',
            user_profile: { name: 'Test User', cmf: {} },
            companies: []
          }
        })
      } as Response)
    );

    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // Clear all timers
    vi.clearAllTimers();
    vi.useFakeTimers();
  });

  afterEach(() => {
    fetchSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  test('should NOT make infinite API calls to /api/user/data', async () => {
    render(<AppContainer />);

    // Wait for initial effect to run
    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    // API should be called only once on mount
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith('/api/user/data');

    // Wait longer to ensure no additional calls
    await act(async () => {
      vi.advanceTimersByTime(5000);
    });

    // Should still be only 1 call
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  test('loads user data once under Strict Mode, which runs mount effects twice in dev', async () => {
    render(
      <StrictMode>
        <AppContainer />
      </StrictMode>
    );

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    expect(fetchSpy.mock.calls.filter((call: any[]) => call[0] === '/api/user/data')).toHaveLength(1);
  });

  test('should detect excessive API calls (regression test)', async () => {
    const maxAllowedCalls = 3; // Reasonable threshold
    
    render(<AppContainer />);

    // Wait for potential infinite loop to trigger
    await act(async () => {
      vi.advanceTimersByTime(3000);
    });

    // Verify we don't exceed reasonable call count
    expect(fetchSpy.mock.calls.length).toBeLessThanOrEqual(maxAllowedCalls);
    
    // Verify specific endpoint isn't being spammed
    const userDataCalls = fetchSpy.mock.calls.filter(
      (call: any[]) => call[0] === '/api/user/data'
    );
    expect(userDataCalls.length).toBeLessThanOrEqual(1);
  });

  test('should handle authentication failure without infinite retry', async () => {
    // Mock auth failure
    fetchSpy.mockImplementationOnce(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({
          authenticated: false
        })
      } as Response)
    );

    // Mock window.location.href assignment
    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true
    });

    render(<AppContainer />);

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    // Should redirect to login, not retry infinitely
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(window.location.href).toBe('/login');
  });

  test('should handle API errors gracefully without infinite retry', async () => {
    // Mock API error
    fetchSpy.mockImplementationOnce(() =>
      Promise.reject(new Error('Network error'))
    );

    // Mock window.location.href assignment
    Object.defineProperty(window, 'location', {
      value: { href: '' },
      writable: true
    });

    render(<AppContainer />);

    await act(async () => {
      vi.advanceTimersByTime(1000);
    });

    // Should handle error and redirect, not retry infinitely
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(window.location.href).toBe('/login');
  });

  test('should prevent useEffect from running on every render with stable mocks', async () => {
    // This test verifies that our mock setup creates stable functions that don't cause infinite loops
    render(<AppContainer />);

    await act(async () => {
      vi.advanceTimersByTime(2000);
    });

    // With stable mocks, API should only be called once
    expect(fetchSpy.mock.calls.filter((call: any[]) => call[0] === '/api/user/data').length).toBe(1);
  });
});