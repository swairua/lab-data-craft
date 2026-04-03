import { useCallback, useState } from 'react';
import { LogOut, LogIn, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import type { User as UserType } from '@/lib/api';
import { AuthDialog } from './AuthDialog';

interface AuthStatusProps {
  user: UserType | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (email: string, password: string, name: string) => Promise<void>;
  onLogout: () => Promise<void>;
}

export function AuthStatus({
  user,
  isAuthenticated,
  isLoading,
  onLogin,
  onRegister,
  onLogout,
}: AuthStatusProps) {
  const [authDialogOpen, setAuthDialogOpen] = useState(false);

  const handleLogout = useCallback(async () => {
    try {
      await onLogout();
      toast.success('Logged out successfully');
    } catch (error) {
      console.error('Logout failed:', error);
      toast.error('Failed to logout');
    }
  }, [onLogout]);

  if (isLoading) {
    return (
      <Button variant="ghost" size="sm" disabled>
        Loading...
      </Button>
    );
  }

  if (!isAuthenticated || !user) {
    return (
      <>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setAuthDialogOpen(true)}
          className="gap-2"
        >
          <LogIn className="h-4 w-4" />
          Sign In
        </Button>
        <AuthDialog
          open={authDialogOpen}
          onOpenChange={setAuthDialogOpen}
          onLogin={onLogin}
          onRegister={onRegister}
          isLoading={isLoading}
        />
      </>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <User className="h-4 w-4" />
            {user.name}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium">{user.name}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600">
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}
