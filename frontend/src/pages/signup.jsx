import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Library } from 'lucide-react';
import { Show, SignUp, useAuth } from '@clerk/react';
import './signup.css';

const SignUpPage = () => {
  const navigate = useNavigate();
  const { isLoaded, isSignedIn } = useAuth();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      navigate('/dashboard', { replace: true });
    }
  }, [isLoaded, isSignedIn, navigate]);

  if (isLoaded && isSignedIn) {
    return null;
  }

  return (
    <>
      <Show when="signed-out">
        <div className="signup-container font-sans antialiased">
          <div className="signup-image-pane">
            <div className="dark-tech-bg"></div>
            <div className="ambient-glow"></div>

            <div className="absolute top-10 left-10 flex items-center gap-2.5 z-20">
              <div className="bg-white/5 backdrop-blur-md p-2.5 rounded-2xl border border-white/10 shadow-sm">
                <Library className="text-white/80" size={20} />
              </div>
              <span className="text-base font-bold tracking-tight text-white/90">
                AiStudy
              </span>
            </div>

            <div className="blob-viewport">
              <div className="morphing-blob blob-pink-blue"></div>
              <div className="morphing-blob blob-indigo-cyan"></div>
            </div>

            <div className="signup-features-wrapper">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                className="focus-glass-card-dark"
              >
                <h2 className="quote-text text-white font-extrabold tracking-tight leading-relaxed mb-6">
                  "Education is the passport to the future, for tomorrow belongs to those who prepare for it today."
                </h2>

                <div className="flex items-center gap-3 border-t border-white/10 pt-4">
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400"></div>
                  <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
                    — Malcolm X
                  </span>
                </div>
              </motion.div>
            </div>
          </div>

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

              <div className="clerk-sign-up-root">
                <SignUp
                  routing="path"
                  path="/signup"
                  signInUrl="/signin"
                  forceRedirectUrl="/profile-setup"
                  fallbackRedirectUrl="/profile-setup"
                />
              </div>

              <div className="signup-prompt-premium text-slate-400">
                Already have an account?
                <Link to="/signin" className="signup-link-premium text-blue-600 font-bold hover:underline">
                  Log in here
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </Show>
    </>
  );
};

export default SignUpPage;
