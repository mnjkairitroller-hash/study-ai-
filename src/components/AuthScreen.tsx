import React, { useState } from 'react';
import { auth, googleProvider } from '../lib/firebase';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  updateProfile 
} from 'firebase/auth';
import { BookOpen, Chrome, Mail, Lock, User, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCred.user, { displayName: name });
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      setError(err.message || 'Google Sign-In failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="app-card w-full max-w-md rounded-2xl p-8 backdrop-blur-sm"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-full app-btn-primary flex items-center justify-center mb-4 text-white">
            <BookOpen size={32} />
          </div>
          <h1 className="text-3xl font-bold text-center tracking-tight">StudyQuest</h1>
          <p className="app-text-muted mt-2 text-center">Level up your learning journey.</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded-lg mb-6 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleEmailAuth} className="space-y-4">
          <AnimatePresence mode="popLayout">
            {!isLogin && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <div className="relative">
                  <User className="absolute left-3 top-3 app-text-muted" size={20} />
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required={!isLogin}
                    className="w-full bg-transparent border app-card rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2 transition-all"
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative">
            <Mail className="absolute left-3 top-3 app-text-muted" size={20} />
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-transparent border app-card rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2 transition-all"
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-3 app-text-muted" size={20} />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-transparent border app-card rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:ring-2 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full app-btn-primary rounded-xl py-3 font-semibold transition-all flex items-center justify-center gap-2"
          >
            {loading && <Loader2 size={18} className="animate-spin" />}
            {isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-between">
          <div className="h-px w-full bg-current opacity-10"></div>
          <span className="px-4 app-text-muted text-sm whitespace-nowrap">OR</span>
          <div className="h-px w-full bg-current opacity-10"></div>
        </div>

        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="mt-6 w-full app-card border rounded-xl py-3 font-medium transition-all flex items-center justify-center gap-3 hover:opacity-80"
        >
          <Chrome size={20} className="text-blue-500" />
          {isLogin ? 'Sign In with Google' : 'Sign Up with Google'}
        </button>

        <div className="mt-8 text-center text-sm">
          <span className="app-text-muted">
            {isLogin ? 'New to StudyQuest?' : 'Already registered?'}
          </span>
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="ml-2 font-medium underline underline-offset-4 hover:opacity-80 transition-opacity"
            type="button"
          >
            {isLogin ? 'Create Account' : 'Sign In'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
