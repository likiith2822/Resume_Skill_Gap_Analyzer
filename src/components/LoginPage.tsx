import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { 
  LogIn, 
  Mail, 
  Lock, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles, 
  ArrowRight,
  Eye,
  EyeOff,
  ShieldCheck,
  Cpu
} from "lucide-react";

interface LoginPageProps {
  onSwitchToRegister: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onSwitchToRegister }) => {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  const validateForm = () => {
    const errs: { email?: string; password?: string } = {};
    if (!email.trim()) {
      errs.email = "Email is required.";
    } else if (!/\S+@\S+\.\S+/.test(email.trim())) {
      errs.email = "Please enter a valid email address.";
    }

    if (!password) {
      errs.password = "Password is required.";
    } else if (password.length < 6) {
      errs.password = "Password must be at least 6 characters.";
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) return;

    setIsSubmitting(true);
    const res = await login(email.trim(), password);
    setIsSubmitting(false);

    if (!res.success) {
      setError(res.error || "Invalid email or password. Please verify credentials.");
    }
  };

  const handleFillDemo = () => {
    setEmail("student@college.edu");
    setPassword("Password123!");
    setFieldErrors({});
    setError(null);
  };

  const handleInstantDemoLogin = async () => {
    setError(null);
    setFieldErrors({});
    setIsSubmitting(true);
    const res = await login("student@college.edu", "Password123!");
    setIsSubmitting(false);
    if (!res.success) {
      setError(res.error || "Demo login failed. Please try registering an account.");
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6">
        {/* Header Branding */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-stone-900 text-amber-400 mb-4 shadow-sm">
            <Sparkles className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">
            Welcome to Resume Analyzer
          </h1>
          <p className="text-sm text-stone-600 mt-1">
            Sign in to access your skills dashboard and profile.
          </p>
        </div>

        {/* Card Container */}
        <div className="bg-white p-8 rounded-2xl border border-stone-200 shadow-sm space-y-6">
          {error && (
            <div 
              id="login-error-alert"
              className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-sm flex items-start space-x-3"
            >
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold block">Authentication Error</span>
                <span className="text-xs text-rose-800">{error}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Email Field */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                Email Address
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="login-email-input"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) setFieldErrors(prev => ({ ...prev, email: undefined }));
                  }}
                  placeholder="student@college.edu"
                  className={`block w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border bg-stone-50/50 text-stone-900 placeholder-stone-400 focus:bg-white focus:outline-none focus:ring-2 transition ${
                    fieldErrors.email 
                      ? "border-rose-300 focus:ring-rose-400" 
                      : "border-stone-200 focus:ring-stone-800 focus:border-stone-800"
                  }`}
                />
              </div>
              {fieldErrors.email && (
                <p className="text-xs text-rose-600 mt-1 font-medium">{fieldErrors.email}</p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
                  Password
                </label>
                <span className="text-xs text-stone-400">Werkzeug Encrypted</span>
              </div>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="login-password-input"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldErrors.password) setFieldErrors(prev => ({ ...prev, password: undefined }));
                  }}
                  placeholder="••••••••"
                  className={`block w-full pl-10 pr-10 py-2.5 text-sm rounded-xl border bg-stone-50/50 text-stone-900 placeholder-stone-400 focus:bg-white focus:outline-none focus:ring-2 transition ${
                    fieldErrors.password 
                      ? "border-rose-300 focus:ring-rose-400" 
                      : "border-stone-200 focus:ring-stone-800 focus:border-stone-800"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-400 hover:text-stone-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="text-xs text-rose-600 mt-1 font-medium">{fieldErrors.password}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              id="login-submit-btn"
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-medium text-sm transition shadow-xs disabled:opacity-50 mt-2"
            >
              <LogIn className="w-4 h-4" />
              <span>{isSubmitting ? "Authenticating..." : "Sign In to Account"}</span>
            </button>
          </form>

          {/* Quick Demo Pre-fill & Instant Login */}
          <div className="pt-3 border-t border-stone-100 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span className="text-xs text-stone-500">College Demo Access:</span>
            <div className="flex items-center space-x-2 w-full sm:w-auto">
              <button
                id="fill-demo-credentials-btn"
                type="button"
                onClick={handleFillDemo}
                className="flex-1 sm:flex-initial text-xs font-semibold text-stone-700 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 px-2.5 py-1.5 rounded-lg border border-stone-200 transition text-center"
              >
                Fill Credentials
              </button>
              <button
                id="instant-demo-login-btn"
                type="button"
                onClick={handleInstantDemoLogin}
                disabled={isSubmitting}
                className="flex-1 sm:flex-initial text-xs font-semibold text-amber-900 hover:text-amber-950 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-lg border border-amber-300 transition text-center flex items-center justify-center space-x-1"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-700" />
                <span>1-Click Demo Login</span>
              </button>
            </div>
          </div>
        </div>

        {/* Switch to Register */}
        <div className="text-center">
          <p className="text-sm text-stone-600">
            Don't have an account yet?{" "}
            <button
              id="switch-to-register-btn"
              onClick={onSwitchToRegister}
              className="font-semibold text-stone-900 hover:underline inline-flex items-center space-x-1"
            >
              <span>Create Account</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </p>
        </div>

        {/* Security Feature Notice */}
        <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 text-xs text-stone-600 flex items-center space-x-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Passwords are securely hashed with Werkzeug PBKDF2:SHA256 and stored in SQLite.</span>
        </div>
      </div>
    </div>
  );
};
