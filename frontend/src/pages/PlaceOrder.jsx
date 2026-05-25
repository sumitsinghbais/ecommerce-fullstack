import React, { useState, useContext, useEffect } from "react";
import Title from "../components/Title";
import CartTotal from "../components/CartTotal";
import { assets } from "../assets/assets";
import { useNavigate } from "react-router-dom";
import { ShopContext } from "../context/ShopContext";
import axios from "axios";
import { toast } from "react-toastify";

const PlaceOrder = () => {
  const [method, setMethod] = useState("cod");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { cartItems, products, getCartAmount, delivery_fee, setCartItems } = useContext(ShopContext);
  const baseURL = import.meta.env.VITE_API_URL || "http://localhost:4000";
  const token = localStorage.getItem("token");

  const [formData, setFormData] = useState({
    firstName: "", lastName: "", email: "", street: "",
    city: "", state: "", zipCode: "", country: "", phone: "",
  });

  // Fetch user address from profile on mount
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!token) return;
      try {
        const { data } = await axios.get(`${baseURL}/api/users/profile`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (data.address) {
          const name = data.name || "";
          const nameParts = name.split(' ');
          setFormData(prev => ({
            ...prev,
            firstName: nameParts[0] || "",
            lastName: nameParts.slice(1).join(' ') || "",
            email: data.email || "",
            street: data.address.street || "",
            city: data.address.city || "",
            state: data.address.state || "",
            zipCode: data.address.zipCode || "",
            country: data.address.country || "",
          }));
        }
      } catch (error) {
        console.error("Error fetching user profile:", error);
      }
    };
    fetchUserProfile();
  }, [token]);

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [bulkDiscount, setBulkDiscount] = useState(0);
  const [rules, setRules] = useState([]);

  // Fetch bulk rules on mount
  useEffect(() => {
    const fetchRules = async () => {
      try {
        const { data } = await axios.get(`${baseURL}/api/coupons/rules`);
        setRules(data);
      } catch (e) { console.error("Error fetching rules"); }
    };
    fetchRules();
  }, []);

  // Calculate Bulk Discount
  useEffect(() => {
    let totalQty = 0;
    for (const itemId in cartItems) {
      for (const size in cartItems[itemId]) {
        totalQty += cartItems[itemId][size];
      }
    }
    const applicableRule = rules.sort((a,b) => b.minQuantity - a.minQuantity).find(r => totalQty >= r.minQuantity && r.isActive);
    if (applicableRule) {
      setBulkDiscount((getCartAmount() * applicableRule.discountPercentage) / 100);
    } else {
      setBulkDiscount(0);
    }
  }, [cartItems, rules, getCartAmount]);

  const handleApplyCoupon = async () => {
    if (!couponCode) return;
    try {
      const amountAfterBulk = getCartAmount() - bulkDiscount;
      const { data } = await axios.post(`${baseURL}/api/coupons/apply`, { 
        code: couponCode, 
        cartAmount: amountAfterBulk 
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setAppliedCoupon(data);
      toast.success("Coupon applied!");
    } catch (error) {
      toast.error(error.response?.data?.message || "Invalid coupon");
      setAppliedCoupon(null);
    }
  };

  const handlePlaceOrder = async () => {
    const orderItems = [];
    for (const itemId in cartItems) {
      for (const size in cartItems[itemId]) {
        const product = products.find(p => p._id === itemId);
        if (product && cartItems[itemId][size] > 0) {
          orderItems.push({
            product: product._id,
            name: product.name,
            quantity: cartItems[itemId][size],
            price: product.price,
            imageUrl: product.imageUrl || (product.image ? (Array.isArray(product.image) ? product.image[0] : product.image) : ""),
          });
        }
      }
    }

    if (orderItems.length === 0) {
      toast.error("Your cart is empty!");
      return;
    }

    if (!formData.street || !formData.city || !formData.state || !formData.zipCode || !formData.country) {
      toast.error("Please fill in all shipping details");
      return;
    }

    const orderData = {
      orderItems,
      shippingAddress: {
        street: formData.street,
        city: formData.city,
        state: formData.state,
        zipCode: formData.zipCode,
        country: formData.country,
      },
      paymentMethod: method === "cod" ? "Cash on Delivery" : method === "stripe" ? "Stripe" : "Razorpay",
      couponCode: appliedCoupon ? appliedCoupon.code : "",
    };

    try {
      setLoading(true);
      const res = await axios.post(`${baseURL}/api/orders`, orderData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      toast.success("Order placed successfully! 🎉");
      setCartItems({});
      navigate("/orders");
    } catch (error) {
      console.error("Order error:", error);
      toast.error(error.response?.data?.message || "Failed to place order");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col sm:flex-row justify-between gap-4 pt-5 sm:pt-14 min-h-[80vh]">

      {/* Left Side - Delivery Form */}
      <div className="flex flex-col gap-4 w-full sm:max-w-[480px]">
        <div className="text-xl sm:text-2xl my-3">
          <Title text1={"DELIVERY"} text2={"INFORMATION"} />
        </div>

        <div className="flex gap-3">
          <input name="firstName" value={formData.firstName} onChange={handleChange} className="border border-gray-300 rounded py-1.5 px-3.5 w-full" type="text" placeholder="First name" />
          <input name="lastName" value={formData.lastName} onChange={handleChange} className="border border-gray-300 rounded py-1.5 px-3.5 w-full" type="text" placeholder="Last name" />
        </div>
        <input name="email" value={formData.email} onChange={handleChange} className="border border-gray-300 rounded py-1.5 px-3.5 w-full" type="email" placeholder="Email address" />
        <input name="street" value={formData.street} onChange={handleChange} className="border border-gray-300 rounded py-1.5 px-3.5 w-full" type="text" placeholder="Street" required />
        <div className="flex gap-3">
          <input name="city" value={formData.city} onChange={handleChange} className="border border-gray-300 rounded py-1.5 px-3.5 w-full" type="text" placeholder="City" required />
          <input name="state" value={formData.state} onChange={handleChange} className="border border-gray-300 rounded py-1.5 px-3.5 w-full" type="text" placeholder="State" required />
        </div>
        <div className="flex gap-3">
          <input name="zipCode" value={formData.zipCode} onChange={handleChange} className="border border-gray-300 rounded py-1.5 px-3.5 w-full" type="text" placeholder="Zipcode" required />
          <input name="country" value={formData.country} onChange={handleChange} className="border border-gray-300 rounded py-1.5 px-3.5 w-full" type="text" placeholder="Country" required />
        </div>
        <input name="phone" value={formData.phone} onChange={handleChange} className="border border-gray-300 rounded py-1.5 px-3.5 w-full" type="text" placeholder="Phone" />
      </div>

      {/* Right Side */}
      <div className="mt-8">
        <div className="mt-8 min-w-80">
          <Title text1={"ORDER"} text2={"SUMMARY"} />
          <div className="flex flex-col gap-2 mt-2 text-sm">
            <div className="flex justify-between">
              <p>Subtotal</p>
              <p>${getCartAmount().toFixed(2)}</p>
            </div>
            {bulkDiscount > 0 && (
              <div className="flex justify-between text-green-600 font-medium">
                <p>Bulk Discount (Auto)</p>
                <p>- ${bulkDiscount.toFixed(2)}</p>
              </div>
            )}
            {appliedCoupon && (
              <div className="flex justify-between text-indigo-600 font-medium">
                <p>Coupon ({appliedCoupon.code})</p>
                <p>- ${appliedCoupon.discount.toFixed(2)}</p>
              </div>
            )}
            <hr />
            <div className="flex justify-between">
              <p>Shipping Fee</p>
              <p>${(getCartAmount() - bulkDiscount > 100 ? 0 : 10).toFixed(2)}</p>
            </div>
            <div className="flex justify-between">
              <p>Tax (5%)</p>
              <p>${(0.05 * (getCartAmount() - bulkDiscount - (appliedCoupon?.discount || 0))).toFixed(2)}</p>
            </div>
            <hr />
            <div className="flex justify-between text-base font-bold">
              <p>Total</p>
              <p>${(getCartAmount() - bulkDiscount - (appliedCoupon?.discount || 0) + (getCartAmount() - bulkDiscount > 100 ? 0 : 10) + (0.05 * (getCartAmount() - bulkDiscount - (appliedCoupon?.discount || 0)))).toFixed(2)}</p>
            </div>
          </div>

          {/* Coupon Input */}
          <div className="mt-8">
            <div className="flex gap-2">
              <input 
                type="text" 
                value={couponCode} 
                onChange={(e) => setCouponCode(e.target.value)} 
                placeholder="PROMO CODE"
                className="border border-gray-300 rounded py-2 px-3 w-full outline-none uppercase text-xs font-bold tracking-widest"
              />
              <button 
                onClick={handleApplyCoupon}
                className="bg-black text-white px-4 py-2 text-xs font-bold hover:bg-gray-800 transition-colors"
                disabled={!couponCode || appliedCoupon}
              >
                APPLY
              </button>
            </div>
            {appliedCoupon && (
              <div className="flex items-center justify-between bg-green-50 text-green-700 px-3 py-2 rounded mt-2 text-xs font-medium">
                 <span>Code <b>{appliedCoupon.code}</b> applied!</span>
                 <button onClick={() => {setAppliedCoupon(null); setCouponCode("");}} className="hover:text-green-900">&times;</button>
              </div>
            )}
          </div>
        </div>

        {/* Payment Method */}
        <div className="mt-12">
          <Title text1={"PAYMENT"} text2={"METHOD"} />
          <div className="flex gap-3 flex-col lg:flex-row mt-4">
            <div onClick={() => setMethod("stripe")} className="flex items-center gap-3 border p-2 px-3 cursor-pointer">
              <p className={`min-w-3.5 h-3.5 border rounded-full ${method === "stripe" ? "bg-green-400" : ""}`}></p>
              <img className="h-5 mx-4" src={assets.stripe_logo} alt="" />
            </div>
            <div onClick={() => setMethod("razorpay")} className="flex items-center gap-3 border p-2 px-3 cursor-pointer">
              <p className={`min-w-3.5 h-3.5 border rounded-full ${method === "razorpay" ? "bg-green-400" : ""}`}></p>
              <img className="h-5 mx-4" src={assets.razorpay_logo} alt="" />
            </div>
            <div onClick={() => setMethod("cod")} className="flex items-center gap-3 border p-2 px-3 cursor-pointer">
              <p className={`min-w-3.5 h-3.5 border rounded-full ${method === "cod" ? "bg-green-400" : ""}`}></p>
              <p className="text-gray-500 text-sm font-medium mx-4">CASH ON DELIVERY</p>
            </div>
          </div>

          <div className="w-full text-end mt-8">
            <button
              onClick={handlePlaceOrder}
              disabled={loading}
              className="bg-black text-white px-16 py-3 text-sm disabled:bg-gray-400"
            >
              {loading ? "PLACING ORDER..." : "PLACE ORDER"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlaceOrder;