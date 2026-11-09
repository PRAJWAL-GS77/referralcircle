import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { Compass, Sparkles, Shield, Clock, Users } from 'lucide-react';

export const LoginPage = () => {
  const { loginWithGoogle, loginWithDemo, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const googleBtnRef = useRef(null);

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
  const isGoogleConfigured = Boolean(
    clientId &&
    clientId !== 'your_google_client_id.apps.googleusercontent.com' &&
    clientId !== 'mock_client_id_for_dev'
  );
  const showDemo = Boolean(import.meta.env.DEV || import.meta.env.VITE_ENABLE_DEMO === 'true');

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/contacts', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    // Initialize Google Identity Services if available and real clientId is configured
    if (isGoogleConfigured && window.google?.accounts?.id) {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (response) => {
          if (response.credential) {
            try {
              await loginWithGoogle(response.credential);
              navigate('/contacts');
            } catch (err) {
              // error toasted in context
            }
          }
        }
      });

      if (googleBtnRef.current) {
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: 'outline',
          size: 'large',
          width: 320,
          text: 'continue_with'
        });
      }
    }
  }, [clientId, isGoogleConfigured, loginWithGoogle, navigate]);

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Left hero side on desktop */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-gradient-to-br from-brand-900 via-brand-800 to-indigo-950 p-12 text-white">
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-500/30 backdrop-blur-sm border border-brand-400/20 text-white">
            <Compass className="h-6 w-6" />
          </div>
          <span className="text-2xl font-bold tracking-tight">ReferralCircle</span>
        </div>

        <div className="max-w-md space-y-6">
          <h1 className="text-4xl font-extrabold tracking-tight leading-tight">
            Track job referrals respectfully. Never double-text too soon.
          </h1>
          <p className="text-brand-200 text-sm leading-relaxed">
            The private networking organizer designed for college students and alumni. Server-enforced cooldowns protect your professional reputation.
          </p>

          <div className="space-y-3 pt-4">
            <div className="flex items-center gap-3 text-sm text-brand-100">
              <Clock className="h-5 w-5 text-brand-400" />
              <span>Automatic follow-up cooldown timers</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-brand-100">
              <Shield className="h-5 w-5 text-brand-400" />
              <span>Strict 5-attempt anti-spam ceiling</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-brand-100">
              <Users className="h-5 w-5 text-brand-400" />
              <span>Relationship context & response analytics</span>
            </div>
          </div>
        </div>

        <p className="text-xs text-brand-300">
          Private, secure & scoped to your Google account.
        </p>
      </div>

      {/* Right sign-in box */}
      <div className="flex w-full lg:w-1/2 items-center justify-center p-8">
        <div className="w-full max-w-sm space-y-8 rounded-2xl bg-white p-8 shadow-sm border border-slate-200/80">
          <div className="text-center">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 mb-4">
              <Sparkles className="h-6 w-6" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Sign in to ReferralCircle</h2>
            <p className="mt-1.5 text-xs text-slate-500">
              Use your Google account to access your referral pipeline.
            </p>
          </div>

          <div className="flex flex-col items-center justify-center pt-2 space-y-4">
            {/* Google Button or missing config message */}
            {isGoogleConfigured ? (
              <div ref={googleBtnRef} className="w-full flex justify-center min-h-[44px]"></div>
            ) : (
              <div className="w-full rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-center text-xs text-slate-500">
                Google Sign-In not configured (VITE_GOOGLE_CLIENT_ID missing). Use Demo Student login below.
              </div>
            )}

            {showDemo && (
              <>
                <div className="relative flex w-full items-center justify-center border-t border-slate-200">
                  <span className="absolute bg-white px-2 text-[11px] uppercase tracking-wider text-slate-400">
                    Instant Access
                  </span>
                </div>

                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await loginWithDemo();
                      navigate('/contacts');
                    } catch (e) {}
                  }}
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition flex items-center justify-center gap-2"
                >
                  <Sparkles className="h-4 w-4 text-brand-600" />
                  Sign in as Demo Student
                </button>
              </>
            )}
          </div>

          <div className="pt-2 text-center">
            <p className="text-[11px] text-slate-400">
              By continuing you agree to track networking outreach respectfully and abide by standard professional etiquette.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
