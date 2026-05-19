import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowRight, ArrowLeft, User, Library, Eye, EyeOff } from 'lucide-react';
import './signup.css';

const SignUp = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  const handleSignUp = (e) => {
    e.preventDefault();
    window.location.href = 'http://localhost:5000/auth/login';
  };

  return (
    <div className="signup-container font-sans antialiased">
      
      {/* 1. Left Graphic Showcase Pane (Dark Meditative Tech) */}
      <div className="signup-image-pane">
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
        <div className="signup-features-wrapper">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="focus-glass-card-dark"
          >
            <h2 className="quote-text text-white font-extrabold tracking-tight leading-relaxed mb-6">
              "An investment in knowledge pays the best interest."
            </h2>
            
            <div className="flex items-center gap-3 border-t border-white/10 pt-4">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-400"></div>
              <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
                — Benjamin Franklin
              </span>
            </div>
          </motion.div>
        </div>
      </div>

      {/* 2. Right Clean Focus Form Console */}
      <div className="signup-form-pane">
        <Link to="/" className="back-home-button">
          <ArrowLeft size={15} />
          Return Home
        </Link>

        <motion.div 
          className="signup-form-wrapper"
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

          <div className="signup-header">
            <h1 className="signup-title text-slate-800">
              Create account
            </h1>
            <p className="signup-subtitle text-slate-400">
              Join your quiet workspace and structure your semesters.
            </p>
          </div>

          {/* Calming Google Sign Up */}
          <div className="social-login-wrapper">
            <button 
              type="button" 
              className="btn-google-premium group" 
              onClick={handleSignUp}
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

          {/* Sign Up Form */}
          <form className="signup-form" onSubmit={handleSignUp}>
            <div className="input-group">
              <label className="input-label-premium" htmlFor="fullName">Full Name</label>
              <div className={`input-field-wrapper-premium ${focusedField === 'fullName' ? 'field-focused' : ''}`}>
                <div className="input-icon-premium">
                  <User size={16} />
                </div>
                <input 
                  type="text" 
                  id="fullName" 
                  className="input-field-premium" 
                  placeholder="e.g. John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  onFocus={() => setFocusedField('fullName')}
                  onBlur={() => setFocusedField(null)}
                  required 
                />
              </div>
            </div>

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
              <label className="input-label-premium" htmlFor="password">Password</label>
              <div className={`input-field-wrapper-premium ${focusedField === 'password' ? 'field-focused' : ''}`}>
                <div className="input-icon-premium">
                  <Lock size={16} />
                </div>
                <input 
                  type={showPassword ? "text" : "password"} 
                  id="password" 
                  className="input-field-premium pr-10" 
                  placeholder="Create a strong password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFocusedField('password')}
                  onBlur={() => setFocusedField(null)}
                  required 
                  minLength={8}
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
              Register Workspace
              <ArrowRight size={16} />
            </button>
          </form>

          <div className="signup-prompt-premium text-slate-400">
            Already have an account? 
            <Link to="/signin" className="signup-link-premium text-blue-600 font-bold hover:underline">
              Log in here
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default SignUp;
