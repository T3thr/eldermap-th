"use client";

import { useState, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast, { Toaster } from "react-hot-toast";
import { Eye, EyeOff } from "lucide-react";

export default function AdminLogin() {
  const [loginType, setLoginType] = useState<"username" | "email">("username");
  const [username, setUsername] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState<boolean>(false);

  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (session) router.push("/admin/dashboard");
  }, [session, router]);

  const validateInput = () => {
    const newErrors: { [key: string]: string } = {};
    if (loginType === "username") {
      if (!username) newErrors.username = "Username is required";
      else if (username.length < 3) newErrors.username = "Username must be at least 3 characters";
    }
    if (loginType === "email") {
      if (!email) newErrors.email = "Email is required";
      else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = "Invalid email format";
    }
    if (!password) newErrors.password = "Password is required";
    else if (password.length < 6) newErrors.password = "Password must be at least 6 characters";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateInput()) return;

    setLoading(true);
    try {
      const result = await signIn("credentials", {
        username: loginType === "username" ? username : email,
        password,
        redirect: false,
      });

      if (result?.error) {
        toast.error(result.error || "Authentication failed");
        setLoading(false);
        return;
      }

      toast.success("Login successful!");
      router.push("/admin/dashboard");
    } catch (err) {
      toast.error("An unexpected error occurred");
      console.error("Login error:", err);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen mt-8 flex items-center justify-center bg-gradient-to-br from-background via-background/95 to-accent/10 p-4">
      <Toaster position="bottom-right" toastOptions={{ duration: 3000 }} />
      <div className="w-full max-w-md bg-card shadow-2xl rounded-xl p-8 border border-accent/20 glass-effect">
        <h2 className="text-3xl font-bold text-center text-primary mb-2">Admin Portal</h2>
        <p className="text-center text-sm text-muted-foreground mb-8">
          Sign in to manage the Thai Provinces platform
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Login Method</label>
            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setLoginType("username")}
                disabled={loading}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                  loginType === "username"
                    ? "bg-primary text-white shadow-md"
                    : "bg-card text-foreground/70 hover:bg-accent/20"
                } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                Username
              </button>
              <button
                type="button"
                onClick={() => setLoginType("email")}
                disabled={loading}
                className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200 ${
                  loginType === "email"
                    ? "bg-primary text-white shadow-md"
                    : "bg-card text-foreground/70 hover:bg-accent/20"
                } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                Email
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              {loginType === "username" ? "Username" : "Email"}
            </label>
            <input
              type={loginType === "email" ? "email" : "text"}
              placeholder={loginType === "username" ? "Enter your username" : "Enter your email"}
              value={loginType === "username" ? username : email}
              onChange={(e) =>
                loginType === "username" ? setUsername(e.target.value) : setEmail(e.target.value)
              }
              onBlur={validateInput}
              disabled={loading}
              className={`w-full px-4 py-3 bg-background border border-input rounded-lg shadow-sm focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 ${
                errors[loginType] ? "border-destructive" : "hover:border-primary/50"
              } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
            />
            {errors[loginType] && (
              <p className="mt-1 text-xs text-destructive animate-fade-in">{errors[loginType]}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Password</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={validateInput}
                disabled={loading}
                className={`w-full px-4 py-3 bg-background border border-input rounded-lg shadow-sm focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 pr-12 ${
                  errors.password ? "border-destructive" : "hover:border-primary/50"
                } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
                className={`absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors duration-200 ${
                  loading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
                }`}
              >
                {showPassword ? (
                  <EyeOff className="h-5 w-5" />
                ) : (
                  <Eye className="h-5 w-5" />
                )}
              </button>
            </div>
            {errors.password && (
              <p className="mt-1 text-xs text-destructive animate-fade-in">{errors.password}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 px-4 bg-primary text-white rounded-lg font-semibold shadow-md hover:bg-primary/90 focus:ring-2 focus:ring-primary/50 transition-all duration-200 ${
              loading ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg
                  className="animate-spin h-5 w-5 mr-2 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Signing in...
              </span>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            New to the platform?{" "}
            <Link href="/register" className="text-primary hover:underline font-medium">
              Request Admin Access
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}