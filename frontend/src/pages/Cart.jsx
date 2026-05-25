import React, { useContext, useEffect, useState } from "react";
import { ShopContext } from "../context/ShopContext";
import Title from "../components/Title";
import { assets } from "../assets/assets";
import CartTotal from "../components/CartTotal";
import { useNavigate } from "react-router-dom";


const Cart = () => {

  const navigate = useNavigate();

  const { products, currency, cartItems, updateQuantity } = useContext(ShopContext);

  const [cartData, setCartData] = useState([]);

  useEffect(() => {
    if (products.length > 0) {
      const tempData = [];
      for (const itemId in cartItems) {
        for (const size in cartItems[itemId]) {
          if (cartItems[itemId][size] > 0) {
            tempData.push({
              _id: itemId,
              size: size,
              quantity: cartItems[itemId][size],
            });
          }
        }
      }
      setCartData(tempData);
    }
  }, [cartItems, products]);


  return (
    <div className="border-t pt-14">

      <div className="text-2xl mb-3">
        <Title text1={"YOUR"} text2={"CART"} />
      </div>

      <div>

        {
          cartData.map((item, index) => {

            const productData = products.find(
              (product) => product._id === item._id
            );

            if (!productData) return null;

            const getImageSrc = () => {
              if (productData.imageUrl) return productData.imageUrl;
              if (productData.image && Array.isArray(productData.image) && productData.image.length > 0) return productData.image[0];
              return "https://via.placeholder.com/150";
            }

            return (
              <div key={index} className="py-4 border-t border-b text-gray-700 grid grid-cols-[4fr_2fr_0.5fr] items-center gap-4">

                {/* Product Info */}
                <div className="flex items-start gap-6">
                  <img className="w-16 sm:w-20" src={getImageSrc()} alt="" />

                  <div>
                    <p className="text-xs sm:text-lg font-medium">
                      {productData.name}
                    </p>

                    <div className="flex items-center gap-5 mt-2">
                      <p className="text-gray-500">{currency}{productData.price}</p>
                      <p className="px-2 sm:px-3 sm:py-1 border bg-slate-50">
                        {item.size}
                      </p>
                      <p className="font-semibold text-gray-900">{currency}{productData.price * item.quantity}</p>
                    </div>
                  </div>
                </div>

                {/* Quantity */}
                <input
                  onChange={(e) => {
                    const value = Number(e.target.value);
                    if (value > 0) {
                      updateQuantity(item._id, item.size, value);
                    }
                  }}
                  className="border max-w-10 sm:max-w-20 px-1 sm:px-2 py-1 text-center"
                  type="number"
                  min={1}
                  value={item.quantity}
                />

                {/* Remove Button */}
                <img
                  onClick={() => updateQuantity(item._id, item.size, 0)}
                  src={assets.bin_icon}
                  alt="delete"
                  className="w-4 sm:w-5 cursor-pointer"
                />

              </div>
            );

          })
        }

      </div>

      <div className="flex justify-end my-20">
        <div className="w-full sm:w-[450px]">
          <CartTotal />
          <div className="w-full text-end">
            <button onClick={()=>navigate('/place-order')} className="bg-black text-white text-sm my-8 px-8 py-3">
              PROCEED TO CHECKOUT
            </button>
          </div>
        </div>
      </div>

    </div>
  );
};

export default Cart;