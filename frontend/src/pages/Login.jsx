import React, { useState, useContext, useEffect } from "react";
import { toast } from "react-toastify";
import axios from "axios";
import { GoogleLogin } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import { ShopContext } from '../context/ShopContext';

const Login = () => {
  const [currentState, setCurrentState] = useState("Login");
  const navigate = useNavigate();
  const { setToken } = useContext(ShopContext);
  
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [step, setStep] = useState(1); // 1: Email, 2: OTP + New Pass

  // Toggle between Login / Sign Up and reset form
  const toggleState = (state) => {
    setCurrentState(state);
    setName("");
    setEmail("");
    setPassword("");
    setStep(1);
    setOtp("");
    setNewPassword("");
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    const baseURL = import.meta.env.VITE_API_URL || "http://localhost:4000";
    try {
      await axios.post(`${baseURL}/api/auth/forgot-password`, { email });
      toast.success("OTP sent to your email!");
      setStep(2);
    } catch (error) {
      toast.error(error.response?.data?.message || "User not found");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    const baseURL = import.meta.env.VITE_API_URL || "http://localhost:4000";
    try {
      await axios.post(`${baseURL}/api/auth/reset-password`, { email, otp, newPassword });
      toast.success("Password reset successfully! Please login.");
      toggleState("Login");
    } catch (error) {
      toast.error(error.response?.data?.message || "Invalid or expired OTP");
    } finally {
      setLoading(false);
    }
  };

  const onSubmitHandler = async (event) => {
    event.preventDefault();
    setLoading(true);
    
    // Determine the correct backend endpoint based on the state
    const baseURL = import.meta.env.VITE_API_URL || "http://localhost:4000";
    const endpoint = currentState === "Login" 
      ? `${baseURL}/api/auth/login` 
      : `${baseURL}/api/auth/register`;

    const payload = currentState === "Login" 
      ? { email, password } 
      : { name, email, password };

    try {
      console.log(`Sending API request to: ${endpoint}`);
      console.log(`Payload:`, payload);

      const response = await axios.post(endpoint, payload, {
        headers: {
          "Content-Type": "application/json"
        }
      });

      const data = response.data;

      console.log("Success! Server Response:", data);
      toast.success(`${currentState === "Login" ? "Logged in" : "Registered"} successfully!`);
      
      // Usually you would save the token to localStorage here:
      localStorage.setItem("token", data.token);
      localStorage.setItem("role", data.role || "user");
      setToken(data.token);

      // Redirect to Home Page
      if (data.role === 'admin') {
        navigate('/admin');
      } else {
        navigate("/");
      }

    } catch (error) {
      console.error("Auth Error:", error.response?.data || error);
      toast.error(error.response?.data?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      setLoading(true);
      const baseURL = import.meta.env.VITE_API_URL || "http://localhost:4000";
      
      console.log("Exchanging Google token for JWT...");
      const res = await axios.post(`${baseURL}/api/auth/google`, {
        credential: credentialResponse.credential
      });

      console.log("Google Login Success!", res.data);
      toast.success("Logged in with Google successfully!");
      localStorage.setItem("token", res.data.token);
      localStorage.setItem("role", res.data.role || "user");
      setToken(res.data.token);
      
      // Redirect to Home Page
      if (res.data.role === 'admin') {
        navigate('/admin');
      } else {
        navigate("/");
      }
      
    } catch (error) {
      console.error("Google Auth Error:", error.response?.data || error);
      toast.error(error.response?.data?.message || "Google Login failed.");
    } finally {
      setLoading(false);
    }
  };

  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const images = [
    "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&q=80&w=2070",
    "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&q=80&w=2070",
    "https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&q=80&w=2070",
    "https://images.unsplash.com/photo-1441984904996-e0b6ba687e04?auto=format&fit=crop&q=80&w=2070"
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [images.length]);

  return (
    <div className="fixed inset-0 flex bg-white z-[9999]">
      {/* Left Banner Panel with Image Slider */}
      <div className="hidden lg:flex relative w-1/2 overflow-hidden h-full">
        {images.map((img, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              index === currentImageIndex ? "opacity-100" : "opacity-0"
            }`}
          >
            <img src={img} className="w-full h-full object-cover" alt="Fashion" />
            <div className="absolute inset-0 bg-black/40"></div>
          </div>
        ))}
        
        <div className="relative z-10 w-full flex flex-col items-center justify-center text-white p-12">
          <div className="max-w-md text-center flex flex-col items-center">
            <div className="w-16 h-16 border border-white/30 rounded-2xl flex items-center justify-center mb-8 bg-white/10 backdrop-blur-md shadow-2xl">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <h1 className="text-5xl font-bold mb-4 tracking-tight drop-shadow-lg text-white">Welcome to Forever</h1>
            <p className="text-gray-100 text-xl font-medium drop-shadow-md">
              Elevate your style with world-class collections.
            </p>
          </div>
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 overflow-y-auto">
        <div className="w-full max-w-md">
          
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              {currentState === "Login" ? "Welcome back" : currentState === "Sign Up" ? "Create Account" : "Reset Password"}
            </h2>
            <p className="text-gray-500">
              {currentState === "Login" ? "Sign in to your account to continue" : currentState === "Sign Up" ? "Sign up and join the experience" : "Enter details to recover account"}
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-6 sm:p-8 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
            {currentState === "Forgot Password" ? (
               <form onSubmit={step === 1 ? handleForgotPassword : handleResetPassword} className="flex flex-col gap-5">
                  {step === 1 ? (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5 ml-1">Email Address</label>
                      <input
                        type="email"
                        className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none transition-all text-sm"
                        placeholder="Enter your registered email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5 ml-1">Enter 6-Digit OTP</label>
                        <input
                          type="text"
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none transition-all text-sm text-center font-bold tracking-[5px]"
                          placeholder="000000"
                          maxLength={6}
                          required
                          value={otp}
                          onChange={(e) => setOtp(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5 ml-1">New Password</label>
                        <input
                          type="password"
                          className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none transition-all text-sm"
                          placeholder="Enter new password"
                          required
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                        />
                      </div>
                    </>
                  )}
                  <button 
                    type="submit"
                    disabled={loading}
                    className="w-full bg-[#1b2230] text-white font-medium py-3 mt-2 rounded-xl hover:bg-black transition-colors"
                  >
                    {loading ? "Processing..." : step === 1 ? "Send Reset Code" : "Reset Password"}
                  </button>
                  <p onClick={()=>toggleState("Login")} className="text-center text-sm text-gray-500 cursor-pointer hover:underline mt-2">Back to Login</p>
               </form>
            ) : (
              <form onSubmit={onSubmitHandler} className="flex flex-col gap-5">
                
                {currentState !== "Login" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5 ml-1">Name</label>
                    <input
                      type="text"
                      className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#1b2230] focus:ring-1 focus:ring-[#1b2230] outline-none transition-all text-sm"
                      placeholder="Enter your name"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5 ml-1">Email</label>
                  <input
                    type="email"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#1b2230] focus:ring-1 focus:ring-[#1b2230] outline-none transition-all text-sm"
                    placeholder="Enter your email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5 ml-1">Password</label>
                  <input
                    type="password"
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-[#1b2230] focus:ring-1 focus:ring-[#1b2230] outline-none transition-all text-sm"
                    placeholder="Enter your password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>

                <div className="flex justify-end mt-[-8px]">
                  <p onClick={()=>toggleState("Forgot Password")} className="text-xs text-gray-500 hover:text-[#1b2230] cursor-pointer">
                    Forgot password?
                  </p>
                </div>

                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#0f172a] text-white font-medium py-3 mt-2 rounded-xl hover:bg-black transition-colors disabled:bg-gray-400"
                >
                  {loading ? "Processing..." : (currentState === "Login" ? "Sign In" : "Sign Up")}
                </button>

                <div className="relative flex items-center justify-center my-4">
                  <hr className="w-full border-gray-200" />
                  <span className="absolute bg-white px-3 text-xs text-gray-400">or</span>
                </div>

                <div className="flex justify-center">
                  <GoogleLogin
                    onSuccess={handleGoogleSuccess}
                    onError={() => toast.error("Google Login failed")}
                    useOneTap
                    theme="outline"
                    shape="rectangular"
                  />
                </div>
              </form>
            )}
          </div>

          <div className="text-center mt-8 text-sm text-gray-500">
            {currentState === "Login" ? "Don't have an account? " : currentState === "Sign Up" ? "Already have an account? " : ""}
            {(currentState === "Login" || currentState === "Sign Up") && (
              <span 
                onClick={() => toggleState(currentState === "Login" ? "Sign Up" : "Login")}
                className="font-medium text-[#1b2230] cursor-pointer hover:underline"
              >
                {currentState === "Login" ? "Create one" : "Sign in"}
              </span>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};

export default Login;