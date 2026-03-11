import React, { useContext } from 'react'
import { ShopContext } from '../context/ShopContext'
import { Link } from 'react-router-dom'

const ProductItem = ({ id, image, name, price }) => {

  // Get currency from global context
  const { currency } = useContext(ShopContext)

  return (
    <Link className='text-gray-700 cursor-pointer' to={`/product/${id}`}>

      {/* Product image */}
      <div className='overflow-hidden'>
        <img className='hover:scale-110 transition ease-in-out' src={image[0]} alt="" />
      </div>

      {/* Product name */}
      <p className='pt-3 pb-1 text-sm'>{name}</p>

      {/* Product price */}
      <p className='text-sm font-medium'>{currency}{price}</p>

    </Link>
  )
}

export default ProductItem