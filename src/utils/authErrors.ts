type ErrorLike = { message: string } | Error | unknown;

function extractMessage(error: ErrorLike): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return '';
}

export function getLoginErrorMessage(error: ErrorLike): string {
  const msg = extractMessage(error);

  if (!msg) return 'Something went wrong. Please try again.';

  // Network-level failure — Supabase project paused, no internet, DNS failure, etc.
  if (msg === 'Failed to fetch' || msg.toLowerCase().includes('networkerror') || msg.toLowerCase().includes('network request failed')) {
    return 'Unable to reach the sign-in service. The app may be temporarily offline — wait a moment and try again. If this keeps happening, the service may need to be restarted.';
  }

  // Wrong credentials
  if (msg === 'Invalid login credentials' || msg.toLowerCase().includes('invalid login')) {
    return 'Incorrect email or password.';
  }

  // Email not confirmed
  if (msg.toLowerCase().includes('email not confirmed') || msg.includes('email_not_confirmed')) {
    return 'Your email address hasn\'t been verified yet. Check your inbox for a confirmation link.';
  }

  // Rate limiting
  if (
    msg.toLowerCase().includes('too many requests') ||
    msg.includes('rate_limit') ||
    msg.includes('over_email_send_rate_limit')
  ) {
    return 'Too many attempts — please wait a few minutes before trying again.';
  }

  // User doesn't exist / signup disabled (invite-only app)
  if (msg.toLowerCase().includes('user not found') || msg.includes('signup_disabled')) {
    return 'No account found for that email. Contact your administrator to request access.';
  }

  // Supabase project-level auth disabled
  if (msg.includes('auth_api_disabled') || msg.toLowerCase().includes('auth is not enabled')) {
    return 'Authentication is currently disabled. Please contact support.';
  }

  return msg;
}

export function getPasswordResetErrorMessage(error: ErrorLike): string {
  const msg = extractMessage(error);

  if (!msg) return 'Something went wrong. Please try again.';

  if (msg === 'Failed to fetch' || msg.toLowerCase().includes('networkerror') || msg.toLowerCase().includes('network request failed')) {
    return 'Unable to send reset email — the service appears to be offline. Please try again shortly.';
  }

  if (msg.toLowerCase().includes('too many requests') || msg.includes('over_email_send_rate_limit') || msg.includes('rate_limit')) {
    return 'Too many reset attempts — please wait a few minutes before trying again.';
  }

  if (msg.toLowerCase().includes('user not found')) {
    return 'No account found for that email address.';
  }

  return msg;
}
