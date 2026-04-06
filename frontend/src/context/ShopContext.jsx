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

  //  ADD TO CART
  const addToCart = async (itemId, size) => {

    if (!size) {
      toast.error("Select Product Size");
      return;
    }

    let cartData = JSON.parse(JSON.stringify(cartItems));

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

    let cartData = JSON.parse(JSON.stringify(cartItems));

    if (cartData[itemId][size]) {
      cartData[itemId][size] -= 1;

      if (cartData[itemId][size] === 0) {
        delete cartData[itemId][size];
      }
    }

    setCartItems(cartData);
  };


  // ✅ GET TOTAL CART ITEMS COUNT
const getCartCount = () => {
  let totalCount = 0;

  for (const item in cartItems) {
    for (const size in cartItems[item]) {
      totalCount += cartItems[item][size];
    }
  }

  return totalCount;
};


  // ✅ GET TOTAL CART AMOUNT
  const getCartAmount = () => {

    let total = 0;

    for (const item in cartItems) {

      const product = products.find((p) => p._id === item);

      for (const size in cartItems[item]) {
        total += product.price * cartItems[item][size];
      }

    }

    return total;
  };


  // (Optional Debug)
  useEffect(() => {
    console.log(cartItems);
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
    getCartAmount
  };

  return (
    <ShopContext.Provider value={value}>
      {props.children}
    </ShopContext.Provider>
  );
};

export default ShopContextProvider;