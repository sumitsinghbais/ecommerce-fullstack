import React, { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import Title from "../components/Title";

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");
  const email = searchParams.get("email");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      return toast.error("Passwords do not match");
    }

    setLoading(true);
    const baseURL = import.meta.env.VITE_API_URL || "http://localhost:4000";
    try {
      await axios.post(`${baseURL}/api/auth/reset-password`, { 
        email, 
        otp: token, // We use the token as the OTP in this flow
        newPassword 
      });
      toast.success("Password updated! Please login.");
      navigate("/login");
    } catch (error) {
      toast.error(error.response?.data?.message || "Invalid or expired link");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
        <div className="text-center mb-8">
          <Title text1={"RESET"} text2={"PASSWORD"} />
          <p className="text-gray-500 text-sm mt-2">Enter your new secure password below</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">New Password</label>
            <input
              type="password"
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none"
              placeholder="Min. 8 characters"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password</label>
            <input
              type="password"
              className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none"
              placeholder="Repeat password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white font-medium py-3 rounded-xl hover:bg-gray-800 transition-all"
          >
            {loading ? "Updating..." : "Update Password"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
