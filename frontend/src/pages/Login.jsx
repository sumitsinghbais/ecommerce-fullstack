import React, { useState, useContext } from "react";
import { toast } from "react-toastify";
import axios from "axios";
import { GoogleLogin } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import { ShopContext } from '../context/ShopContext';

const Login = () => {
  const [currentState, setCurrentState] = useState("Login");
  const navigate = useNavigate();
  const { setToken } = useContext(ShopContext);
  
  // State for form inputs
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Toggle between Login / Sign Up and reset form
  const toggleState = (state) => {
    setCurrentState(state);
    setName("");
    setEmail("");
    setPassword("");
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
      setToken(data.token);

      // Redirect to Home Page
      navigate("/");

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
      setToken(res.data.token);
      
      // Redirect to Home Page
      navigate("/");
      
    } catch (error) {
      console.error("Google Auth Error:", error.response?.data || error);
      toast.error(error.response?.data?.message || "Google Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center pt-8 pb-20">
      <div className="bg-white p-8 sm:p-12 rounded-[2rem] shadow-[0_20px_60px_rgba(0,0,0,0.06)] border border-gray-100 w-full max-w-[28rem] transition-all duration-300 hover:shadow-[0_20px_60px_rgba(0,0,0,0.08)]">
        
        <form onSubmit={onSubmitHandler} className="flex flex-col gap-6 text-gray-800">
          
          {/* Header */}
          <div className="text-center mb-4">
            <h1 className="text-3xl font-light mb-2 tracking-tight">
              {currentState === "Login" ? "Welcome Back" : "Create Account"}
            </h1>
            <p className="text-gray-500 text-sm">
              {currentState === "Login" 
                ? "Enter your credentials to access your account" 
                : "Sign up today to discover premium collections"}
            </p>
          </div>

          {/* Form Inputs Container */}
          <div className="flex flex-col gap-4">
            
            {/* Name Input (Sign Up Only) */}
            {currentState !== "Login" && (
              <div className="relative">
                <input
                  type="text"
                  className="w-full px-5 py-3.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:border-indigo-600 focus:bg-white focus:ring-4 focus:ring-indigo-600/10 outline-none transition-all duration-200 text-sm placeholder:text-gray-400"
                  placeholder="Full Name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
            )}

            {/* Email Input */}
            <div className="relative">
              <input
                type="email"
                className="w-full px-5 py-3.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:border-indigo-600 focus:bg-white focus:ring-4 focus:ring-indigo-600/10 outline-none transition-all duration-200 text-sm placeholder:text-gray-400"
                placeholder="Email Address"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {/* Password Input */}
            <div className="relative">
              <input
                type="password"
                className="w-full px-5 py-3.5 bg-gray-50/50 border border-gray-200 rounded-xl focus:border-indigo-600 focus:bg-white focus:ring-4 focus:ring-indigo-600/10 outline-none transition-all duration-200 text-sm placeholder:text-gray-400"
                placeholder="Password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          {/* Assistant Links */}
          <div className="flex justify-between items-center text-sm px-1">
            <p className="text-gray-500 hover:text-indigo-600 cursor-pointer transition-colors hover:underline">
              Forgot password?
            </p>
            
            <p 
              onClick={() => toggleState(currentState === "Login" ? "Sign Up" : "Login")}
              className="text-indigo-600 font-medium cursor-pointer hover:text-indigo-800 transition-colors"
            >
              {currentState === "Login" ? "Create an account" : "Log in instead"}
            </p>
          </div>

          {/* Submit Button */}
          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-gray-900 text-white font-medium px-8 py-3.5 mt-2 rounded-xl hover:bg-gray-800 hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 disabled:bg-gray-400 disabled:hover:translate-y-0 disabled:shadow-none"
          >
            {loading ? "Processing..." : (currentState === "Login" ? "Sign In" : "Create Account")}
          </button>

          {/* Separator */}
          <div className="relative flex items-center justify-center my-2">
            <hr className="w-full border-gray-200" />
            <span className="absolute bg-white px-4 text-xs font-medium text-gray-400 uppercase tracking-wider">
              Or continue with
            </span>
          </div>

          {/* Social Login */}
          <div className="flex justify-center transition-transform hover:scale-[1.02]">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => toast.error("Google Login failed")}
              useOneTap
              theme="outline"
              size="large"
              shape="pill"
            />
          </div>

        </form>
      </div>
    </div>
  );
};

export default Login;