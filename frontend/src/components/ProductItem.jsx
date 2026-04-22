import React, { useContext } from 'react'
import { ShopContext } from '../context/ShopContext'
import { Link } from 'react-router-dom'
import { toast } from 'react-toastify'

const ProductItem = ({ id, image, name, price, category }) => {
  const { currency, addToCart } = useContext(ShopContext)
  
  // Calculate a fake discount for visual effect since backend doesn't have original Price yet
  const discount = Math.floor(Math.random() * (35 - 15 + 1)) + 15; // random between 15% and 35%
  const originalPrice = Math.round(price * (1 + (discount/100)));

  const baseURL = import.meta.env.VITE_API_URL || "http://localhost:4000";
  let rawImage = image;
  if (Array.isArray(image)) rawImage = image[0];

  // Only prepend backend baseURL for server-relative paths (e.g., /uploads/...)
  // All other sources (Vite assets, Cloudinary URLs, data URIs) pass through as-is
  const finalImageSrc = !rawImage 
    ? "https://via.placeholder.com/300?text=No+Image"
    : typeof rawImage === 'string' && rawImage.startsWith('/uploads/')
      ? `${baseURL}${rawImage}` 
      : rawImage;

  return (
    <div className='bg-white rounded-2xl shadow-[0_4px_20px_rgb(0,0,0,0.03)] border border-gray-100 overflow-hidden flex flex-col group'>
      
      {/* Product image area */}
      <div className='relative bg-gray-50 aspect-square overflow-hidden flex items-center justify-center p-4'>
        {/* Discount Badge */}
        <div className='absolute top-3 left-3 bg-[#10b981] text-white text-[10px] font-bold px-2 py-1 rounded-md z-10'>
          -{discount}%
        </div>
        <Link to={`/product/${id}`} className="w-full h-full flex items-center justify-center">
          <img 
            className='object-cover h-full w-full max-h-[180px] group-hover:scale-110 transition-transform duration-500 ease-in-out' 
            src={finalImageSrc} 
            onError={(e) => { e.target.src = "https://via.placeholder.com/300?text=No+Image" }}
            alt={name} 
          />
        </Link>
      </div>

      {/* Product Details */}
      <div className='p-5 flex flex-col flex-1'>
        <Link to={`/product/${id}`}>
          <h3 className='font-bold text-gray-900 text-sm line-clamp-1 mb-1 group-hover:text-[#563EE9] transition-colors'>{name}</h3>
        </Link>
        
        {/* Tags */}
        <div className='flex items-center justify-between mt-1 mb-3'>
          <span className='bg-gray-100 text-gray-500 text-[10px] uppercase font-bold px-2 py-1 rounded-md'>{category || 'Men'}</span>
          <span className='text-gray-400 text-[10px] font-medium'>Nike</span>
        </div>

        {/* Pricing */}
        <div className='flex items-end gap-2 mb-4'>
          <span className='text-lg font-black text-gray-900'>{currency}{price}</span>
          <span className='text-xs text-gray-400 line-through mb-1'>{currency}{originalPrice}</span>
        </div>

        {/* Add to Cart Button */}
        <button 
          onClick={() => { addToCart(id, "M"); toast.success("Added to cart!"); }} 
          className='mt-auto w-full bg-[#563EE9] text-white text-sm font-medium py-2.5 rounded-xl hover:bg-[#462fe0] hover:shadow-lg hover:shadow-[#563EE9]/30 transition-all flex items-center justify-center gap-2'
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
          Add to Cart
        </button>
      </div>

    </div>
  )
}

export default ProductItem