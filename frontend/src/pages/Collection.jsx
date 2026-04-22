import React, { useContext, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ShopContext } from "../context/ShopContext";
import ProductItem from "../components/ProductItem";
import { assets } from "../assets/assets";

const Collection = () => {
  const { products = [], search, showSearch } = useContext(ShopContext);
  const [searchParams] = useSearchParams();

  const [showFilter, setShowFilter] = useState(false);
  const [filterProducts, setFilterProducts] = useState([]);
  const [category, setCategory] = useState([]);
  const [subCategory, setSubCategory] = useState([]);
  const [sortType, setSortType] = useState("relevant");

  // Read category from URL query params (e.g., /collection?category=Men)
  useEffect(() => {
    const urlCategory = searchParams.get("category");
    if (urlCategory) {
      setCategory([urlCategory]);
    } else {
      setCategory([]);
    }
  }, [searchParams]);

  const toggleCategory = (value) => {
    if (category.includes(value)) {
      setCategory(prev => prev.filter(item => item !== value));
    } else {
      setCategory(prev => [...prev, value]);
    }
  };

  const toggleSubCategory = (value) => {
    if (subCategory.includes(value)) {
      setSubCategory(prev => prev.filter(item => item !== value));
    } else {
      setSubCategory(prev => [...prev, value]);
    }
  };

  const applyFilter = () => {
    if (!products || products.length === 0) return;
    
    let productsCopy = products.slice();

    if (showSearch && search) {
      productsCopy = productsCopy.filter(item =>
        item.name.toLowerCase().includes(search.toLowerCase())
      );
    }

    if (category.length > 0) {
      productsCopy = productsCopy.filter(item =>
        category.includes(item.category)
      );
    }

    // Treat subCategory as a second arbitrary filter if you want
    if (subCategory.length > 0) {
      productsCopy = productsCopy.filter(item =>
        subCategory.includes(item.subCategory) // Assuming they have subCategory or mock it for UI
      );
    }

    setFilterProducts(productsCopy);
  };

  const sortProduct = () => {
    let fpCopy = filterProducts.slice();
    switch (sortType) {
      case "low-high":
        setFilterProducts(fpCopy.sort((a, b) => a.price - b.price));
        break;
      case "high-low":
        setFilterProducts(fpCopy.sort((a, b) => b.price - a.price));
        break;
      default:
        applyFilter();
        break;
    }
  };

  useEffect(() => {
    if (products) {
      setFilterProducts(products);
    }
  }, [products]);

  useEffect(() => {
    applyFilter();
  }, [category, subCategory, search, showSearch, products]);

  useEffect(() => {
    sortProduct();
  }, [sortType]);

  const activeFiltersCount = category.length + subCategory.length;

  return (
    <div className="flex flex-col lg:flex-row gap-8 pt-8 pb-16 font-sans bg-gray-50/30 min-h-screen px-4 sm:px-0">

      {/* Filter Sidebar */}
      <div className="w-full lg:w-72 shrink-0">
        
        {/* Mobile Filter Toggle */}
        <button
          onClick={() => setShowFilter(!showFilter)}
          className="lg:hidden w-full flex items-center justify-between bg-white border border-gray-200 px-5 py-4 rounded-2xl shadow-sm text-lg font-bold mb-4"
        >
          FILTERS
          <svg className={`w-5 h-5 transition-transform ${showFilter ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        </button>

        <div className={`bg-white rounded-[1.5rem] border border-gray-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden lg:block ${showFilter ? 'block' : 'hidden'}`}>
          {/* Filter Header */}
          <div className="bg-indigo-50/50 px-6 py-5 flex items-center justify-between border-b border-indigo-100">
            <div className="flex items-center gap-3">
              <div className="bg-[#563EE9] p-2 rounded-xl text-white">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
              </div>
              <span className="font-bold text-lg text-gray-900">Filters</span>
            </div>
            <span className="bg-[#1b2230] text-white text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full">
              {activeFiltersCount}
            </span>
          </div>

          <div className="p-6">
            {/* Category Section */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900">Category</h3>
                <span className="bg-gray-100 text-gray-500 text-xs font-bold px-2 py-0.5 rounded-full">4</span>
              </div>
              <div className="flex flex-col gap-2.5">
                {["Men", "Women", "Kids", "Accessories", "Footwear"].map(cat => (
                  <label key={cat} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl cursor-pointer transition-colors border ${category.includes(cat) ? 'bg-gray-100 border-gray-200' : 'bg-white border-transparent hover:bg-gray-50'}`}>
                    <div className={`w-5 h-5 rounded border flex items-center justify-center ${category.includes(cat) ? 'bg-[#1b2230] border-[#1b2230]' : 'border-gray-300'}`}>
                      {category.includes(cat) && <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>}
                    </div>
                    <input type="checkbox" className="hidden" checked={category.includes(cat)} onChange={() => toggleCategory(cat)} />
                    <span className={`text-sm ${category.includes(cat) ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>{cat}</span>
                  </label>
                ))}
              </div>
            </div>

            <hr className="border-gray-100 mb-6" />

            {/* Brands Section */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900">Brand</h3>
                <span className="bg-gray-100 text-gray-500 text-xs font-bold px-2 py-0.5 rounded-full">2</span>
              </div>
              <div className="flex flex-col gap-2.5">
                {["Nike", "Adidas", "Puma"].map(brand => (
                  <label key={brand} className={`flex items-center gap-3 px-4 py-2.5 rounded-xl cursor-pointer transition-colors border ${subCategory.includes(brand) ? 'bg-gray-100 border-gray-200' : 'bg-white border-transparent hover:bg-gray-50'}`}>
                    <div className={`w-5 h-5 rounded border flex items-center justify-center ${subCategory.includes(brand) ? 'bg-[#1b2230] border-[#1b2230]' : 'border-gray-300'}`}>
                      {subCategory.includes(brand) && <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>}
                    </div>
                    <input type="checkbox" className="hidden" checked={subCategory.includes(brand)} onChange={() => toggleSubCategory(brand)} />
                    <span className={`text-sm ${subCategory.includes(brand) ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>{brand}</span>
                  </label>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Main Product Grid Area */}
      <div className="flex-1">
        
        {/* Header Block */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1 tracking-tight">All Products</h1>
            <p className="text-sm text-gray-500 font-medium">
              {filterProducts.length} products found &middot; {activeFiltersCount} filters active
            </p>
          </div>
          
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5 shadow-sm">
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" /></svg>
            <select
              onChange={(e) => setSortType(e.target.value)}
              className="bg-transparent text-sm font-medium text-gray-700 outline-none cursor-pointer"
            >
              <option value="relevant">Best Match</option>
              <option value="low-high">Price: Low to High</option>
              <option value="high-low">Price: High to Low</option>
            </select>
          </div>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6">
          {filterProducts.map((item, index) => (
            <ProductItem
              key={item._id || index}
              id={item._id}
              name={item.name}
              price={item.price}
              image={item.image || item.imageUrl}
              category={item.category}
            />
          ))}
        </div>

        {filterProducts.length === 0 && !showSearch && (
          <div className="w-full py-20 text-center flex flex-col items-center">
            <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
            <p className="text-xl font-bold text-gray-800 mb-2">No products found</p>
            <p className="text-gray-500 max-w-sm">Try adjusting your filters or clearing them to see more products.</p>
          </div>
        )}

      </div>
    </div>
  );
};

export default Collection;