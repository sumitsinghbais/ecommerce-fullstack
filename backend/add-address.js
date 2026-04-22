const mongoose = require('mongoose');
const dotenv = require('dotenv');
const User = require('./models/User');

dotenv.config();

const addAddress = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ MongoDB Connected');

    const email = 'admin@shopverse.com';
    const user = await User.findOne({ email });

    if (user) {
      user.address = {
        street: '123 Tech Avenue',
        city: 'Silicon Valley',
        state: 'California',
        zipCode: '94025',
        country: 'USA',
      };
      await user.save();
      console.log(`✅ Address added successfully to user: ${email}`);
    } else {
      console.log(`❌ User with email ${email} not found.`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error adding address:', error.message);
    process.exit(1);
  }
};

addAddress();
