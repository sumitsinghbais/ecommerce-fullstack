import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

const DiscountRules = () => {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ minQuantity: '', discountPercentage: '', isActive: true });

  const baseURL = import.meta.env.VITE_API_URL || "http://localhost:4000";
  const token = localStorage.getItem("token");
  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  const fetchRules = async () => {
    try {
      const res = await axios.get(`${baseURL}/api/admin/discount-rules`, authHeaders);
      setRules(res.data);
    } catch (e) { toast.error("Failed to fetch rules"); }
  };

  useEffect(() => { fetchRules(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      if (formData._id) {
        await axios.put(`${baseURL}/api/admin/discount-rules/${formData._id}`, formData, authHeaders);
        toast.success("Rule updated");
      } else {
        await axios.post(`${baseURL}/api/admin/discount-rules`, formData, authHeaders);
        toast.success("Rule created");
      }
      setShowModal(false);
      setFormData({ minQuantity: '', discountPercentage: '', isActive: true });
      fetchRules();
    } catch (e) {
      toast.error(e.response?.data?.message || "Operation failed");
    } finally {
      setLoading(false);
    }
  };

  const deleteRule = async (id) => {
    if (!window.confirm("Delete this rule?")) return;
    try {
      await axios.delete(`${baseURL}/api/admin/discount-rules/${id}`, authHeaders);
      toast.success("Deleted");
      fetchRules();
    } catch (e) { toast.error("Delete failed"); }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-10">
        <div>
          <h1 className="text-2xl font-black text-gray-800 uppercase tracking-tight">Bulk Discount Rules</h1>
          <p className="text-sm text-gray-400 mt-1">Automatically apply discounts based on total item quantity in cart.</p>
        </div>
        <button onClick={() => { setFormData({ minQuantity: '', discountPercentage: '', isActive: true }); setShowModal(true); }}
          className="bg-black text-white px-6 py-3 rounded-2xl text-sm font-black uppercase tracking-widest shadow-xl hover:bg-gray-800 transition-all">
          + Add Rule
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-100">
              <th className="px-8 py-5 text-xs font-black text-gray-400 uppercase tracking-widest">Min. Quantity</th>
              <th className="px-8 py-5 text-xs font-black text-gray-400 uppercase tracking-widest">Discount (%)</th>
              <th className="px-8 py-5 text-xs font-black text-gray-400 uppercase tracking-widest">Status</th>
              <th className="px-8 py-5 text-xs font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rules.map(rule => (
              <tr key={rule._id} className="hover:bg-gray-50/30 transition-colors">
                <td className="px-8 py-5">
                  <span className="text-lg font-bold text-gray-800">📦 {rule.minQuantity}+ Items</span>
                </td>
                <td className="px-8 py-5 font-black text-2xl text-indigo-600">
                  {rule.discountPercentage}% <span className="text-xs text-gray-300 font-medium">OFF</span>
                </td>
                <td className="px-8 py-5">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${rule.isActive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {rule.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-8 py-5 text-right">
                  <div className="flex justify-end gap-3">
                    <button onClick={() => { setFormData(rule); setShowModal(true); }} className="text-xs font-bold text-gray-400 hover:text-indigo-600 transition-colors uppercase">Edit</button>
                    <button onClick={() => deleteRule(rule._id)} className="text-xs font-bold text-red-300 hover:text-red-600 transition-colors uppercase">Delete</button>
                  </div>
                </td>
              </tr>
            ))}
            {rules.length === 0 && (
              <tr>
                <td colSpan="4" className="px-8 py-20 text-center text-gray-400 italic">No bulk rules defined yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-md">
          <div className="bg-white rounded-[40px] w-full max-w-sm overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-300">
            <div className="p-10">
              <h2 className="text-2xl font-black text-gray-800 uppercase tracking-tighter mb-8">{formData._id ? "Edit Rule" : "Create Bulk Rule"}</h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Minimum Quantity Threshold</label>
                  <input type="number" value={formData.minQuantity} onChange={e => setFormData({...formData, minQuantity: e.target.value})} required className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:border-indigo-500 focus:bg-white outline-none transition text-lg font-bold" placeholder="e.g. 5" />
                </div>
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Discount Percentage (%)</label>
                  <input type="number" value={formData.discountPercentage} onChange={e => setFormData({...formData, discountPercentage: e.target.value})} required className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:border-indigo-500 focus:bg-white outline-none transition text-lg font-bold" placeholder="e.g. 15" />
                </div>
                <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-2xl">
                   <input type="checkbox" checked={formData.isActive} onChange={e => setFormData({...formData, isActive: e.target.checked})} className="w-6 h-6 rounded-lg border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
                   <span className="text-xs font-black text-gray-600 uppercase tracking-widest">Rule is {formData.isActive ? 'Enabled' : 'Disabled'}</span>
                </div>
                <div className="pt-4 flex gap-3">
                   <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-4 text-xs font-black text-gray-400 uppercase tracking-widest hover:text-gray-600">Cancel</button>
                   <button type="submit" disabled={loading} className="flex-[2] bg-indigo-600 text-white py-4 rounded-2xl hover:bg-indigo-700 transition shadow-lg shadow-indigo-100 font-black uppercase tracking-widest">
                    {loading ? "Saving..." : "Save Rule"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DiscountRules;
