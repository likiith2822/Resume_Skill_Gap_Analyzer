import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { 
  UserPlus, 
  User as UserIcon, 
  Mail, 
  Lock, 
  AlertCircle, 
  CheckCircle2, 
  Sparkles, 
  ArrowLeft,
  Eye,
  EyeOff,
  ShieldCheck
} from "lucide-react";

interface RegisterPageProps {
  onSwitchToLogin: () => void;
}

export const RegisterPage: React.FC<RegisterPageProps> = ({ onSwitchToLogin }) => {
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ 
    name?: string; 
    email?: string; 
    password?: string; 
    confirmPassword?: string 
  }>({});

  const validateForm = () => {
    const errs: { name?: string; email?: string; password?: string; confirmPassword?: string } = {};

    if (!name.trim()) {
      errs.name = "Full name is required.";
    } else if (name.trim().length < 2) {
      errs.name = "Name must be at least 2 characters.";
    }

    if (!email.trim()) {
      errs.email = "Email address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errs.email = "Please enter a valid email address (e.g. user@example.com).";
    }

    if (!password) {
      errs.password = "Password is required.";
    } else if (password.length < 6) {
      errs.password = "Password must be at least 6 characters.";
    }

    if (password !== confirmPassword) {
      errs.confirmPassword = "Passwords do not match.";
    }

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) return;

    setIsSubmitting(true);
    const res = await register(name.trim(), email.trim().toLowerCase(), password);
    setIsSubmitting(false);

    if (!res.success) {
      setError(res.error || "Registration failed. Please check your inputs.");
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-6">
        {/* Header Branding */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-stone-900 text-amber-400 mb-4 shadow-sm">
            <UserPlus className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-stone-900">
            Create an Account
          </h1>
          <p className="text-sm text-stone-600 mt-1">
            Register your candidate profile in the SQLite database.
          </p>
        </div>

        {/* Card Container */}
        <div className="bg-white p-8 rounded-2xl border border-stone-200 shadow-sm space-y-6">
          {error && (
            <div 
              id="register-error-alert"
              className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-sm flex items-start space-x-3"
            >
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold block">Registration Error</span>
                <span className="text-xs text-rose-800">{error}</span>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                Full Name
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                  <UserIcon className="w-4 h-4" />
                </div>
                <input
                  id="register-name-input"
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (fieldErrors.name) setFieldErrors(prev => ({ ...prev, name: undefined }));
                  }}
                  placeholder="e.g. Alex Morgan"
                  className={`block w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border bg-stone-50/50 text-stone-900 placeholder-stone-400 focus:bg-white focus:outline-none focus:ring-2 transition ${
                    fieldErrors.name 
                      ? "border-rose-300 focus:ring-rose-400" 
                      : "border-stone-200 focus:ring-stone-800 focus:border-stone-800"
                  }`}
                />
              </div>
              {fieldErrors.name && (
                <p className="text-xs text-rose-600 mt-1 font-medium">{fieldErrors.name}</p>
              )}
            </div>

            {/* Email Address */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                Email Address
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  id="register-email-input"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldErrors.email) setFieldErrors(prev => ({ ...prev, email: undefined }));
                  }}
                  placeholder="alex.morgan@university.edu"
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

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700">
                  Password
                </label>
                <span className="text-xs text-stone-400">Min 6 characters</span>
              </div>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="register-password-input"
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

            {/* Confirm Password */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5">
                Confirm Password
              </label>
              <div className="relative rounded-xl shadow-xs">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-stone-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="register-confirm-password-input"
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (fieldErrors.confirmPassword) setFieldErrors(prev => ({ ...prev, confirmPassword: undefined }));
                  }}
                  placeholder="••••••••"
                  className={`block w-full pl-10 pr-3.5 py-2.5 text-sm rounded-xl border bg-stone-50/50 text-stone-900 placeholder-stone-400 focus:bg-white focus:outline-none focus:ring-2 transition ${
                    fieldErrors.confirmPassword 
                      ? "border-rose-300 focus:ring-rose-400" 
                      : "border-stone-200 focus:ring-stone-800 focus:border-stone-800"
                  }`}
                />
              </div>
              {fieldErrors.confirmPassword && (
                <p className="text-xs text-rose-600 mt-1 font-medium">{fieldErrors.confirmPassword}</p>
              )}
            </div>

            {/* Submit Button */}
            <button
              id="register-submit-btn"
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center space-x-2 py-3 px-4 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-medium text-sm transition shadow-xs disabled:opacity-50 mt-2"
            >
              <UserPlus className="w-4 h-4" />
              <span>{isSubmitting ? "Creating Account..." : "Create Account"}</span>
            </button>
          </form>
        </div>

        {/* Switch to Login */}
        <div className="text-center">
          <p className="text-sm text-stone-600">
            Already have an account?{" "}
            <button
              id="switch-to-login-btn"
              onClick={onSwitchToLogin}
              className="font-semibold text-stone-900 hover:underline inline-flex items-center space-x-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Sign In instead</span>
            </button>
          </p>
        </div>

        {/* Security Feature Notice */}
        <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 text-xs text-stone-600 flex items-center space-x-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Werkzeug password hashing ensures plain-text passwords are never stored in SQLite.</span>
        </div>
      </div>
    </div>
  );
};
