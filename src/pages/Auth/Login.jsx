import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Video } from 'lucide-react';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const { user, loading, signIn, signUp, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const { error, data } = isSignUp 
        ? await signUp(email, password)
        : await signIn(email, password);
        
      if (error) throw error;
      
      if (isSignUp && data?.user && !data?.session) {
        setError('Check your email for the confirmation link.');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!loading && user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-3 text-center pb-8">
          <div className="mx-auto bg-primary-50 p-3 rounded-2xl w-fit">
            <Video className="w-8 h-8 text-primary-600" />
          </div>
          <CardTitle className="text-2xl font-bold">
            {isSignUp ? 'Create an account' : 'Welcome back'}
          </CardTitle>
          <p className="text-text-muted text-sm">
            {isSignUp ? 'Sign up to get started' : 'Sign in to your account to continue'}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-main" htmlFor="email">Email</label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-main" htmlFor="password">Password</label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Processing...' : isSignUp ? 'Sign up' : 'Sign in'}
            </Button>
            
            <div className="text-center text-sm text-text-muted mt-4">
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button 
                type="button" 
                onClick={() => setIsSignUp(!isSignUp)} 
                className="text-primary-600 hover:underline font-medium"
              >
                {isSignUp ? 'Sign in' : 'Sign up'}
              </button>
            </div>
            
            <div className="relative flex items-center py-4">
              <div className="flex-grow border-t border-gray-200"></div>
              <span className="flex-shrink-0 mx-4 text-text-muted text-xs uppercase">Or</span>
              <div className="flex-grow border-t border-gray-200"></div>
            </div>

            <Button 
              type="button" 
              variant="secondary" 
              className="w-full flex items-center justify-center gap-2"
              onClick={signInWithGoogle}
              disabled={isLoading}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25C22.56 11.47 22.49 10.72 22.36 10H12V14.26H17.92C17.66 15.63 16.88 16.8 15.72 17.58V20.34H19.29C21.38 18.42 22.56 15.6 22.56 12.25Z" fill="#4285F4" />
                <path d="M12 23C14.97 23 17.46 22.02 19.29 20.34L15.72 17.58C14.73 18.24 13.48 18.64 12 18.64C9.13999 18.64 6.70999 16.7 5.83999 14.11H2.17999V16.94C3.98999 20.53 7.69999 23 12 23Z" fill="#34A853" />
                <path d="M5.83999 14.11C5.61999 13.45 5.48999 12.74 5.48999 12C5.48999 11.26 5.61999 10.55 5.83999 9.89001V7.06001H2.17999C1.42999 8.55001 1 10.23 1 12C1 13.77 1.42999 15.45 2.17999 16.94L5.83999 14.11Z" fill="#FBBC05" />
                <path d="M12 5.36C13.62 5.36 15.06 5.92 16.2 7.02L19.37 3.85C17.46 2.06 14.97 1 12 1C7.69999 1 3.98999 3.47 2.17999 7.06L5.83999 9.89C6.70999 7.3 9.13999 5.36 12 5.36Z" fill="#EA4335" />
              </svg>
              Continue with Google
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Login;
