import { useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

const Auth = () => {
  const { user, loading, signIn, signUp } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [forgotPassword, setForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [form, setForm] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    phone: "",
    smsConsent: false,
  });

  if (!loading && user) return <Navigate to="/" replace />;

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Check Your Email", description: "If an account exists with that email, you'll receive a password reset link." });
      setForgotPassword(false);
    }
    setSubmitting(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    if (isSignUp) {
      const { error } = await signUp(form.email, form.password, {
        first_name: form.firstName,
        last_name: form.lastName,
        phone: form.phone,
        sms_consent: form.smsConsent,
      });
      if (error) {
        toast({ title: "Sign Up Error", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Account Created", description: "Please check your email to verify your account." });
      }
    } else {
      const { error } = await signIn(form.email, form.password);
      if (error) {
        toast({ title: "Sign In Error", description: error.message, variant: "destructive" });
      }
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="pt-32 pb-24 bg-cream min-h-[80vh] flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-background border border-border p-8 md:p-12 w-full max-w-md mx-6"
        >
          <div className="text-center mb-8">
            <h1 className="text-2xl font-display text-foreground mb-2">
              {forgotPassword ? "Reset Password" : isSignUp ? "Create Your Account" : "Welcome Back"}
            </h1>
            <p className="font-body text-sm text-muted-foreground">
              {forgotPassword
                ? "Enter your email and we'll send you a link to reset your password."
                : isSignUp
                ? "Sign up using the email address provided during your consultation or intake."
                : "Sign in to track your orders and communicate with our team."}
            </p>
          </div>

          {forgotPassword ? (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <Label htmlFor="resetEmail" className="font-body text-sm">Email</Label>
                <Input id="resetEmail" type="email" required value={resetEmail} onChange={(e) => setResetEmail(e.target.value)} className="mt-1" />
              </div>
              <Button type="submit" disabled={submitting} className="w-full py-5 bg-primary text-primary-foreground font-body font-semibold text-sm tracking-widest uppercase">
                {submitting ? "Please wait..." : "Send Reset Link"}
              </Button>
              <div className="text-center mt-4">
                <button onClick={() => setForgotPassword(false)} className="font-body text-sm text-accent hover:underline">
                  Back to Sign In
                </button>
              </div>
            </form>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="space-y-4">
                {isSignUp && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label htmlFor="firstName" className="font-body text-sm">First Name</Label>
                        <Input id="firstName" required value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} className="mt-1" />
                      </div>
                      <div>
                        <Label htmlFor="lastName" className="font-body text-sm">Last Name</Label>
                        <Input id="lastName" required value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} className="mt-1" />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="phone" className="font-body text-sm">Phone Number</Label>
                      <Input id="phone" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1" />
                    </div>
                  </>
                )}

                <div>
                  <Label htmlFor="email" className="font-body text-sm">Email</Label>
                  <Input id="email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="password" className="font-body text-sm">Password</Label>
                  <div className="relative mt-1">
                    <Input id="password" type={showPassword ? "text" : "password"} required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="pr-10" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {!isSignUp && (
                  <div className="text-right">
                    <button type="button" onClick={() => setForgotPassword(true)} className="font-body text-xs text-accent hover:underline">
                      Forgot Password?
                    </button>
                  </div>
                )}

                {isSignUp && (
                  <div className="flex items-start gap-2 pt-2">
                    <Checkbox
                      id="smsConsent"
                      checked={form.smsConsent}
                      onCheckedChange={(checked) => setForm({ ...form, smsConsent: checked === true })}
                      className="mt-0.5"
                    />
                    <Label htmlFor="smsConsent" className="font-body text-xs text-muted-foreground leading-tight">
                      I consent to receive SMS notifications about my order status, appointment reminders, and pickup scheduling from HR Lawrence Fine Jewelry. Message & data rates may apply.
                    </Label>
                  </div>
                )}

                <Button type="submit" disabled={submitting} className="w-full py-5 bg-primary text-primary-foreground font-body font-semibold text-sm tracking-widest uppercase">
                  {submitting ? "Please wait..." : isSignUp ? "Create Account" : "Sign In"}
                </Button>
              </form>

              <div className="text-center mt-6">
                <button onClick={() => setIsSignUp(!isSignUp)} className="font-body text-sm text-accent hover:underline">
                  {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
                </button>
              </div>
            </>
          )}
        </motion.div>
      </div>
      <Footer />
    </div>
  );
};

export default Auth;
