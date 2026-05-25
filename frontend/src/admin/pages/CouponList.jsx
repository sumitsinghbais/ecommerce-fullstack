import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const CouponList = () => {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    discountType: 'percentage',
    discountValue: '',
    minOrderAmount: '',
    maxDiscount: '',
    expiryDate: '',
    usageLimit: 100,
    isActive: true
  });

  const baseURL = import.meta.env.VITE_API_URL || "http://localhost:4000";
  const token = localStorage.getItem("token");
  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  const fetchCoupons = async () => {
    try {
      const res = await axios.get(`${baseURL}/api/admin/coupons`, authHeaders);
      setCoupons(res.data);
    } catch (e) { toast.error("Failed to fetch coupons"); }
  };

  useEffect(() => { fetchCoupons(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      if (formData._id) {
        await axios.put(`${baseURL}/api/admin/coupons/${formData._id}`, formData, authHeaders);
        toast.success("Coupon updated");
      } else {
        await axios.post(`${baseURL}/api/admin/coupons`, formData, authHeaders);
        toast.success("Coupon created");
      }
      setShowModal(false);
      setFormData({ code: '', discountType: 'percentage', discountValue: '', minOrderAmount: '', maxDiscount: '', expiryDate: '', usageLimit: 100, isActive: true });
      fetchCoupons();
    } catch (e) {
      toast.error(e.response?.data?.message || "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  const deleteCoupon = async (id) => {
    if (!window.confirm("Delete this coupon?")) return;
    try {
      await axios.delete(`${baseURL}/api/admin/coupons/${id}`, authHeaders);
      toast.success("Deleted");
      fetchCoupons();
    } catch (e) { toast.error("Delete failed"); }
  };

  return (
    <div className="p-4 sm:p-0">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Coupon Management</h1>
        <button onClick={() => { setFormData({ code: '', discountType: 'percentage', discountValue: '', minOrderAmount: '', maxDiscount: '', expiryDate: '', usageLimit: 100, isActive: true }); setShowModal(true); }}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-indigo-700 transition-all">
          + New Coupon
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {coupons.map(coupon => (
          <div key={coupon._id} className={`bg-white p-5 rounded-2xl shadow-sm border ${coupon.isActive ? 'border-gray-100' : 'border-red-100 opacity-75'}`}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="text-2xl font-black text-indigo-600 uppercase tracking-tighter">{coupon.code}</span>
                <p className="text-xs text-gray-400 mt-1 font-medium italic">Expires {new Date(coupon.expiryDate).toLocaleDateString()}</p>
              </div>
              <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${coupon.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {coupon.isActive ? 'ACTIVE' : 'INACTIVE'}
              </span>
            </div>
            
            <div className="space-y-2 mb-6">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Discount:</span>
                <span className="font-bold text-gray-900">{coupon.discountValue}{coupon.discountType === 'percentage' ? '%' : '$'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Min Order:</span>
                <span className="font-bold text-gray-900">${coupon.minOrderAmount}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Usage:</span>
                <span className="font-bold text-gray-900">{coupon.usedCount} / {coupon.usageLimit}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => { setFormData(coupon); setShowModal(true); }} className="text-xs font-bold py-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 italic transition-all">Edit Details</button>
              <button onClick={() => deleteCoupon(coupon._id)} className="text-xs font-bold py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-all">Delete</button>
            </div>
          </div>
        ))}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="px-8 py-6 border-b border-gray-100 bg-indigo-50/50 flex justify-between items-center">
              <h2 className="text-xl font-black text-gray-800 uppercase tracking-tight">{formData._id ? "Edit Coupon" : "Create New Coupon"}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl font-light">&times;</button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-4 text-sm font-medium">
              <div>
                <label className="block text-gray-500 text-xs uppercase font-bold mb-1.5 tracking-wider">Coupon Code</label>
                <input type="text" value={formData.code} onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})} required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-indigo-500 focus:bg-white outline-none transition" placeholder="SAVE50" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-500 text-xs uppercase font-bold mb-1.5 tracking-wider">Type</label>
                  <select value={formData.discountType} onChange={e => setFormData({...formData, discountType: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-indigo-500 outline-none">
                    <option value="percentage">Percentage (%)</option>
                    <option value="fixed">Fixed ($)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-gray-500 text-xs uppercase font-bold mb-1.5 tracking-wider">Value</label>
                  <input type="number" value={formData.discountValue} onChange={e => setFormData({...formData, discountValue: e.target.value})} required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-indigo-500 outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-500 text-xs uppercase font-bold mb-1.5 tracking-wider">Min Order ($)</label>
                  <input type="number" value={formData.minOrderAmount} onChange={e => setFormData({...formData, minOrderAmount: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-indigo-500 outline-none" />
                </div>
                <div>
                  <label className="block text-gray-500 text-xs uppercase font-bold mb-1.5 tracking-wider">Expiry Date</label>
                  <input type="date" value={formData.expiryDate ? formData.expiryDate.split('T')[0] : ''} onChange={e => setFormData({...formData, expiryDate: e.target.value})} required className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-indigo-500 outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-500 text-xs uppercase font-bold mb-1.5 tracking-wider">Usage Limit</label>
                  <input type="number" value={formData.usageLimit} onChange={e => setFormData({...formData, usageLimit: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:border-indigo-500 outline-none" />
                </div>
                <div className="flex items-center pt-8">
                   <label className="flex items-center gap-3 cursor-pointer">
                      <input type="checkbox" checked={formData.isActive} onChange={e => setFormData({...formData, isActive: e.target.checked})} className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                      <span className="text-xs font-bold text-gray-600 uppercase">Status: {formData.isActive ? 'Active' : 'Inactive'}</span>
                   </label>
                </div>
              </div>
              <button type="submit" disabled={loading} className="w-full bg-indigo-600 text-white py-4 rounded-2xl hover:bg-indigo-700 transition shadow-lg shadow-indigo-100 font-black uppercase tracking-widest mt-4">
                {loading ? "Processing..." : "Save Coupon"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CouponList;
