import { createContext, useState, useEffect } from "react";
import { products } from "../assets/assets";
import { toast } from "react-toastify";

export const ShopContext = createContext();

const ShopContextProvider = (props) => {

  const currency = "$";
  const delivery_fee = 10;

  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(true);

  const [cartItems, setCartItems] = useState({});
  
  // ✅ ADD TO CART
  const addToCart = (itemId, size) => {

    if (!size) {
      toast.error("Select Product Size");
      return;
    }

    let cartData = structuredClone(cartItems);

    if (cartData[itemId]) {

      if (cartData[itemId][size]) {
        cartData[itemId][size] += 1;
      } else {
        cartData[itemId][size] = 1;
      }

    } else {
      cartData[itemId] = {};
      cartData[itemId][size] = 1;
    }

    setCartItems(cartData);
  };


  // ✅ REMOVE FROM CART
  const removeFromCart = (itemId, size) => {

    let cartData = structuredClone(cartItems);

    if (cartData[itemId]?.[size]) {
      cartData[itemId][size] -= 1;

      if (cartData[itemId][size] === 0) {
        delete cartData[itemId][size];
      }

      // Optional: remove product if no sizes left
      if (Object.keys(cartData[itemId]).length === 0) {
        delete cartData[itemId];
      }
    }

    setCartItems(cartData);
  };


  // ✅ GET TOTAL CART ITEMS COUNT
  const getCartCount = () => {
    let totalCount = 0;

    for (const itemId in cartItems) {
      for (const size in cartItems[itemId]) {
        totalCount += cartItems[itemId][size];
      }
    }

    return totalCount;
  };


  // ✅ GET TOTAL CART AMOUNT
  const getCartAmount = () => {
    let totalAmount = 0;

    for (const itemId in cartItems) {

      const itemInfo = products.find(p => p._id === itemId);
      if (!itemInfo) continue;

      for (const size in cartItems[itemId]) {
        totalAmount += itemInfo.price * cartItems[itemId][size];
      }
    }

    return totalAmount;
  };


  // 🔍 DEBUG (optional)
  useEffect(() => {
    console.log("Cart Items:", cartItems);
  }, [cartItems]);


  const value = {
    products,
    currency,
    delivery_fee,
    search,
    setSearch,
    showSearch,
    setShowSearch,
    cartItems,
    addToCart,
    removeFromCart,
    getCartCount,
    getCartAmount,
  
  };

  return (
    <ShopContext.Provider value={value}>
      {props.children}
    </ShopContext.Provider>
  );
};

export default ShopContextProvider;