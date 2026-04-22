import React, { useContext, useState } from "react";
import { Link, NavLink, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { assets } from "../assets/assets";
import { ShopContext } from "../context/ShopContext";

const Navbar = () => {
  const [visible, setVisible] = useState(false);
  const { setShowSearch, getCartCount, token, setToken } = useContext(ShopContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    setToken("");
    navigate("/login");
  };

  const handleSearch = () => {
    setShowSearch(true);
    if (!location.pathname.includes('/collection')) {
      navigate('/collection');
    }
  };

  const handleCategoryClick = (cat) => {
    navigate(`/collection?category=${cat}`);
  };

  // Active state: check both pathname and query param
  const getNavClass = (path, cat) => {
    const currentCat = searchParams.get("category");
    let isActive = false;
    if (cat) {
      isActive = location.pathname === '/collection' && currentCat === cat;
    } else {
      isActive = location.pathname === path && !currentCat;
    }
    return `px-4 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer ${
      isActive ? 'bg-[#1b2230] text-white' : 'text-gray-600 hover:text-gray-900'
    }`;
  };

  const categories = ["Men", "Women", "Kids", "Footwear", "Accessories"];

  return (
    <div className="flex items-center justify-between py-5 bg-white font-sans">

      {/* Logo */}
      <Link to="/" className="flex items-center gap-2.5 z-50">
        <img src={assets.logo} className="w-32" alt="Logo" />
      </Link>

      {/* Navigation Links - Centered */}
      <ul className="hidden lg:flex items-center gap-1.5 absolute left-1/2 -translate-x-1/2">
        <NavLink to="/" className={({isActive}) => `px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${isActive ? 'bg-[#1b2230] text-white' : 'text-gray-600 hover:text-gray-900'}`}>Home</NavLink>
        <NavLink to="/collection" className={({isActive}) => `px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${isActive ? 'bg-[#1b2230] text-white' : 'text-gray-600 hover:text-gray-900'}`}>Collection</NavLink>
        <NavLink to="/about" className={({isActive}) => `px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${isActive ? 'bg-[#1b2230] text-white' : 'text-gray-600 hover:text-gray-900'}`}>About</NavLink>
        <NavLink to="/contact" className={({isActive}) => `px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${isActive ? 'bg-[#1b2230] text-white' : 'text-gray-600 hover:text-gray-900'}`}>Contact</NavLink>
        <button onClick={handleSearch} className="px-4 py-1.5 rounded-full text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          Search
        </button>
      </ul>

      {/* Right Icons */}
      <div className="flex items-center gap-5 z-50">

        {/* Cart */}
        <Link to="/cart" className="relative group flex items-center">
          <svg className="w-6 h-6 text-gray-800 group-hover:text-[#563EE9] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
          <span className="absolute -top-2 -right-2 bg-[#1b2230] text-white text-[10px] font-bold w-4 h-4 flex items-center justify-center rounded-full border border-white">
            {getCartCount()}
          </span>
        </Link>

        {/* Profile Dropdown */}
        <div className="group relative">
          {token ? (
            <div className="w-8 h-8 bg-[#563EE9] rounded-full text-white flex items-center justify-center font-bold text-sm cursor-pointer shadow-sm hover:shadow-md transition-shadow">
              S {/* Mock Initial or Number '7' as seen in image */}
            </div>
          ) : (
            <Link to="/login" className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors">
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
            </Link>
          )}

          {token && (
            <div className="group-hover:block hidden absolute right-0 pt-4 w-48 z-50">
              <div className="flex flex-col py-2 bg-white shadow-[0_10px_40px_rgba(0,0,0,0.08)] border border-gray-100 rounded-xl transition-all">
                
                <p onClick={() => navigate('/')} className="px-5 py-2.5 cursor-pointer text-sm mb-1 text-gray-700 hover:text-[#563EE9] hover:bg-indigo-50/50 flex items-center gap-3 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                  My Profile
                </p>

                <p onClick={() => navigate('/orders')} className="px-5 py-2.5 cursor-pointer text-sm mb-1 text-gray-700 hover:text-[#563EE9] hover:bg-indigo-50/50 flex items-center gap-3 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                  Orders
                </p>

                <div className="border-t border-gray-100 my-1"></div>

                <p onClick={logout} className="px-5 py-2.5 cursor-pointer text-sm text-red-500 hover:bg-red-50 flex items-center gap-3 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                  Logout
                </p>

              </div>
            </div>
          )}
        </div>

        {/* Menu Icon (Mobile) */}
        <button onClick={() => setVisible(true)} className="lg:hidden">
          <svg className="w-6 h-6 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16m-7 6h7" /></svg>
        </button>

      </div>

      {/* Sidebar (Mobile Menu) */}
      <div className={`fixed inset-0 bg-white z-[9999] transition-transform duration-300 ${visible ? "translate-x-0" : "translate-x-full"}`}>
        <div className="flex flex-col text-gray-800 h-full">
          <div onClick={() => setVisible(false)} className="flex items-center gap-4 p-5 border-b border-gray-100 cursor-pointer">
            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            <p className="font-medium text-lg">Back</p>
          </div>

          <div className="p-4 flex flex-col gap-2 text-lg">
            <NavLink onClick={() => setVisible(false)} className="py-3 px-4 rounded-xl hover:bg-gray-50" to="/">Home</NavLink>
            <NavLink onClick={() => setVisible(false)} className="py-3 px-4 rounded-xl hover:bg-gray-50" to="/collection">All Products</NavLink>
            <div className="border-t border-gray-100 my-2"></div>
            <p className="px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Categories</p>
            {categories.map(cat => (
              <span key={cat} onClick={() => { handleCategoryClick(cat); setVisible(false); }} className="py-3 px-4 rounded-xl hover:bg-gray-50 cursor-pointer">{cat}</span>
            ))}
            <div className="border-t border-gray-100 my-2"></div>
            <NavLink onClick={() => setVisible(false)} className="py-3 px-4 rounded-xl hover:bg-gray-50" to="/about">About Us</NavLink>
            <NavLink onClick={() => setVisible(false)} className="py-3 px-4 rounded-xl hover:bg-gray-50" to="/contact">Contact</NavLink>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Navbar;