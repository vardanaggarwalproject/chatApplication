/* eslint-disable no-unused-vars */
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import axiosInstance from "../utils/axiosConfig";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Eye, EyeOff, Loader2, UserPlus, Mail, Lock, User } from "lucide-react";
import AuthLayout from "@/components/AuthLayout";
import { toast } from "sonner";

const SignUp = () => {
  const navigate = useNavigate();
  const [show, setShow] = useState(false);
  const [name, setName] = useState("");
  const [userName, setUserName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSignUp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(false);

    // Basic validation
    if (name.trim().length < 2 || name.trim().length > 20) {
      toast.error("Invalid Name", { description: "Name must be between 2 and 20 characters long." });
      setLoading(false);
      return;
    }

    if (userName.trim().length < 3 || userName.trim().length > 20) {
      toast.error("Invalid Username", { description: "Username must be between 3 and 20 characters long." });
      setLoading(false);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Invalid Email", { description: "Please enter a valid email address." });
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      toast.error("Invalid Password", { description: "Password must be at least 6 characters long." });
      setLoading(false);
      return;
    }

    try {
      const result = await axiosInstance.post(`/api/auth/signup`, {
        name: name.trim(),
        userName: userName.trim(),
        email: email.trim(),
        password,
      });

      // Store user and token in localStorage
      localStorage.setItem("user", JSON.stringify(result.data.user));
      localStorage.setItem("token", result.data.token);

      setName("");
      setEmail("");
      setPassword("");
      setUserName("");
      setLoading(false);

      // Show success toast
      toast.success("Account created successfully!", {
        description: "Welcome to VibeMesh! Redirecting to chat...",
        duration: 2000,
      });

      // Small delay to ensure localStorage is set before navigation
      setTimeout(() => {
        navigate("/chat", { replace: true });
      }, 100);
    } catch (error) {
      setLoading(false);
      setError(false);

      const errorMessage = error?.response?.data?.message || "Please try again with different credentials.";
      setError(errorMessage);
      toast.error("Signup failed", {
        description: errorMessage,
        duration: 4000,
      });
    }
  };

  return (
    <AuthLayout
      title="Create an account"
      subtitle="Sign up and get 30 day free trial"
      footerText="Already have an account?"
      footerLinkText="Sign in"
      onFooterLinkClick={() => navigate("/login")}
      imagePosition="left"
    >
      <form onSubmit={handleSignUp} className="space-y-5">
        {/* Full Name Input */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="space-y-2"
        >
          <Label
            htmlFor="name"
            className="text-sm font-medium text-slate-700 flex items-center gap-2"
          >
            <User className="w-4 h-4 text-slate-500" />
            Full name
          </Label>
          <Input
            id="name"
            type="text"
            placeholder="Amélie Laurent"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={20}
            className="h-12 bg-white border border-slate-200 rounded-xl focus:border-primaryColor focus:ring-2 focus:ring-primaryColor/20 transition-all duration-300"
          />
        </motion.div>

        {/* Username Input */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="space-y-2"
        >
          <Label
            htmlFor="username"
            className="text-sm font-medium text-slate-700 flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4 text-slate-500" />
            Username
          </Label>
          <Input
            id="username"
            type="text"
            placeholder="amelie"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
            required
            maxLength={20}
            className="h-12 bg-white border border-slate-200 rounded-xl focus:border-primaryColor focus:ring-2 focus:ring-primaryColor/20 transition-all duration-300"
          />
        </motion.div>

        {/* Email Input */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
          className="space-y-2"
        >
          <Label
            htmlFor="email"
            className="text-sm font-medium text-slate-700 flex items-center gap-2"
          >
            <Mail className="w-4 h-4 text-slate-500" />
            Email
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="amelielaurent7622@gmail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="h-12 bg-white border border-slate-200 rounded-xl focus:border-primaryColor focus:ring-2 focus:ring-primaryColor/20 transition-all duration-300"
          />
        </motion.div>

        {/* Password Input */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.6 }}
          className="space-y-2"
        >
          <Label
            htmlFor="password"
            className="text-sm font-medium text-slate-700 flex items-center gap-2"
          >
            <Lock className="w-4 h-4 text-slate-500" />
            Password
          </Label>
          <div className="relative">
            <Input
              id="password"
              type={show ? "text" : "password"}
              placeholder="••••••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="h-12 pr-12 bg-white border border-slate-200 rounded-xl focus:border-primaryColor focus:ring-2 focus:ring-primaryColor/20 transition-all duration-300"
            />
            <motion.button
              type="button"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setShow((prev) => !prev)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
            >
              {show ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </motion.button>
          </div>
        </motion.div>

        {/* Error Alert */}
        {error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
          >
            <Alert variant="destructive" className="py-3 rounded-xl">
              <AlertDescription className="text-sm">{error}</AlertDescription>
            </Alert>
          </motion.div>
        )}

        {/* SignUp Button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.7 }}
        >
          <Button
            type="submit"
            className="w-full h-12 bg-gradient-to-r from-[#040316] to-[#1a1a2e] hover:from-[#1a1a2e] hover:to-[#040316] text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 text-base cursor-pointer"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Creating account...
              </>
            ) : (
              <>
                <UserPlus className="mr-2 h-5 w-5" />
                Create Account
              </>
            )}
          </Button>
        </motion.div>
      </form>

      {/* Terms */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.8 }}
        className="text-xs text-center text-slate-500 mt-8"
      >
        By creating an account, you agree to our{" "}
        <button className="text-primaryColor hover:text-darkPurple underline transition-colors cursor-pointer">
          Terms & Conditions
        </button>
      </motion.p>
    </AuthLayout>
  );
};

export default SignUp;
