import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

/**
 * The password reset email links to the reset page with the token and the email in the address. The token is a
 * secret, so it is read once into memory and then removed from the address bar (history, screenshots and shared
 * screens never keep it). It is never shown on the page: people open the link, they do not paste a token.
 *
 * { token, email } are empty strings when the page was opened without a complete link.
 */
export function useResetLink() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [link] = useState(() => ({
    token: searchParams.get('token') || '',
    email: searchParams.get('email') || '',
  }));

  useEffect(() => {
    if (searchParams.has('token') || searchParams.has('email')) {
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  return link;
}
