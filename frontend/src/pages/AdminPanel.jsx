import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";

const AdminPanel = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const baseURL = import.meta.env.VITE_API_URL || "http://localhost:4000";

  // Form State
  const [formData, setFormData] = useState({
    id: null,
    name: "",
    price: "",
    description: "",
    category: "",
    stock: "",
  });
  const [imageFile, setImageFile] = useState(null);

  const fetchProducts = async () => {
    try {
      const res = await axios.get(`${baseURL}/api/products`);
      setProducts(res.data.products);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load products");
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleEditClick = (product) => {
    setFormData({
      id: product._id,
      name: product.name,
      price: product.price,
      description: product.description,
      category: product.category,
      stock: product.stock,
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteClick = async (id) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;
    try {
      setLoading(true);
      await axios.delete(`${baseURL}/api/products/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      toast.success("Product deleted successfully");
      fetchProducts();
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const data = new FormData();
    data.append("name", formData.name);
    data.append("price", formData.price);
    data.append("description", formData.description || "Detailed description");
    data.append("category", formData.category || "General");
    data.append("stock", formData.stock);
    if (imageFile) {
      data.append("image", imageFile);
    }

    try {
      const config = {
        headers: {
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${localStorage.getItem('token')}`
        }
      };

      if (formData.id) {
        // Update
        await axios.put(`${baseURL}/api/products/${formData.id}`, data, config);
        toast.success("Product updated successfully!");
      } else {
        // Create
        await axios.post(`${baseURL}/api/products`, data, config);
        toast.success("Product created successfully!");
      }

      // Reset form
      setFormData({ id: null, name: "", price: "", description: "", category: "", stock: "" });
      setImageFile(null);
      fetchProducts();
    } catch (error) {
      toast.error(error.response?.data?.message || "Action failed. Are you an admin?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto my-10 p-4">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-light text-gray-800">Admin Dashboard</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left: Product Form */}
        <div className="bg-white p-6 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 h-fit">
          <h2 className="text-xl font-medium mb-5">{formData.id ? "Edit Product" : "Add New Product"}</h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 text-sm">
            
            <div>
              <label className="block text-gray-600 mb-1">Product Name</label>
              <input type="text" name="name" value={formData.name} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-200 rounded focus:border-indigo-500 outline-none transition" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-600 mb-1">Price ($)</label>
                <input type="number" name="price" value={formData.price} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-200 rounded focus:border-indigo-500 outline-none transition" />
              </div>
              <div>
                <label className="block text-gray-600 mb-1">Stock</label>
                <input type="number" name="stock" value={formData.stock} onChange={handleInputChange} required className="w-full px-3 py-2 border border-gray-200 rounded focus:border-indigo-500 outline-none transition" />
              </div>
            </div>

            <div>
              <label className="block text-gray-600 mb-1">Category</label>
              <input type="text" name="category" value={formData.category} onChange={handleInputChange} className="w-full px-3 py-2 border border-gray-200 rounded focus:border-indigo-500 outline-none transition" />
            </div>

            <div>
              <label className="block text-gray-600 mb-1">Product Image</label>
              <input type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files[0])} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100 cursor-pointer" />
            </div>

            <div className="pt-2 flex gap-3">
              <button type="submit" disabled={loading} className="flex-1 bg-indigo-600 text-white py-2.5 rounded-lg hover:bg-indigo-700 transition shadow-md shadow-indigo-200 disabled:opacity-50">
                {loading ? "Saving..." : formData.id ? "Update Product" : "Publish Product"}
              </button>
              {formData.id && (
                <button type="button" onClick={() => setFormData({ id: null, name: "", price: "", description: "", category: "", stock: "" })} className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition">Cancel</button>
              )}
            </div>
          </form>
        </div>

        {/* Right: Products List */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-gray-100 bg-gray-50/50">
            <h2 className="text-xl font-medium">Inventory Overview</h2>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-500">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4">Product</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Price</th>
                  <th className="px-6 py-4">Stock</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product._id} className="bg-white border-b hover:bg-gray-50/50 transition">
                    <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap flex items-center gap-3">
                      <div className="w-10 h-10 rounded bg-gray-100 flex items-center justify-center overflow-hidden">
                        {product.imageUrl ? <img src={`${baseURL}${product.imageUrl}`} className="object-cover w-full h-full" alt="" /> : "🛒"}
                      </div>
                      {product.name}
                    </td>
                    <td className="px-6 py-4">{product.category}</td>
                    <td className="px-6 py-4">${product.price}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${product.stock > 10 ? 'bg-green-100 text-green-700' : product.stock > 0 ? 'bg-orange-100 text-orange-700' : 'bg-red-100 text-red-700'}`}>
                        {product.stock} units
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      <button onClick={() => handleEditClick(product)} className="font-medium text-indigo-600 hover:text-indigo-800 mr-4 transition">Edit</button>
                      <button onClick={() => handleDeleteClick(product._id)} className="font-medium text-red-500 hover:text-red-700 transition">Delete</button>
                    </td>
                  </tr>
                ))}
                {products.length === 0 && (
                  <tr>
                    <td colSpan="5" className="px-6 py-8 text-center text-gray-400">
                      No products found. Start adding some!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AdminPanel;
