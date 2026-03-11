import { createContext } from "react";
import { products } from "../assets/assets";

// Create global context
export const ShopContext = createContext();

const ShopContextProvider = (props) => {

  const currency = '$';       // Store currency
  const delivery_fee = 10;    // Default delivery fee

  // Values shared across the app
  const value = {
    products,
    currency,
    delivery_fee
  };

  return (
    <ShopContext.Provider value={value}>
      {props.children}
    </ShopContext.Provider>
  );
};

export default ShopContextProvider;