import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function SessionExpired() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-8 text-center shadow-sm">
        <p className="text-4xl">🔐</p>
        <h1 className="mt-4 text-xl font-bold text-card-foreground">
          Your session has ended
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          You have been logged out. This can happen if you cleared your
          browser data or signed in from another device.
        </p>
        <Button
          onClick={() => navigate(`/login?returnTo=${encodeURIComponent(location.pathname)}`)}
          className="mt-6 w-full min-h-[44px]"
        >
          Log In Again
        </Button>
      </div>
    </div>
  );
}
