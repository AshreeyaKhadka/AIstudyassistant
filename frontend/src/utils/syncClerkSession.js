export async function syncClerkSession(clerkUser) {
  if (!clerkUser) {
    return null;
  }

  let resolvedUser = clerkUser;

  try {
    const refreshedUser = await clerkUser.reload?.();
    if (refreshedUser) {
      resolvedUser = refreshedUser;
    }
  } catch (_) {
    // If reload fails, fall back to the already loaded user object.
  }

  const payload = {
    clerk_id: resolvedUser.id,
    email: resolvedUser.primaryEmailAddress?.emailAddress || '',
    name: resolvedUser.fullName || '',
    first_name: resolvedUser.firstName || '',
    last_name: resolvedUser.lastName || '',
    avatar_url: resolvedUser.imageUrl || '',
    role: resolvedUser.publicMetadata?.role || resolvedUser.unsafeMetadata?.role || '',
  };

  const response = await fetch('/api/auth/sync-clerk', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => ({}));
    throw new Error(errorPayload.error || 'Failed to sync backend session');
  }

  return response.json();
}