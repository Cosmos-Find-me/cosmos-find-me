import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

// --- mocks ---

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('../../components/CosmosBackground', () => ({
  CosmosBackground: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const mockSignIn = vi.fn();
const mockResetPassword = vi.fn();

vi.mock('../../lib/supabase', () => ({
  createClientComponentClient: () => ({
    auth: {
      signInWithPassword: mockSignIn,
      resetPasswordForEmail: mockResetPassword,
    },
  }),
}));

// --- component under test (dynamic import to pick up mocks) ---
let LoginPage: React.ComponentType;

beforeEach(async () => {
  vi.clearAllMocks();
  const mod = await import('../../../app/login/page');
  LoginPage = mod.default;
});

// --- helpers ---
function fillAndSubmit(email = 'user@example.com', password = 'secret') {
  fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
    target: { value: email },
  });
  fireEvent.change(screen.getByPlaceholderText('Enter your password'), {
    target: { value: password },
  });
  fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
}

// --- tests ---

describe('LoginPage error messages', () => {
  describe('sign-in errors', () => {
    it('shows a human-readable message for Failed to fetch', async () => {
      mockSignIn.mockResolvedValue({ error: { message: 'Failed to fetch' } });
      render(<LoginPage />);
      fillAndSubmit();
      await waitFor(() =>
        expect(screen.getByText(/Unable to reach/i)).toBeInTheDocument()
      );
    });

    it('does not show raw "Failed to fetch" to the user', async () => {
      mockSignIn.mockResolvedValue({ error: { message: 'Failed to fetch' } });
      render(<LoginPage />);
      fillAndSubmit();
      await waitFor(() =>
        expect(screen.queryByText('Failed to fetch')).not.toBeInTheDocument()
      );
    });

    it('shows credential error for invalid login', async () => {
      mockSignIn.mockResolvedValue({ error: { message: 'Invalid login credentials' } });
      render(<LoginPage />);
      fillAndSubmit();
      await waitFor(() =>
        expect(screen.getByText(/Incorrect email or password/i)).toBeInTheDocument()
      );
    });

    it('shows email verification prompt when email not confirmed', async () => {
      mockSignIn.mockResolvedValue({ error: { message: 'Email not confirmed' } });
      render(<LoginPage />);
      fillAndSubmit();
      await waitFor(() =>
        expect(screen.getByText(/verified/i)).toBeInTheDocument()
      );
    });

    it('shows rate limit message', async () => {
      mockSignIn.mockResolvedValue({ error: { message: 'Too many requests' } });
      render(<LoginPage />);
      fillAndSubmit();
      await waitFor(() =>
        expect(screen.getByText(/wait/i)).toBeInTheDocument()
      );
    });

    it('shows admin contact message when no account found', async () => {
      mockSignIn.mockResolvedValue({ error: { message: 'User not found' } });
      render(<LoginPage />);
      fillAndSubmit();
      await waitFor(() =>
        expect(screen.getByText(/administrator/i)).toBeInTheDocument()
      );
    });

    it('handles thrown network errors (not just returned errors)', async () => {
      mockSignIn.mockRejectedValue(new Error('Failed to fetch'));
      render(<LoginPage />);
      fillAndSubmit();
      await waitFor(() =>
        expect(screen.getByText(/Unable to reach/i)).toBeInTheDocument()
      );
    });

    it('redirects to explorer on success', async () => {
      const push = vi.fn();
      vi.mocked(await import('next/navigation')).useRouter = () => ({ push } as ReturnType<typeof import('next/navigation').useRouter>);
      mockSignIn.mockResolvedValue({ error: null });
      render(<LoginPage />);
      fillAndSubmit();
      await waitFor(() => expect(push).toHaveBeenCalledWith('/explorer'));
    });
  });

  describe('password reset errors', () => {
    function switchToResetMode() {
      fireEvent.click(screen.getByRole('button', { name: /forgot password/i }));
    }

    function submitReset(email = 'user@example.com') {
      fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
        target: { value: email },
      });
      fireEvent.click(screen.getByRole('button', { name: /send reset email/i }));
    }

    it('shows offline message for Failed to fetch during reset', async () => {
      mockResetPassword.mockResolvedValue({ error: { message: 'Failed to fetch' } });
      render(<LoginPage />);
      switchToResetMode();
      submitReset();
      await waitFor(() =>
        expect(screen.getByText(/Unable to send/i)).toBeInTheDocument()
      );
    });

    it('does not show raw "Failed to fetch" during reset', async () => {
      mockResetPassword.mockResolvedValue({ error: { message: 'Failed to fetch' } });
      render(<LoginPage />);
      switchToResetMode();
      submitReset();
      await waitFor(() =>
        expect(screen.queryByText('Failed to fetch')).not.toBeInTheDocument()
      );
    });

    it('shows rate limit message during reset', async () => {
      mockResetPassword.mockResolvedValue({ error: { message: 'over_email_send_rate_limit' } });
      render(<LoginPage />);
      switchToResetMode();
      submitReset();
      await waitFor(() =>
        expect(screen.getByText(/wait/i)).toBeInTheDocument()
      );
    });

    it('shows success state when reset email sends', async () => {
      mockResetPassword.mockResolvedValue({ error: null });
      render(<LoginPage />);
      switchToResetMode();
      submitReset();
      await waitFor(() =>
        expect(screen.getByText(/reset email sent/i)).toBeInTheDocument()
      );
    });
  });
});
