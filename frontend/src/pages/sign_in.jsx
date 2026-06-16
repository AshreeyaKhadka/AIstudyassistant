import React, { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Library } from 'lucide-react';
import { Show, SignIn, useAuth } from '@clerk/react';
import './sign_in.css';

const SignInPage = () => {
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
        <div className="signin-container font-sans antialiased">
          <div className="signin-image-pane">
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

              <div className="clerk-sign-in-root">
                <SignIn
                  routing="path"
                  path="/signin"
                  signUpUrl="/signup"
                  forceRedirectUrl="/profile-setup"
                  fallbackRedirectUrl="/profile-setup"
                />
              </div>

              <div className="signup-prompt-premium text-slate-400">
                Don&apos;t have an account?
                <Link to="/signup" className="signup-link-premium text-blue-600 font-bold hover:underline">
                  Register here
                </Link>
              </div>
            </motion.div>
          </div>
        </div>
      </Show>
    </>
  );
};

export default SignInPage;
