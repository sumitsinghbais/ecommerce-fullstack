/**
 * Seed Script: Creates 2 Admin Users + 52 Products in MongoDB
 * Run: node seed.js
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');
const Product = require('./models/Product');

dotenv.config();

// ── 2 Admin Accounts ──────────────────────────────────────────
const admins = [
  {
    name: 'Admin Sumit',
    email: 'admin@shopverse.com',
    password: 'admin123',
    role: 'admin',
  },
  {
    name: 'Admin Manager',
    email: 'manager@shopverse.com',
    password: 'manager123',
    role: 'admin',
  },
];

// ── 52 Products (matching your frontend assets) ───────────────
// Using placeholder images that work universally (admin + user dashboards)
// Replace these with your Cloudinary URLs after uploading via admin panel
const generateImageUrl = (id) => `https://picsum.photos/seed/product${id}/400/400`;

const productData = [
  { name: "Women Round Neck Cotton Top", price: 100, category: "Women", subCategory: "Topwear", sizes: ["S", "M", "L"], bestseller: true },
  { name: "Men Round Neck Pure Cotton T-shirt", price: 200, category: "Men", subCategory: "Topwear", sizes: ["M", "L", "XL"], bestseller: true },
  { name: "Girls Round Neck Cotton Top", price: 220, category: "Kids", subCategory: "Topwear", sizes: ["S", "L", "XL"], bestseller: true },
  { name: "Men Round Neck Pure Cotton T-shirt", price: 110, category: "Men", subCategory: "Topwear", sizes: ["S", "M", "XXL"], bestseller: true },
  { name: "Women Round Neck Cotton Top", price: 130, category: "Women", subCategory: "Topwear", sizes: ["M", "L", "XL"], bestseller: true },
  { name: "Girls Round Neck Cotton Top", price: 140, category: "Kids", subCategory: "Topwear", sizes: ["S", "L", "XL"], bestseller: true },
  { name: "Men Tapered Fit Flat-Front Trousers", price: 190, category: "Men", subCategory: "Bottomwear", sizes: ["S", "L", "XL"], bestseller: false },
  { name: "Men Round Neck Pure Cotton T-shirt", price: 140, category: "Men", subCategory: "Topwear", sizes: ["S", "M", "L", "XL"], bestseller: false },
  { name: "Girls Round Neck Cotton Top", price: 100, category: "Kids", subCategory: "Topwear", sizes: ["M", "L", "XL"], bestseller: false },
  { name: "Men Tapered Fit Flat-Front Trousers", price: 110, category: "Men", subCategory: "Bottomwear", sizes: ["S", "L", "XL"], bestseller: false },
  { name: "Men Round Neck Pure Cotton T-shirt", price: 120, category: "Men", subCategory: "Topwear", sizes: ["S", "M", "L"], bestseller: false },
  { name: "Men Round Neck Pure Cotton T-shirt", price: 150, category: "Men", subCategory: "Topwear", sizes: ["S", "M", "L", "XL"], bestseller: false },
  { name: "Women Round Neck Cotton Top", price: 130, category: "Women", subCategory: "Topwear", sizes: ["S", "M", "L", "XL"], bestseller: false },
  { name: "Boy Round Neck Pure Cotton T-shirt", price: 160, category: "Kids", subCategory: "Topwear", sizes: ["S", "M", "L", "XL"], bestseller: false },
  { name: "Men Tapered Fit Flat-Front Trousers", price: 140, category: "Men", subCategory: "Bottomwear", sizes: ["S", "M", "L", "XL"], bestseller: false },
  { name: "Girls Round Neck Cotton Top", price: 170, category: "Kids", subCategory: "Topwear", sizes: ["S", "M", "L", "XL"], bestseller: false },
  { name: "Men Tapered Fit Flat-Front Trousers", price: 150, category: "Men", subCategory: "Bottomwear", sizes: ["S", "M", "L", "XL"], bestseller: false },
  { name: "Boy Round Neck Pure Cotton T-shirt", price: 180, category: "Kids", subCategory: "Topwear", sizes: ["S", "M", "L", "XL"], bestseller: false },
  { name: "Boy Round Neck Pure Cotton T-shirt", price: 160, category: "Kids", subCategory: "Topwear", sizes: ["S", "M", "L", "XL"], bestseller: false },
  { name: "Women Palazzo Pants with Waist Belt", price: 190, category: "Women", subCategory: "Bottomwear", sizes: ["S", "M", "L", "XL"], bestseller: false },
  { name: "Women Zip-Front Relaxed Fit Jacket", price: 170, category: "Women", subCategory: "Winterwear", sizes: ["S", "M", "L", "XL"], bestseller: false },
  { name: "Women Palazzo Pants with Waist Belt", price: 200, category: "Women", subCategory: "Bottomwear", sizes: ["S", "M", "L", "XL"], bestseller: false },
  { name: "Boy Round Neck Pure Cotton T-shirt", price: 180, category: "Kids", subCategory: "Topwear", sizes: ["S", "M", "L", "XL"], bestseller: false },
  { name: "Boy Round Neck Pure Cotton T-shirt", price: 210, category: "Kids", subCategory: "Topwear", sizes: ["S", "M", "L", "XL"], bestseller: false },
  { name: "Girls Round Neck Cotton Top", price: 190, category: "Kids", subCategory: "Topwear", sizes: ["S", "M", "L", "XL"], bestseller: false },
  { name: "Women Zip-Front Relaxed Fit Jacket", price: 220, category: "Women", subCategory: "Winterwear", sizes: ["S", "M", "L", "XL"], bestseller: false },
  { name: "Girls Round Neck Cotton Top", price: 200, category: "Kids", subCategory: "Topwear", sizes: ["S", "M", "L", "XL"], bestseller: false },
  { name: "Men Slim Fit Relaxed Denim Jacket", price: 230, category: "Men", subCategory: "Winterwear", sizes: ["S", "M", "L", "XL"], bestseller: false },
  { name: "Women Round Neck Cotton Top", price: 210, category: "Women", subCategory: "Topwear", sizes: ["S", "M", "L", "XL"], bestseller: false },
  { name: "Girls Round Neck Cotton Top", price: 240, category: "Kids", subCategory: "Topwear", sizes: ["S", "M", "L", "XL"], bestseller: false },
  { name: "Men Round Neck Pure Cotton T-shirt", price: 220, category: "Men", subCategory: "Topwear", sizes: ["S", "M", "L", "XL"], bestseller: false },
  { name: "Men Round Neck Pure Cotton T-shirt", price: 250, category: "Men", subCategory: "Topwear", sizes: ["S", "M", "L", "XL"], bestseller: false },
  { name: "Girls Round Neck Cotton Top", price: 230, category: "Kids", subCategory: "Topwear", sizes: ["S", "M", "L", "XL"], bestseller: false },
  { name: "Women Round Neck Cotton Top", price: 260, category: "Women", subCategory: "Topwear", sizes: ["S", "M", "L", "XL"], bestseller: false },
  { name: "Women Zip-Front Relaxed Fit Jacket", price: 240, category: "Women", subCategory: "Winterwear", sizes: ["S", "M", "L", "XL"], bestseller: false },
  { name: "Women Zip-Front Relaxed Fit Jacket", price: 270, category: "Women", subCategory: "Winterwear", sizes: ["S", "M", "L", "XL"], bestseller: false },
  { name: "Women Round Neck Cotton Top", price: 250, category: "Women", subCategory: "Topwear", sizes: ["S", "M", "L", "XL"], bestseller: false },
  { name: "Men Round Neck Pure Cotton T-shirt", price: 280, category: "Men", subCategory: "Topwear", sizes: ["S", "M", "L", "XL"], bestseller: false },
  { name: "Men Printed Plain Cotton Shirt", price: 260, category: "Men", subCategory: "Topwear", sizes: ["S", "M", "L", "XL"], bestseller: false },
  { name: "Men Slim Fit Relaxed Denim Jacket", price: 290, category: "Men", subCategory: "Winterwear", sizes: ["S", "M", "L", "XL"], bestseller: false },
  { name: "Men Round Neck Pure Cotton T-shirt", price: 270, category: "Men", subCategory: "Topwear", sizes: ["S", "M", "L", "XL"], bestseller: false },
  { name: "Boy Round Neck Pure Cotton T-shirt", price: 300, category: "Kids", subCategory: "Topwear", sizes: ["S", "M", "L", "XL"], bestseller: false },
  { name: "Kid Tapered Slim Fit Trouser", price: 280, category: "Kids", subCategory: "Bottomwear", sizes: ["S", "M", "L", "XL"], bestseller: false },
  { name: "Women Zip-Front Relaxed Fit Jacket", price: 310, category: "Women", subCategory: "Winterwear", sizes: ["S", "M", "L", "XL"], bestseller: false },
  { name: "Men Slim Fit Relaxed Denim Jacket", price: 290, category: "Men", subCategory: "Winterwear", sizes: ["S", "M", "L", "XL"], bestseller: false },
  { name: "Men Slim Fit Relaxed Denim Jacket", price: 320, category: "Men", subCategory: "Winterwear", sizes: ["S", "M", "L", "XL"], bestseller: false },
  { name: "Kid Tapered Slim Fit Trouser", price: 300, category: "Kids", subCategory: "Bottomwear", sizes: ["S", "M", "L", "XL"], bestseller: false },
  { name: "Men Slim Fit Relaxed Denim Jacket", price: 330, category: "Men", subCategory: "Winterwear", sizes: ["S", "M", "L", "XL"], bestseller: false },
  { name: "Kid Tapered Slim Fit Trouser", price: 310, category: "Kids", subCategory: "Bottomwear", sizes: ["S", "M", "L", "XL"], bestseller: false },
  { name: "Kid Tapered Slim Fit Trouser", price: 340, category: "Kids", subCategory: "Bottomwear", sizes: ["S", "M", "L", "XL"], bestseller: false },
  { name: "Women Zip-Front Relaxed Fit Jacket", price: 320, category: "Women", subCategory: "Winterwear", sizes: ["S", "M", "L", "XL"], bestseller: false },
  { name: "Men Slim Fit Relaxed Denim Jacket", price: 350, category: "Men", subCategory: "Winterwear", sizes: ["S", "M", "L", "XL"], bestseller: false },
];

// ── Seed Function ─────────────────────────────────────────────
const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB Connected');

    // ── Seed Admins ──
    console.log('\n🔐 Seeding Admin Users...');
    for (const admin of admins) {
      const exists = await User.findOne({ email: admin.email });
      if (exists) {
        console.log(`   ⚠️  Admin "${admin.email}" already exists — skipped`);
      } else {
        await User.create(admin);
        console.log(`   ✅ Created admin: ${admin.email} (password: ${admin.password})`);
      }
    }

    // ── Seed Products ──
    console.log('\n📦 Seeding Products...');
    const existingCount = await Product.countDocuments();
    if (existingCount >= 52) {
      console.log(`   ⚠️  Already have ${existingCount} products — skipping product seed`);
    } else {
      // Build products with image URLs and required fields
      const productsToInsert = productData.map((p, i) => ({
        name: p.name,
        description: `Premium quality ${p.name.toLowerCase()}. Made with the finest materials for ultimate comfort and style. Perfect for everyday wear.`,
        price: p.price,
        category: p.category,
        stock: Math.floor(Math.random() * 50) + 10,
        imageUrl: generateImageUrl(i + 1),
        brand: p.category === 'Men' ? 'Nike' : p.category === 'Women' ? 'Zara' : 'H&M',
        rating: Math.round((Math.random() * 2 + 3) * 10) / 10, // 3.0 - 5.0
        numReviews: Math.floor(Math.random() * 100) + 5,
      }));

      await Product.insertMany(productsToInsert);
      console.log(`   ✅ Inserted ${productsToInsert.length} products`);
    }

    // ── Summary ──
    const totalUsers = await User.countDocuments({ role: 'admin' });
    const totalProducts = await Product.countDocuments();
    console.log('\n═══════════════════════════════════════════');
    console.log('   🎉 SEED COMPLETE');
    console.log(`   👤 Admin accounts: ${totalUsers}`);
    console.log(`   📦 Total products: ${totalProducts}`);
    console.log('═══════════════════════════════════════════');
    console.log('\n🔑 Admin Login Credentials:');
    console.log('   Email: admin@shopverse.com    Password: admin123');
    console.log('   Email: manager@shopverse.com  Password: manager123');
    console.log('═══════════════════════════════════════════\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed Error:', error.message);
    process.exit(1);
  }
};

seedDatabase();
