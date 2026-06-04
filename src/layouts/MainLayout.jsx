import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/Button';
import { LogOut, Video } from 'lucide-react';

const MainLayout = ({ children }) => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background text-text-main flex flex-col">
      <header className="bg-surface border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-primary-50 p-2 rounded-lg">
              <Video className="w-5 h-5 text-primary-600" />
            </div>
            <span className="font-semibold text-lg tracking-tight">Clipper Tracker</span>
          </div>
          
          {user && (
            <div className="flex items-center gap-4">
              <span className="text-sm text-text-muted hidden sm:inline-block">
                {user.email} ({profile?.role})
              </span>
              <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-2">
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline-block">Sign out</span>
              </Button>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        {children || <Outlet />}
      </main>
    </div>
  );
};

export default MainLayout;
