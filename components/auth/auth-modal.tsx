"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import { Turnstile, type TurnstileInstance } from "@marsidev/react-turnstile";
import { Eye, EyeOff, Loader2, Navigation, Check } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TabBar } from "@/components/ui/tab-bar";
import { useAuth } from "@/hooks/use-auth";
import { useGeolocation } from "@/hooks/use-geolocation";
import { NIGERIAN_STATES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

interface AuthModalProps {
  open: boolean;
  onClose: () => void;
}

type Mode = "Sign In" | "Sign Up" | "Reset Password";

function getPasswordStrength(password: string) {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { label: "Weak", color: "bg-red", width: "w-1/5" };
  if (score === 2) return { label: "Fair", color: "bg-gold", width: "w-2/5" };
  if (score === 3) return { label: "Good", color: "bg-gold", width: "w-3/5" };
  if (score === 4) return { label: "Strong", color: "bg-green", width: "w-4/5" };
  return { label: "Very Strong", color: "bg-green", width: "w-full" };
}

export function AuthModal({ open, onClose }: AuthModalProps) {
  const [mode, setMode] = useState<Mode>("Sign In");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [locationState, setLocationState] = useState("");
  const [locationCity, setLocationCity] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const turnstileRef = useRef<TurnstileInstance | null>(null);
  const { signIn, signUp, signInWithProvider, resetPassword } = useAuth();
  const geolocation = useGeolocation();

  const strength = useMemo(() => getPasswordStrength(password), [password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);

    try {
      // Supabase captcha protection (when enabled) covers sign-in, sign-up
      // and password reset — all three must send a token.
      if (TURNSTILE_SITE_KEY && !captchaToken) {
        toast.error("Please complete the captcha before continuing");
        return;
      }

      if (mode === "Reset Password") {
        if (!email.trim()) {
          toast.error("Please enter your email");
          return;
        }
        const { error } = await resetPassword(
          email.toLowerCase().trim(),
          captchaToken ?? undefined,
        );
        // Turnstile tokens are single-use — reset after every attempt.
        turnstileRef.current?.reset();
        setCaptchaToken(null);
        if (error) {
          toast.error(error.message);
        } else {
          toast.success("Password reset link sent! Check your email.");
          setMode("Sign In");
        }
        return;
      }

      if (mode === "Sign In") {
        const { error } = await signIn(
          email.toLowerCase().trim(),
          password,
          captchaToken ?? undefined,
        );
        if (error) {
          // Token is single-use — reset so the user can retry.
          turnstileRef.current?.reset();
          setCaptchaToken(null);
          if (error.message.includes("Invalid login")) {
            toast.error("Invalid email or password");
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success("Welcome back!");
          onClose();
          resetForm();
        }
      } else {
        if (!fullName.trim()) {
          toast.error("Please enter your full name");
          return;
        }
        if (password !== confirmPassword) {
          toast.error("Passwords don't match");
          return;
        }
        if (phone && !/^0[789]\d{9}$/.test(phone.replace(/\s/g, ""))) {
          toast.error("Please enter a valid Nigerian phone number (e.g. 08012345678)");
          return;
        }
        if (!locationState) {
          toast.error("Please select your state");
          return;
        }
        const { error } = await signUp(
          email.toLowerCase().trim(),
          password,
          fullName.trim(),
          phone.replace(/\s/g, ""),
          locationState,
          locationCity.trim() || undefined,
          geolocation.coords,
          captchaToken ?? undefined,
        );
        if (error) {
          // The Turnstile token is single-use — reset the widget so the
          // user can retry after a server-side rejection.
          turnstileRef.current?.reset();
          setCaptchaToken(null);
          if (error.message.includes("already registered")) {
            toast.error("This email is already registered. Try signing in instead.");
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success("Account created! Check your email to verify.");
          onClose();
          resetForm();
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setFullName("");
    setPhone("");
    setLocationState("");
    setLocationCity("");
    setShowPassword(false);
    setCaptchaToken(null);
    turnstileRef.current?.reset();
  };

  const handleSocialLogin = useCallback(
    async (provider: "google" | "azure" | "apple" | "discord") => {
      setSocialLoading(provider);
      try {
        const { error } = await signInWithProvider(provider);
        if (error) {
          toast.error(error.message);
        }
      } finally {
        setSocialLoading(null);
      }
    },
    [signInWithProvider]
  );

  const handleModeChange = (tab: string) => {
    setMode(tab as "Sign In" | "Sign Up");
    setShowPassword(false);
  };

  return (
    <Modal open={open} onClose={onClose} title={mode === "Reset Password" ? "Reset Password" : "Welcome to CGE"} width="sm">
      {mode !== "Reset Password" && (
        <TabBar
          tabs={["Sign In", "Sign Up"]}
          active={mode}
          onChange={handleModeChange}
        />
      )}

      {/* Social Login Buttons — shown for Sign In and Sign Up */}
      {mode !== "Reset Password" && (
        <div className="mt-5 flex flex-col gap-3">
          {/* Primary: Google — full width */}
          <button
            type="button"
            onClick={() => handleSocialLogin("google")}
            disabled={!!socialLoading || loading}
            className="flex items-center justify-center gap-3 w-full rounded-lg border border-border bg-surface-alt px-4 py-2.5 text-sm font-medium text-text hover:bg-surface-alt/80 hover:border-cyan/30 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {socialLoading === "google" ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
            )}
            Continue with Google
          </button>

          {/* Secondary row: Outlook, Apple, Discord */}
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleSocialLogin("azure")}
              disabled={!!socialLoading || loading}
              className="flex items-center justify-center gap-2 rounded-lg border border-border bg-surface-alt px-3 py-2.5 text-xs font-medium text-text hover:bg-surface-alt/80 hover:border-cyan/30 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {socialLoading === "azure" ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <svg width="16" height="16" viewBox="0 0 23 23">
                  <path fill="#f35325" d="M1 1h10v10H1z" />
                  <path fill="#81bc06" d="M12 1h10v10H12z" />
                  <path fill="#05a6f0" d="M1 12h10v10H1z" />
                  <path fill="#ffba08" d="M12 12h10v10H12z" />
                </svg>
              )}
              Outlook
            </button>

            <button
              type="button"
              onClick={() => handleSocialLogin("apple")}
              disabled={!!socialLoading || loading}
              className="flex items-center justify-center gap-2 rounded-lg border border-border bg-surface-alt px-3 py-2.5 text-xs font-medium text-text hover:bg-surface-alt/80 hover:border-cyan/30 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {socialLoading === "apple" ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                </svg>
              )}
              Apple
            </button>

            <button
              type="button"
              onClick={() => handleSocialLogin("discord")}
              disabled={!!socialLoading || loading}
              className="flex items-center justify-center gap-2 rounded-lg border border-border bg-surface-alt px-3 py-2.5 text-xs font-medium text-text hover:bg-surface-alt/80 hover:border-[#5865F2]/30 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {socialLoading === "discord" ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#5865F2">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
                </svg>
              )}
              Discord
            </button>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3 my-1">
            <div className="flex-1 h-px bg-border" />
            <span className="text-[11px] text-text-muted uppercase tracking-wider">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className={`${mode === "Reset Password" ? "mt-5" : ""} flex flex-col gap-4`}>
        {mode === "Reset Password" ? (
          <>
            <p className="text-sm text-text-muted">
              Enter your email and we&apos;ll send you a link to reset your password.
            </p>
            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />
            {TURNSTILE_SITE_KEY && (
              <div className="flex justify-center">
                <Turnstile
                  ref={turnstileRef}
                  siteKey={TURNSTILE_SITE_KEY}
                  options={{ theme: "dark", size: "flexible" }}
                  onSuccess={(token) => setCaptchaToken(token)}
                  onError={() => setCaptchaToken(null)}
                  onExpire={() => setCaptchaToken(null)}
                />
              </div>
            )}
            <Button
              type="submit"
              fullWidth
              disabled={loading || (!!TURNSTILE_SITE_KEY && !captchaToken)}
            >
              {loading ? "Sending..." : "Send Reset Link"}
            </Button>
            <button
              type="button"
              onClick={() => setMode("Sign In")}
              className="text-xs text-cyan hover:underline text-center"
            >
              Back to Sign In
            </button>
          </>
        ) : (
          <>
            {mode === "Sign Up" && (
              <>
                <Input
                  label="Full Name"
                  placeholder="Your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  disabled={loading}
                />
                <Input
                  label="Phone (optional)"
                  type="tel"
                  placeholder="08012345678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={loading}
                />
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-medium uppercase tracking-wider text-text-muted">
                    State
                  </label>
                  <select
                    value={locationState}
                    onChange={(e) => setLocationState(e.target.value)}
                    required
                    disabled={loading}
                    className="w-full rounded-lg border border-border bg-surface-alt px-3 py-2.5 text-sm text-text outline-none focus:border-cyan disabled:opacity-50"
                  >
                    <option value="" disabled>
                      Select your state
                    </option>
                    {NIGERIAN_STATES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <Input
                  label="City (optional)"
                  placeholder="e.g. Bonny Island"
                  value={locationCity}
                  onChange={(e) => setLocationCity(e.target.value)}
                  disabled={loading}
                />
                {geolocation.permission !== "unsupported" && (
                  <button
                    type="button"
                    onClick={() => {
                      if (geolocation.coords) {
                        geolocation.clear();
                      } else {
                        geolocation.request();
                      }
                    }}
                    disabled={
                      loading || geolocation.permission === "requesting"
                    }
                    className={cn(
                      "flex items-center justify-center gap-2 w-full px-3 py-2 rounded-lg text-xs font-medium border cursor-pointer transition-all",
                      "disabled:cursor-wait disabled:opacity-60",
                      geolocation.coords
                        ? "bg-cyan/15 text-cyan border-cyan/30"
                        : "bg-surface-alt text-text-muted border-border hover:text-text hover:border-cyan/20",
                    )}
                  >
                    {geolocation.permission === "requesting" ? (
                      <>
                        <Loader2 size={12} className="animate-spin" />
                        Getting location...
                      </>
                    ) : geolocation.coords ? (
                      <>
                        <Check size={12} />
                        Location captured (tap to clear)
                      </>
                    ) : (
                      <>
                        <Navigation size={12} />
                        Use my current location (optional)
                      </>
                    )}
                  </button>
                )}
                {geolocation.permission === "denied" && (
                  <p className="text-[11px] text-text-muted -mt-1">
                    Location access was blocked. You can still sign up — enable
                    it later in your browser settings to use &ldquo;Near me&rdquo;.
                  </p>
                )}
              </>
            )}

            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />

            {/* Password with visibility toggle */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium uppercase tracking-wider text-text-muted">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder={mode === "Sign Up" ? "Min 8 characters" : "Your password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={mode === "Sign Up" ? 8 : undefined}
                  disabled={loading}
                  className="w-full rounded-lg border border-border bg-surface-alt px-4 py-2.5 pr-11 text-sm text-text placeholder:text-text-muted/50 focus:border-cyan/50 focus:outline-none focus:ring-1 focus:ring-cyan/25 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text transition-colors"
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Password strength indicator (sign up only) */}
              {mode === "Sign Up" && password.length > 0 && (
                <div className="mt-1 space-y-1">
                  <div className="h-1.5 w-full rounded-full bg-surface-alt overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${strength.color} ${strength.width}`}
                    />
                  </div>
                  <p className={`text-[10px] ${
                    strength.label === "Weak" ? "text-red" :
                    strength.label === "Fair" ? "text-gold" : "text-green"
                  }`}>
                    {strength.label}
                    {strength.label === "Weak" && " — add uppercase, numbers, or symbols"}
                  </p>
                </div>
              )}
            </div>

            {/* Confirm password (sign up only) */}
            {mode === "Sign Up" && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium uppercase tracking-wider text-text-muted">
                  Confirm Password
                </label>
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Re-enter password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={loading}
                  className={`w-full rounded-lg border bg-surface-alt px-4 py-2.5 text-sm text-text placeholder:text-text-muted/50 focus:outline-none focus:ring-1 focus:ring-cyan/25 transition-colors ${
                    confirmPassword && confirmPassword !== password
                      ? "border-red focus:border-red"
                      : "border-border focus:border-cyan/50"
                  }`}
                />
                {confirmPassword && confirmPassword !== password && (
                  <p className="text-[10px] text-red">Passwords don&apos;t match</p>
                )}
              </div>
            )}

            {TURNSTILE_SITE_KEY && (
              <div className="flex justify-center">
                <Turnstile
                  ref={turnstileRef}
                  siteKey={TURNSTILE_SITE_KEY}
                  options={{ theme: "dark", size: "flexible" }}
                  onSuccess={(token) => setCaptchaToken(token)}
                  onError={() => setCaptchaToken(null)}
                  onExpire={() => setCaptchaToken(null)}
                />
              </div>
            )}

            <Button
              type="submit"
              fullWidth
              disabled={
                loading ||
                (mode === "Sign Up" && password !== confirmPassword) ||
                (!!TURNSTILE_SITE_KEY && !captchaToken)
              }
            >
              {loading ? "Please wait..." : mode === "Sign In" ? "Sign In" : "Create Account"}
            </Button>

            {mode === "Sign In" && (
              <p className="text-xs text-text-muted text-center">
                Forgot your password?{" "}
                <button
                  type="button"
                  onClick={() => setMode("Reset Password")}
                  className="text-cyan hover:underline"
                >
                  Reset it
                </button>
              </p>
            )}

            {mode === "Sign Up" && (
              <p className="text-[11px] text-text-muted text-center leading-relaxed">
                By creating an account, you agree to CGE&apos;s{" "}
                <Link href="/terms" target="_blank" className="text-cyan hover:underline">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link href="/privacy" target="_blank" className="text-cyan hover:underline">
                  Privacy Policy
                </Link>
                . Ages 13+ only.
              </p>
            )}
          </>
        )}
      </form>
    </Modal>
  );
}
