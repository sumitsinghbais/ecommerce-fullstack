import React, { useState, useEffect, useContext } from "react";
import { ShopContext } from "../context/ShopContext";
import Title from "../components/Title";
import axios from "axios";

const Orders = () => {
  const { currency } = useContext(ShopContext);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const baseURL = import.meta.env.VITE_API_URL || "http://localhost:4000";
  const token = localStorage.getItem("token");

  const fetchMyOrders = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${baseURL}/api/orders/myorders`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOrders(res.data || []);
    } catch (error) {
      console.error("Failed to fetch orders:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchMyOrders();
  }, []);

  const statusColor = (s) => {
    const m = { Pending: "bg-yellow-500", Shipped: "bg-blue-500", Delivered: "bg-green-500", Cancelled: "bg-red-500" };
    return m[s] || "bg-gray-500";
  };

  const getImageSrc = (url) => {
    if (!url) return "https://via.placeholder.com/80?text=Item";
    if (url.startsWith("http")) return url;
    if (url.startsWith("/uploads/")) return `${baseURL}${url}`;
    return url;
  };

  if (loading) {
    return (
      <div className="border-t pt-16 text-center">
        <div className="text-2xl mb-4"><Title text1={"MY"} text2={"ORDERS"} /></div>
        <p className="text-gray-500 py-10">Loading orders...</p>
      </div>
    );
  }

  return (
    <div className="border-t pt-16">
      <div className="text-2xl">
        <Title text1={"MY"} text2={"ORDERS"} />
      </div>

      {orders.length === 0 ? (
        <div className="text-center py-20">
          <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
          <p className="text-xl font-bold text-gray-700 mb-2">No orders yet</p>
          <p className="text-gray-500">Your order history will appear here after you place an order.</p>
        </div>
      ) : (
        <div>
          {orders.map((order) => (
            <div key={order._id} className="py-4 border-b">
              {/* Order Header */}
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">#{order._id.slice(-8).toUpperCase()}</span>
                  <span className="text-sm text-gray-500">{new Date(order.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold">{currency}{order.totalPrice}</span>
                </div>
              </div>

              {/* Order Items */}
              {(order.orderItems || []).map((item, index) => (
                <div key={index} className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 py-3 px-2 bg-gray-50 rounded-lg mb-2">
                  <div className="flex items-start gap-4 text-sm">
                    <img className="w-16 sm:w-20 rounded-lg object-cover bg-gray-200" src={getImageSrc(item.imageUrl)} alt={item.name} onError={(e) => { e.target.src = "https://via.placeholder.com/80"; }} />
                    <div>
                      <p className="sm:text-base font-medium text-gray-800">{item.name}</p>
                      <div className="flex items-center gap-3 mt-1 text-gray-600">
                        <p>{currency}{item.price}</p>
                        <p>Qty: {item.quantity}</p>
                      </div>
                    </div>
                  </div>

                  <div className="md:w-1/3 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <p className={`min-w-2 h-2 rounded-full ${statusColor(order.status)}`}></p>
                      <p className="text-sm font-medium">{order.status}</p>
                    </div>
                  </div>
                </div>
              ))}

              {/* Shipping Info */}
              {order.shippingAddress && (
                <div className="mt-2 text-xs text-gray-500 flex gap-1 items-center">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  {order.shippingAddress.street}, {order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zipCode}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Orders;