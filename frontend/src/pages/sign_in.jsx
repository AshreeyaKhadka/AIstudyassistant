import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowRight, ArrowLeft, Library, Eye, EyeOff } from 'lucide-react';
import './sign_in.css';

const SignIn = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  const handleSignIn = (e) => {
    e.preventDefault();
    window.location.href = 'http://localhost:5000/auth/login';
  };
  
  const handleGoogleSignIn = () => {
    window.location.href = 'http://localhost:5000/auth/login';
  };

  return (
    <div className="signin-container font-sans antialiased">
      
      {/* 1. Left Graphic Showcase Pane (Dark Meditative Tech) */}
      <div className="signin-image-pane">
        <div className="dark-tech-bg"></div>
        
        {/* Glowing Ambient Aura behind the morphing blob */}
        <div className="ambient-glow"></div>

        {/* Floating Brand Label */}
        <div className="absolute top-10 left-10 flex items-center gap-2.5 z-20">
          <div className="bg-white/5 backdrop-blur-md p-2.5 rounded-2xl border border-white/10 shadow-sm">
            <Library className="text-white/80" size={20} />
          </div>
          <span className="text-base font-bold tracking-tight text-white/90">
            AiStudy
          </span>
        </div>

        {/* Real Fluid Morphing CSS Glass Shape */}
        <div className="blob-viewport">
          <div className="morphing-blob blob-pink-blue"></div>
          <div className="morphing-blob blob-indigo-cyan"></div>
        </div>

        {/* Floating Glassmorphic Quote Card */}
        <div className="signin-features-wrapper">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="focus-glass-card-dark"
          >
            <h2 className="quote-text text-white font-extrabold tracking-tight leading-relaxed mb-6">
              "The beautiful thing about learning is that no one can take it away from you."
            </h2>
            
            <div className="flex items-center gap-3 border-t border-white/10 pt-4">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-400"></div>
              <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
                — B.B. King
              </span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* 2. Right Clean Focus Login Console */}
      <div className="signin-form-pane">
        <Link to="/" className="back-home-button">
          <ArrowLeft size={15} />
          Return Home
        </Link>

        <motion.div 
          className="signin-form-wrapper"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Mobile view Logo */}
          <div className="md:hidden flex justify-center mb-6">
            <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-2xl shadow-sm text-slate-700">
              <Library size={24} />
            </div>
          </div>

          <div className="signin-header">
            <h1 className="signin-title text-slate-800">
              Welcome back
            </h1>
            <p className="signin-subtitle text-slate-400">
              Log in to continue your learning journey.
            </p>
          </div>

          {/* Calming Google Sign In Option */}
          <div className="social-login-wrapper">
            <button 
              type="button" 
              className="btn-google-premium group" 
              onClick={handleGoogleSignIn}
            >
              <div className="google-icon-box">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25C22.56 11.47 22.49 10.73 22.36 10.02H12V14.23H17.92C17.67 15.6 16.89 16.76 15.73 17.53V20.26H19.29C21.37 18.34 22.56 15.55 22.56 12.25Z" fill="#4285F4"/>
                  <path d="M12 23C14.97 23 17.46 22.02 19.29 20.26L15.73 17.53C14.74 18.19 13.48 18.59 12 18.59C9.13 18.59 6.7 16.65 5.83 14.05H2.15V16.9C3.96 20.5 7.68 23 12 23Z" fill="#34A853"/>
                  <path d="M5.83 14.05C5.61 13.39 5.48 12.71 5.48 12C5.48 11.29 5.61 10.61 5.83 9.95V7.1H2.15C1.4 8.6 1 10.25 1 12C1 13.75 1.4 15.4 2.15 16.9L5.83 14.05Z" fill="#FBBC05"/>
                  <path d="M12 5.41C13.62 5.41 15.06 5.96 16.2 7.05L19.38 3.87C17.46 2.08 14.97 1 12 1C7.68 1 3.96 3.5 2.15 7.1L5.83 9.95C6.7 7.35 9.13 5.41 12 5.41Z" fill="#EA4335"/>
                </svg>
              </div>
              <span className="btn-google-text group-hover:text-slate-800 transition-colors">Continue with Google</span>
            </button>
          </div>

          <div className="divider-premium">
            <span>or use your email</span>
          </div>

          {/* Sign In Form */}
          <form className="signin-form" onSubmit={handleSignIn}>
            <div className="input-group">
              <label className="input-label-premium" htmlFor="email">Email address</label>
              <div className={`input-field-wrapper-premium ${focusedField === 'email' ? 'field-focused' : ''}`}>
                <div className="input-icon-premium">
                  <Mail size={16} />
                </div>
                <input 
                  type="email" 
                  id="email" 
                  className="input-field-premium" 
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocusedField('email')}
                  onBlur={() => setFocusedField(null)}
                  required 
                />
              </div>
            </div>

            <div className="input-group">
              <div className="flex justify-between items-center mb-0.5">
                <label className="input-label-premium" htmlFor="password">Password</label>
                <Link to="/forgot-password" style={{ color: 'var(--primary)', fontWeight: 600 }} className="text-xs hover:underline">
                  Forgot password?
                </Link>
              </div>
              <div className={`input-field-wrapper-premium ${focusedField === 'password' ? 'field-focused' : ''}`}>
                <div className="input-icon-premium">
                  <Lock size={16} />
                </div>
                <input 
                  type={showPassword ? "text" : "password"} 
                  id="password" 
                  className="input-field-premium pr-10" 
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  required 
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button 
              type="submit" 
              className="btn-primary-premium flex items-center justify-center gap-2 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl transition-all shadow-md shadow-blue-500/10 active:scale-[0.98] mt-2 text-sm"
            >
              Sign In to Your Workspace
              <ArrowRight size={16} />
            </button>
          </form>

          <div className="signup-prompt-premium text-slate-400">
            Don't have an account? 
            <Link to="/signup" className="signup-link-premium text-blue-600 font-bold hover:underline">
              Register here
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default SignIn;
