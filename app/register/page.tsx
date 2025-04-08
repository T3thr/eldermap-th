"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";

export default function AdminRegister() {
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    purpose: "",
    cv: null as File | null,
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isValid, setIsValid] = useState(false); // New state to track form validity
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Validation function
  const validateInput = () => {
    const newErrors: { [key: string]: string } = {};
    if (!formData.name) newErrors.name = "Name is required";
    else if (formData.name.length < 2) newErrors.name = "Name must be at least 2 characters";
    if (!formData.username) newErrors.username = "Username is required";
    else if (formData.username.length < 3) newErrors.username = "Username must be at least 3 characters";
    if (!formData.email) newErrors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = "Invalid email format";
    if (!formData.password) newErrors.password = "Password is required";
    else if (formData.password.length < 6) newErrors.password = "Password must be at least 6 characters";
    if (!formData.cv) newErrors.cv = "CV is required";
    else if (
      !["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"].includes(
        formData.cv.type
      )
    ) {
      newErrors.cv = "CV must be a PDF, DOC, or DOCX file";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Update form validity whenever formData changes
  useEffect(() => {
    const isFormValid = !!(
      formData.name &&
      formData.username &&
      formData.email &&
      formData.password &&
      formData.cv &&
      validateInput()
    );
    setIsValid(isFormValid);
  }, [formData]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateInput()) return;

    setLoading(true);
    const data = new FormData();
    data.append("name", formData.name);
    data.append("username", formData.username);
    data.append("email", formData.email);
    data.append("password", formData.password);
    data.append("purpose", formData.purpose || "");
    if (formData.cv) data.append("cv", formData.cv);

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        body: data,
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Registration failed");
      }

      toast.success("Registration request submitted successfully!");
      router.push("/login");
    } catch (err: any) {
      toast.error(err.message || "An error occurred during registration");
      console.error("Submission error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen mt-8 flex items-center justify-center bg-gradient-to-br from-background via-background/95 to-accent/10 p-4">
      <Toaster position="bottom-right" toastOptions={{ duration: 3000 }} />
      <div className="w-full max-w-lg bg-card shadow-2xl rounded-xl p-8 border border-accent/20 glass-effect">
        <h2 className="text-3xl font-bold text-center text-primary mb-2">Request Admin Access</h2>
        <p className="text-center text-sm text-muted-foreground mb-8">
          Join our platform as an admin
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Full Name</label>
              <input
                type="text"
                placeholder="Enter your full name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                onBlur={validateInput}
                disabled={loading}
                className={`w-full px-4 py-3 bg-background border border-input rounded-lg shadow-sm focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 ${
                  errors.name ? "border-destructive" : "hover:border-primary/50"
                } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
              />
              {errors.name && (
                <p className="mt-1 text-xs text-destructive animate-fade-in">{errors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Username</label>
              <input
                type="text"
                placeholder="Enter your username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                onBlur={validateInput}
                disabled={loading}
                className={`w-full px-4 py-3 bg-background border border-input rounded-lg shadow-sm focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 ${
                  errors.username ? "border-destructive" : "hover:border-primary/50"
                } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
              />
              {errors.username && (
                <p className="mt-1 text-xs text-destructive animate-fade-in">{errors.username}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Email</label>
            <input
              type="email"
              placeholder="Enter your email address"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              onBlur={validateInput}
              disabled={loading}
              className={`w-full px-4 py-3 bg-background border border-input rounded-lg shadow-sm focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 ${
                errors.email ? "border-destructive" : "hover:border-primary/50"
              } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
            />
            {errors.email && (
              <p className="mt-1 text-xs text-destructive animate-fade-in">{errors.email}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Password</label>
            <input
              type="password"
              placeholder="Create a strong password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              onBlur={validateInput}
              disabled={loading}
              className={`w-full px-4 py-3 bg-background border border-input rounded-lg shadow-sm focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 ${
                errors.password ? "border-destructive" : "hover:border-primary/50"
              } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
            />
            {errors.password && (
              <p className="mt-1 text-xs text-destructive animate-fade-in">{errors.password}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              Purpose (Optional)
            </label>
            <textarea
              placeholder="Why do you want to join as an admin?"
              value={formData.purpose}
              onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
              disabled={loading}
              rows={3}
              className={`w-full px-4 py-3 bg-background border border-input rounded-lg shadow-sm focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 ${
                loading ? "opacity-50 cursor-not-allowed" : "hover:border-primary/50"
              }`}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Upload CV</label>
            <input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={(e) => setFormData({ ...formData, cv: e.target.files?.[0] || null })}
              onBlur={validateInput}
              disabled={loading}
              className={`w-full px-4 py-3 bg-background border border-input rounded-lg shadow-sm text-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-primary file:text-white file:shadow-sm hover:file:bg-primary/90 transition-all duration-200 ${
                errors.cv ? "border-destructive" : "hover:border-primary/50"
              } ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
            />
            {errors.cv && (
              <p className="mt-1 text-xs text-destructive animate-fade-in">{errors.cv}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={!isValid || loading}
            className={`w-full py-3 px-4 bg-primary text-white rounded-lg font-semibold shadow-md hover:bg-primary/90 focus:ring-2 focus:ring-primary/50 transition-all duration-200 ${
              !isValid || loading ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
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
                Submitting...
              </span>
            ) : (
              <span className="flex items-center justify-center">
                Submit Request
                <svg
                  className="w-5 h-5 ml-2 transition-transform transform group-hover:translate-x-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M14 5l7 7m0 0l-7 7m7-7H3"
                  />
                </svg>
              </span>
            )}
          </button>

          <p className="text-center text-sm text-muted-foreground mt-4">
            Already have an account?{" "}
            <button
              type="button"
              onClick={() => router.push("/login")}
              className="text-primary hover:text-primary/80 cursor-pointer focus:outline-none"
            >
              Back to Login
            </button>
          </p>
        </form>
      </div>
    </div>
  );
}