import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import { assets } from "../../assets/assets";

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
    try { setLoading(true); await axios.delete(`${baseURL}/api/products/${id}`, authHeaders); toast.success("Deleted"); fetchProducts(); }
    catch (e) { toast.error(e.response?.data?.message || "Failed"); }
    finally { setLoading(false); }
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
  ];

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden font-sans">
      
      {/* ── Sidebar ── */}
      <div className={`w-64 bg-[#f8f9fa] border-r border-gray-200 flex flex-col transition-transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 absolute lg:relative z-20 h-full`}>
        <div className="h-16 flex items-center px-6 border-b border-gray-200">
          <img src={assets.logo} className="w-28" alt="Logo" />
        </div>
        <div className="p-4 flex-1 overflow-y-auto">
          <p className="text-xs font-semibold text-gray-400 mb-4 px-2 tracking-wider mt-4">MAIN MENU</p>
          <nav className="flex flex-col gap-1">
            {navItems.map(item => (
              <button key={item.id} onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors w-full text-left ${activeTab === item.id ? 'text-indigo-700 bg-indigo-50 font-medium' : 'text-gray-600 hover:bg-gray-100'}`}>
                <svg className={`w-5 h-5 ${activeTab === item.id ? 'text-indigo-600' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} /></svg>
                {item.label}
                {item.id === "orders" && orders.length > 0 && <span className="ml-auto bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full">{orders.filter(o => o.status === 'Pending').length || 0}</span>}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* ── Main Content ── */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-gray-50">
        
        {/* Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="lg:hidden p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" /></svg>
          </button>
          <h2 className="text-lg font-semibold text-gray-700 capitalize hidden lg:block">{activeTab}</h2>
          <div className="ml-auto flex items-center gap-5">
            <div className="flex items-center gap-3 pl-5 border-l border-gray-200">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-gray-800 leading-tight">Admin</p>
                <p className="text-xs text-gray-500">Administrator</p>
              </div>
              <div className="w-9 h-9 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm">A</div>
              <button onClick={handleLogout} className="ml-2 text-gray-400 hover:text-red-500" title="Logout">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">

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
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Products ({products.length})</h1>
                <button onClick={() => { setFormData({ id: null, name: "", price: "", description: "", category: "", stock: "" }); setShowAddModal(true); }}
                  className="bg-[#1b2230] text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-black transition-colors shadow-sm">
                  + Add Product
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {products.map((product) => (
                  <div key={product._id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col">
                    <div className="aspect-[4/3] bg-gray-100 rounded-xl mb-4 overflow-hidden flex items-center justify-center">
                      <img src={getImageSrc(product.imageUrl)} className="w-full h-full object-cover" alt={product.name} onError={(e) => { e.target.src = "https://via.placeholder.com/300?text=No+Image"; }} />
                    </div>
                    <h3 className="font-bold text-gray-900 text-base line-clamp-1 mb-1">{product.name}</h3>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">{product.category}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${product.stock > 10 ? 'bg-green-100 text-green-700' : product.stock > 0 ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>{product.stock} in stock</span>
                    </div>
                    <span className="text-xl font-bold text-gray-900 mb-3">${product.price}</span>
                    <div className="grid grid-cols-2 gap-2 mt-auto">
                      <button onClick={() => handleEditClick(product)} className="w-full bg-[#4285F4] text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors">Edit</button>
                      <button onClick={() => handleDeleteClick(product._id)} className="w-full bg-[#EA4335] text-white py-2 rounded-lg text-sm font-medium hover:bg-red-600 transition-colors">Delete</button>
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
                            <p className="text-xs font-semibold text-gray-400 uppercase mb-3">Update Status</p>
                            <div className="flex flex-col gap-2">
                              {["Pending", "Shipped", "Delivered", "Cancelled"].map(s => (
                                <button key={s} onClick={() => handleStatusChange(order._id, s)} disabled={order.status === s}
                                  className={`w-full py-2 rounded-lg text-xs font-bold transition-all ${order.status === s ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-100'}`}>
                                  {s === order.status ? `✓ ${s}` : s}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
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
