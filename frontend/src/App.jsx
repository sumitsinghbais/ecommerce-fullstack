import React from "react";
import { Routes, Route, useNavigate, useLocation } from "react-router-dom";
import { ShopContext } from "./context/ShopContext";
import { useContext, useEffect } from "react";

import Home from "./pages/Home";
import Collection from "./pages/Collection";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Product from "./pages/Product";
import Cart from "./pages/Cart";
import Login from "./pages/Login";
import Orders from "./pages/Order";
import PlaceOrder from "./pages/PlaceOrder";
import ResetPassword from "./pages/ResetPassword";
import AdminPanel from "./admin/pages/Dashboard";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import SearchBar from "./components/SearchBar";
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const App = () => {
  const { token } = useContext(ShopContext);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const role = localStorage.getItem('role') || 'user';

    // 1. Unauthenticated users -> Force Login
    if (!token && location.pathname !== '/login') {
      navigate('/login');
      return;
    }

    // 2. Authenticated users
    if (token) {
      if (role === 'admin') {
        // Admin must stay in admin panel
        if (location.pathname !== '/admin') {
          navigate('/admin');
        }
      } else {
        // Regular user trying to access admin panel -> Boot to home
        if (location.pathname.startsWith('/admin')) {
          navigate('/');
        }
      }
    }
  }, [token, location.pathname, navigate]);
  
  const isAdmin = localStorage.getItem('role') === 'admin';

  return (
    <div className={isAdmin ? "w-full" : "px-4 sm:px-[5vw] md:px-[7vw] lg:px-[9vw]"}>
      <ToastContainer />
      {token && localStorage.getItem('role') !== 'admin' && <Navbar />}
      {!isAdmin && <SearchBar />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/collection" element={<Collection />} />
        <Route path="/about" element={<About />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/product/:productId" element={<Product />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/login" element={<Login />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/place-order" element={<PlaceOrder />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/admin" element={<AdminPanel />} />
      </Routes>
      {!isAdmin && <Footer />}
    </div>
  );
};

export default App;