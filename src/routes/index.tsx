import { createFileRoute, redirect } from '@tanstack/react-router';
import { getAccessToken } from '../features/auth/auth.token';

export const Route = createFileRoute('/')({
  beforeLoad: () => {
    // If logged in, take user to feed.
    // If not, go to login.
    throw redirect({ to: getAccessToken() ? '/feed' : '/login' });
  },
});
