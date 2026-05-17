import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowRight, ArrowLeft, User } from 'lucide-react';
import './signup.css';

const SignUp = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSignUp = (e) => {
    e.preventDefault();
    // Simulate registration
    setTimeout(() => {
      navigate('/dashboard');
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
    <div className="signup-container">
      {/* Left Pane - Image */}
      <div className="signup-image-pane">
        <img 
          src="/assets/signup_splash.png" 
          alt="AI Study Platform Sign Up" 
          className="signup-image" 
        />
        <div className="signup-image-overlay"></div>
        
        <motion.div 
          className="signup-quote"
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
        >
          <div className="signup-quote-text">
            "An investment in knowledge pays the best interest."
          </div>
          <div className="signup-quote-author">— Benjamin Franklin</div>
        </motion.div>
      </div>

      {/* Right Pane - Form */}
      <div className="signup-form-pane">
        <Link to="/" className="back-home">
          <ArrowLeft size={18} />
          Back to Home
        </Link>

        <motion.div 
          className="signup-form-wrapper"
          variants={staggerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div className="signup-header" variants={childVariants}>
            <h1 className="signup-title">Create an account</h1>
            <p className="signup-subtitle">Start your personalized learning journey today.</p>
          </motion.div>

          <motion.form className="signup-form" onSubmit={handleSignUp} variants={childVariants}>
            
            <div className="input-group">
              <label className="input-label" htmlFor="fullName">Full Name</label>
              <div className="input-field-wrapper">
                <input 
                  type="text" 
                  id="fullName" 
                  className="input-field" 
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required 
                />
                <div className="input-icon">
                  <User size={20} />
                </div>
              </div>
            </div>

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
              <label className="input-label" htmlFor="password">Password</label>
              <div className="input-field-wrapper">
                <input 
                  type="password" 
                  id="password" 
                  className="input-field" 
                  placeholder="Create a strong password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required 
                  minLength={8}
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
              Create Account
              <ArrowRight size={18} />
            </motion.button>
          </motion.form>

          <motion.div className="signin-prompt" variants={childVariants}>
            Already have an account? 
            <Link to="/signin" className="signin-link">Log in here</Link>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default SignUp;
