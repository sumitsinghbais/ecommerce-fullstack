import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { assets } from "../../assets/assets";
import CouponList from "./CouponList";
import DiscountRules from "./DiscountRules";

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({ users: 0, products: 0, orders: 0, revenue: 0 });
  const [loading, setLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const navigate = useNavigate();
  const baseURL = import.meta.env.VITE_API_URL || "http://localhost:4000";
  const token = localStorage.getItem("token");
  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  const [formData, setFormData] = useState({ id: null, name: "", price: "", description: "", category: "", stock: "" });
  const [imageFile, setImageFile] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkMode, setIsBulkMode] = useState(false);

  // ── Fetch Functions ──
  const fetchProducts = async () => {
    try {
      const res = await axios.get(`${baseURL}/api/products?limit=100`);
      setProducts(res.data.products || []);
    } catch (e) { toast.error("Failed to load products"); }
  };

  const fetchOrders = async () => {
    try {
      const res = await axios.get(`${baseURL}/api/orders`, authHeaders);
      setOrders(res.data || []);
    } catch (e) { console.error(e); }
  };

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${baseURL}/api/analytics`, authHeaders);
      setStats(res.data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchProducts(); fetchOrders(); fetchStats(); }, []);

  // ── Handlers ──
  const handleLogout = () => { localStorage.removeItem("token"); localStorage.removeItem("role"); navigate("/login"); window.location.reload(); };
  const handleInputChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleEditClick = (product) => {
    setFormData({ id: product._id, name: product.name, price: product.price, description: product.description, category: product.category, stock: product.stock });
    setShowAddModal(true);
  };

  const handleDeleteClick = async (id) => {
    if (!window.confirm("Delete this product?")) return;
    try { setLoading(true); await axios.delete(`${baseURL}/api/products/${id}`, authHeaders); toast.success("Deleted"); fetchProducts(); setSelectedIds(prev => prev.filter(pId => pId !== id)); }
    catch (e) { toast.error(e.response?.data?.message || "Failed"); }
    finally { setLoading(false); }
  };

  const handleBulkDelete = async () => {
    if (!window.confirm(`Delete ${selectedIds.length} products?`)) return;
    try {
      setLoading(true);
      await axios.delete(`${baseURL}/api/products/bulk`, {
        headers: { Authorization: `Bearer ${token}` },
        data: { ids: selectedIds }
      });
      toast.success(`${selectedIds.length} products deleted`);
      setSelectedIds([]);
      fetchProducts();
    } catch (e) {
      toast.error(e.response?.data?.message || "Bulk delete failed");
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === products.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(products.map(p => p._id));
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true);
    const data = new FormData();
    data.append("name", formData.name); data.append("price", formData.price);
    data.append("description", formData.description || "High quality product");
    data.append("category", formData.category || "General"); data.append("stock", formData.stock);
    if (imageFile) data.append("image", imageFile);
    const config = { headers: { "Content-Type": "multipart/form-data", Authorization: `Bearer ${token}` } };
    try {
      if (formData.id) { await axios.put(`${baseURL}/api/products/${formData.id}`, data, config); toast.success("Updated!"); }
      else { await axios.post(`${baseURL}/api/products`, data, config); toast.success("Created!"); }
      setFormData({ id: null, name: "", price: "", description: "", category: "", stock: "" }); setImageFile(null); setShowAddModal(false); fetchProducts();
    } catch (e) { toast.error(e.response?.data?.message || "Failed"); }
    finally { setLoading(false); }
  };

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await axios.put(`${baseURL}/api/orders/${orderId}/status`, { status: newStatus }, authHeaders);
      toast.success(`Order ${newStatus}`);
      fetchOrders();
    } catch (e) { toast.error(e.response?.data?.message || "Failed to update"); }
  };

  const getImageSrc = (url) => {
    if (!url) return "https://via.placeholder.com/300?text=No+Image";
    if (url.startsWith("http")) return url;
    if (url.startsWith("/uploads/")) return `${baseURL}${url}`;
    return url;
  };

  const statusColor = (s) => {
    const m = { Pending: "bg-yellow-100 text-yellow-800", Shipped: "bg-blue-100 text-blue-800", Delivered: "bg-green-100 text-green-800", Cancelled: "bg-red-100 text-red-800" };
    return m[s] || "bg-gray-100 text-gray-800";
  };

  // ── Sidebar nav items ──
  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: "M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" },
    { id: "products", label: "Products", icon: "M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" },
    { id: "orders", label: "Orders", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
    { id: "coupons", label: "Coupons", icon: "M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" },
    { id: "discounts", label: "Discounts", icon: "M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" },
  ];

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans relative">
      
      {/* ── Sidebar Overlay (Mobile only) ── */}
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)}
          className="lg:hidden fixed inset-0 bg-black/40 z-30 backdrop-blur-sm"
        />
      )}

      {/* ── Sidebar ── */}
      <div className={`fixed lg:relative z-40 w-64 bg-[#f8f9fa] border-r border-gray-200 flex flex-col h-full transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <div className="h-16 flex items-center justify-between px-6 border-b border-gray-200 bg-white">
          <img src={assets.logo} className="w-24" alt="Logo" />
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-1 text-gray-400 hover:text-gray-600">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="p-4 flex-1 overflow-y-auto">
          <p className="text-xs font-semibold text-gray-400 mb-4 px-2 tracking-wider mt-4 uppercase">Main Menu</p>
          <nav className="flex flex-col gap-1">
            {navItems.map(item => (
              <button key={item.id} onClick={() => { setActiveTab(item.id); if (window.innerWidth < 1024) setIsSidebarOpen(false); }}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors w-full text-left ${activeTab === item.id ? 'text-indigo-700 bg-indigo-50 font-medium shadow-sm' : 'text-gray-600 hover:bg-gray-100'}`}>
                <svg className={`w-5 h-5 ${activeTab === item.id ? 'text-indigo-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} /></svg>
                <span className="text-sm">{item.label}</span>
                {item.id === "orders" && orders.length > 0 && <span className="ml-auto bg-indigo-600 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full">{orders.filter(o => o.status === 'Pending').length || 0}</span>}
              </button>
            ))}
          </nav>
        </div>
        <div className="p-4 border-t border-gray-200">
           <button onClick={handleLogout} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors w-full text-left">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              <span className="text-sm font-medium">Logout System</span>
           </button>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-gray-50 relative">
        
        {/* Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="lg:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" /></svg>
            </button>
            <h2 className="text-lg font-semibold text-gray-700 capitalize">{activeTab}</h2>
          </div>
          <div className="flex items-center gap-2 sm:gap-5">
            <div className="flex items-center gap-2 sm:gap-3 pl-3 sm:pl-5 border-l border-gray-200">
              <div className="text-right hidden md:block">
                <p className="text-sm font-semibold text-gray-800 leading-tight">Admin</p>
                <p className="text-xs text-gray-500">Administrator</p>
              </div>
              <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">A</div>
              <button onClick={handleLogout} className="p-2 text-gray-400 hover:text-red-500 transition-colors" title="Logout">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-3 sm:p-6">

          {/* ════════════════ DASHBOARD TAB ════════════════ */}
          {activeTab === "dashboard" && (
            <div>
              <h1 className="text-2xl font-bold text-gray-800 mb-6">Dashboard Overview</h1>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {[
                  { label: "Total Revenue", value: `$${stats.totalRevenue || 0}`, color: "bg-green-500", icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" },
                  { label: "Total Orders", value: stats.totalOrders || orders.length, color: "bg-blue-500", icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" },
                  { label: "Total Products", value: stats.totalProducts || products.length, color: "bg-purple-500", icon: "M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" },
                  { label: "Total Users", value: stats.totalUsers || 0, color: "bg-orange-500", icon: "M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" },
                ].map((card, i) => (
                  <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center justify-between mb-4">
                      <div className={`${card.color} w-12 h-12 rounded-xl flex items-center justify-center`}>
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={card.icon} /></svg>
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{card.value}</p>
                    <p className="text-sm text-gray-500 mt-1">{card.label}</p>
                  </div>
                ))}
              </div>

              {/* Recent Orders */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-bold text-gray-800">Recent Orders</h3>
                  <button onClick={() => setActiveTab("orders")} className="text-indigo-600 text-sm font-medium hover:underline">View All</button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs text-gray-500 uppercase"><tr>
                      <th className="px-6 py-3 text-left">Order ID</th><th className="px-6 py-3 text-left">Customer</th><th className="px-6 py-3 text-left">Total</th><th className="px-6 py-3 text-left">Status</th><th className="px-6 py-3 text-left">Date</th>
                    </tr></thead>
                    <tbody>
                      {orders.slice(0, 5).map(order => (
                        <tr key={order._id} className="border-b hover:bg-gray-50/50">
                          <td className="px-6 py-3 font-mono text-xs text-gray-600">#{order._id.slice(-6)}</td>
                          <td className="px-6 py-3 text-gray-800 font-medium">{order.user?.name || "Customer"}</td>
                          <td className="px-6 py-3 font-semibold">${order.totalPrice}</td>
                          <td className="px-6 py-3"><span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusColor(order.status)}`}>{order.status}</span></td>
                          <td className="px-6 py-3 text-gray-500">{new Date(order.createdAt).toLocaleDateString()}</td>
                        </tr>
                      ))}
                      {orders.length === 0 && <tr><td colSpan="5" className="px-6 py-8 text-center text-gray-400">No orders yet</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ════════════════ PRODUCTS TAB ════════════════ */}
          {activeTab === "products" && (
            <div>
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                <div className="flex items-center gap-4">
                  <h1 className="text-2xl font-bold text-gray-800">Products ({products.length})</h1>
                  {isBulkMode && products.length > 0 && (
                    <div className="flex items-center gap-2 bg-white border border-gray-200 px-3 py-1.5 rounded-lg shadow-sm animate-in fade-in slide-in-from-left-2 duration-300">
                      <input type="checkbox" checked={selectedIds.length === products.length && products.length > 0} onChange={toggleSelectAll} className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Select All</span>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                  {!isBulkMode ? (
                    <>
                      <button onClick={() => setIsBulkMode(true)} className="bg-white border border-gray-200 text-gray-700 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50 transition-all shadow-sm flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        Remove Products
                      </button>
                      <button onClick={() => { setFormData({ id: null, name: "", price: "", description: "", category: "", stock: "" }); setShowAddModal(true); }}
                        className="bg-[#0f172a] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-black transition-colors shadow-sm">
                        + Add Product
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => { setIsBulkMode(false); setSelectedIds([]); }} className="text-gray-500 hover:text-gray-700 font-medium text-sm px-4">
                        Cancel
                      </button>
                      <button onClick={handleBulkDelete} disabled={loading || selectedIds.length === 0} className="bg-red-600 text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-200 disabled:bg-gray-300 disabled:shadow-none">
                        Confirm Delete ({selectedIds.length})
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-6">
                {products.map((product) => (
                  <div key={product._id} className={`bg-white rounded-xl p-2 sm:p-4 shadow-sm border ${selectedIds.includes(product._id) ? 'border-indigo-600 ring-1 ring-indigo-600' : 'border-gray-100'} flex flex-col hover:shadow-md transition-all relative`}>
                    {isBulkMode && (
                      <div className="absolute top-3 left-3 z-10 animate-in zoom-in duration-200">
                        <input type="checkbox" checked={selectedIds.includes(product._id)} onChange={() => toggleSelect(product._id)} className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer shadow-sm" />
                      </div>
                    )}
                    <div onClick={() => isBulkMode && toggleSelect(product._id)} className={`aspect-square bg-gray-50 rounded-lg mb-2 overflow-hidden flex items-center justify-center border border-gray-50 ${isBulkMode ? 'cursor-pointer' : ''}`}>
                      <img src={getImageSrc(product.imageUrl)} className="w-full h-full object-cover" alt={product.name} onError={(e) => { e.target.src = "https://via.placeholder.com/300?text=No+Image"; }} />
                    </div>
                    <div className="flex-1 flex flex-col">
                      <h3 className="font-bold text-gray-900 text-xs sm:text-base line-clamp-1 mb-0.5">{product.name}</h3>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[8px] sm:text-xs bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded-full font-bold uppercase">{product.category}</span>
                        <span className={`text-[8px] sm:text-xs px-1.5 py-0.5 rounded-full font-bold ${product.stock > 10 ? 'bg-green-50 text-green-600' : product.stock > 0 ? 'bg-orange-50 text-orange-600' : 'bg-red-50 text-red-600'}`}>{product.stock}</span>
                      </div>
                      <div className="mt-1 mb-2">
                        <span className="text-sm sm:text-lg font-black text-gray-900">${product.price}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 mt-auto">
                        <button onClick={() => handleEditClick(product)} className="w-full bg-[#f8f9fa] border border-gray-200 text-gray-700 py-1.5 rounded-lg text-xs font-bold hover:bg-gray-100 transition-colors">Edit</button>
                        <button onClick={() => handleDeleteClick(product._id)} className="w-full bg-red-50 text-red-600 py-1.5 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors">Delete</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {products.length === 0 && <div className="text-center py-20 text-gray-500">No products found.</div>}
            </div>
          )}

          {/* ════════════════ ORDERS TAB ════════════════ */}
          {activeTab === "orders" && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Order Management ({orders.length})</h1>
                <button onClick={fetchOrders} className="text-sm text-indigo-600 font-medium hover:underline">↻ Refresh</button>
              </div>

              {orders.length === 0 ? (
                <div className="bg-white rounded-2xl p-16 text-center border border-gray-100">
                  <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                  <p className="text-xl font-bold text-gray-800 mb-2">No orders yet</p>
                  <p className="text-gray-500">Orders placed by customers will appear here.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {orders.map(order => (
                    <div key={order._id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                      {/* Order Header */}
                      <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-4">
                          <span className="font-mono text-sm text-gray-600 font-semibold">#{order._id.slice(-8).toUpperCase()}</span>
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusColor(order.status)}`}>{order.status}</span>
                          {order.isPaid && <span className="px-2 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">💰 Paid</span>}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-500">
                          <span>{new Date(order.createdAt).toLocaleString()}</span>
                          <span className="font-bold text-gray-900 text-lg">${order.totalPrice}</span>
                        </div>
                      </div>

                      {/* Order Body */}
                      <div className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          {/* Items */}
                          <div className="md:col-span-2">
                            <p className="text-xs font-semibold text-gray-400 uppercase mb-3">Items ({order.orderItems?.length || 0})</p>
                            <div className="space-y-2">
                              {(order.orderItems || []).map((item, i) => (
                                <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
                                  <img src={getImageSrc(item.imageUrl)} className="w-12 h-12 rounded-lg object-cover bg-gray-200" alt="" onError={(e) => { e.target.src = "https://via.placeholder.com/48"; }} />
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-gray-800 truncate">{item.name}</p>
                                    <p className="text-xs text-gray-500">Qty: {item.quantity} × ${item.price}</p>
                                  </div>
                                  <p className="text-sm font-bold text-gray-900">${item.quantity * item.price}</p>
                                </div>
                              ))}
                            </div>
                          </div>

                          {/* Shipping + Actions */}
                          <div>
                            <p className="text-xs font-semibold text-gray-400 uppercase mb-3">Shipping</p>
                            {order.shippingAddress && (
                              <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600 mb-4">
                                <p>{order.shippingAddress.street}</p>
                                <p>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}</p>
                                <p>{order.shippingAddress.country}</p>
                              </div>
                            )}
                            <p className="text-xs font-semibold text-gray-400 uppercase mb-3">Update Order Lifecycle</p>
                            {(order.status === 'Delivered' || order.status === 'Cancelled') ? (
                              <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 text-center">
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest italic">Order finalized</p>
                                <p className="text-[10px] text-gray-400 mt-1 uppercase">No further changes allowed</p>
                              </div>
                            ) : (
                              <div className="flex flex-col gap-2">
                                {["Pending", "Shipped", "Delivered", "Cancelled"].map(s => {
                                  const validTransitions = {
                                    'Pending': ['Shipped', 'Cancelled'],
                                    'Shipped': ['Delivered']
                                  };
                                  const isAllowed = validTransitions[order.status]?.includes(s);
                                  
                                  return (
                                    <button 
                                      key={s} 
                                      onClick={() => handleStatusChange(order._id, s)} 
                                      disabled={order.status === s || !isAllowed}
                                      className={`w-full py-2 rounded-lg text-xs font-bold transition-all ${order.status === s ? 'bg-indigo-600 text-white shadow-md' : isAllowed ? 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100' : 'bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed opacity-50'}`}>
                                      {s === order.status ? `✓ ${s}` : s}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ════════════════ COUPONS TAB ════════════════ */}
          {activeTab === "coupons" && <CouponList />}

          {/* ════════════════ DISCOUNTS TAB ════════════════ */}
          {activeTab === "discounts" && <DiscountRules />}
        </main>
      </div>

      {/* ── Add/Edit Product Modal ── */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
              <h2 className="text-xl font-bold text-gray-800">{formData.id ? "Edit Product" : "Add New Product"}</h2>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600 text-xl font-bold">&times;</button>
            </div>
            <div className="p-6">
              <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-sm">
                <div>
                  <label className="block text-gray-600 mb-1 font-medium">Product Name</label>
                  <input type="text" name="name" value={formData.name} onChange={handleInputChange} required className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-indigo-500 outline-none transition" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-600 mb-1 font-medium">Price ($)</label>
                    <input type="number" name="price" value={formData.price} onChange={handleInputChange} required className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-indigo-500 outline-none transition" />
                  </div>
                  <div>
                    <label className="block text-gray-600 mb-1 font-medium">Stock</label>
                    <input type="number" name="stock" value={formData.stock} onChange={handleInputChange} required className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-indigo-500 outline-none transition" />
                  </div>
                </div>
                <div>
                  <label className="block text-gray-600 mb-1 font-medium">Category</label>
                  <input type="text" name="category" value={formData.category} onChange={handleInputChange} className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-indigo-500 outline-none transition" />
                </div>
                <div>
                  <label className="block text-gray-600 mb-1 font-medium">Description</label>
                  <textarea name="description" value={formData.description} onChange={handleInputChange} rows="2" className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:border-indigo-500 outline-none transition resize-none" />
                </div>
                <div>
                  <label className="block text-gray-600 mb-1 font-medium">Image</label>
                  <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files[0])} className="w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 cursor-pointer" />
                </div>
                <button type="submit" disabled={loading} className="w-full bg-[#1b2230] text-white py-3 rounded-xl hover:bg-black transition font-medium mt-2">
                  {loading ? "Saving..." : formData.id ? "Save Changes" : "Publish Product"}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
