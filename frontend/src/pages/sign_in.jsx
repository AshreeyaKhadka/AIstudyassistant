import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowRight, ArrowLeft } from 'lucide-react';
import './sign_in.css';

const SignIn = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSignIn = (e) => {
    e.preventDefault();
    // Simulate authentication
    setTimeout(() => {
      navigate('/dashboard', { replace: true });
    }, 800);
  };

  const staggerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, staggerChildren: 0.1 } }
  };

  const childVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
  };

  return (
    <div className="signin-container">
      {/* Left Pane - Image */}
      <div className="signin-image-pane">
        <img 
          src="/assets/login_splash.png" 
          alt="AI Study Platform Abstract Graphic" 
          className="signin-image" 
        />
        <div className="signin-image-overlay"></div>
        
        <motion.div 
          className="signin-quote"
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <div className="signin-quote-text">
            "The beautiful thing about learning is that no one can take it away from you."
          </div>
          <div className="signin-quote-author">— B.B. King</div>
        </motion.div>
      </div>

      {/* Right Pane - Form */}
      <div className="signin-form-pane">
        <Link to="/" className="back-home">
          <ArrowLeft size={18} />
          Back to Home
        </Link>

        <motion.div 
          className="signin-form-wrapper"
          variants={staggerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div className="signin-header" variants={childVariants}>
            <h1 className="signin-title">Welcome back</h1>
            <p className="signin-subtitle">Log in to continue your learning journey.</p>
          </motion.div>

          <motion.form className="signin-form" onSubmit={handleSignIn} variants={childVariants}>
            <div className="input-group">
              <label className="input-label" htmlFor="email">Email address</label>
              <div className="input-field-wrapper">
                <input 
                  type="email" 
                  id="email" 
                  className="input-field" 
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required 
                />
                <div className="input-icon">
                  <Mail size={20} />
                </div>
              </div>
            </div>

            <div className="input-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="input-label" htmlFor="password">Password</label>
                <Link to="/forgot-password" className="forgot-password-link">Forgot password?</Link>
              </div>
              <div className="input-field-wrapper">
                <input 
                  type="password" 
                  id="password" 
                  className="input-field" 
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                />
                <div className="input-icon">
                  <Lock size={20} />
                </div>
              </div>
            </div>

            <motion.button 
              type="submit" 
              className="btn-primary"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              Sign In
              <ArrowRight size={18} />
            </motion.button>
          </motion.form>

          <motion.div className="divider" variants={childVariants}>
            OR CONTINUE WITH
          </motion.div>

          <motion.div className="social-login" variants={childVariants}>
            <button className="btn-social">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25C22.56 11.47 22.49 10.73 22.36 10.02H12V14.23H17.92C17.67 15.6 16.89 16.76 15.73 17.53V20.26H19.29C21.37 18.34 22.56 15.55 22.56 12.25Z" fill="#4285F4"/>
                <path d="M12 23C14.97 23 17.46 22.02 19.29 20.26L15.73 17.53C14.74 18.19 13.48 18.59 12 18.59C9.13 18.59 6.7 16.65 5.83 14.05H2.15V16.9C3.96 20.5 7.68 23 12 23Z" fill="#34A853"/>
                <path d="M5.83 14.05C5.61 13.39 5.48 12.71 5.48 12C5.48 11.29 5.61 10.61 5.83 9.95V7.1H2.15C1.4 8.6 1 10.25 1 12C1 13.75 1.4 15.4 2.15 16.9L5.83 14.05Z" fill="#FBBC05"/>
                <path d="M12 5.41C13.62 5.41 15.06 5.96 16.2 7.05L19.38 3.87C17.46 2.08 14.97 1 12 1C7.68 1 3.96 3.5 2.15 7.1L5.83 9.95C6.7 7.35 9.13 5.41 12 5.41Z" fill="#EA4335"/>
              </svg>
              Google
            </button>
            <button className="btn-social">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.416 22 12c0-5.523-4.477-10-10-10z" />
              </svg>
              GitHub
            </button>
          </motion.div>

          <motion.div className="signup-prompt" variants={childVariants}>
            Don't have an account? 
            <Link to="/signup" className="signup-link">Sign up</Link>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default SignIn;
