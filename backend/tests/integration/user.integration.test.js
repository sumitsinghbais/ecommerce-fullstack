const request = require('supertest');
const app = require('../../server');
const { connectTestDB, disconnectTestDB, clearTestDB } = require('../setup');
const User = require('../../models/User');
const Product = require('../../models/Product');
const { registerUser, registerAdmin, createProduct } = require('../utils/factories');

describe('User Integration Tests', () => {
  let adminToken, adminId, userToken, userId;

  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await disconnectTestDB();
  });

  beforeEach(async () => {
    await clearTestDB();
    const admin = await registerAdmin();
    adminToken = admin.token;
    adminId = admin.userId;

    const user = await registerUser();
    userToken = user.token;
    userId = user.body._id;
  });

  describe('User Profile Operations', () => {
    it('should retrieve user profile successfully with populated wishlist', async () => {
      const { body: product } = await createProduct(adminToken);
      
      // Add product to wishlist
      await request(app)
        .post(`/api/users/wishlist/${product._id}`)
        .set('Authorization', `Bearer ${userToken}`);

      const res = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.email).toBeDefined();
      expect(res.body.wishlist.length).toBe(1);
      expect(res.body.wishlist[0]._id.toString()).toBe(product._id.toString());
    });

    it('should return 404 on profile fetch if user no longer exists', async () => {
      const spy = jest.spyOn(User, 'findById').mockImplementation(() => {
        return {
          select: () => Promise.resolve({ _id: userId, name: 'Test User', email: 'test@test.com' }),
          populate: () => Promise.resolve(null) // Controller gets null
        };
      });

      const res = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${userToken}`);

      spy.mockRestore();

      expect(res.statusCode).toBe(404);
      expect(res.body.message).toBe('User not found');
    });

    it('should update profile fields successfully', async () => {
      const res = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Updated Name',
          email: 'newemail@test.com',
          password: 'NewPassword123',
          address: {
            street: 'New St',
            city: 'New City',
            zipCode: '99999',
            country: 'New Country'
          }
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.name).toBe('Updated Name');
      expect(res.body.email).toBe('newemail@test.com');
      expect(res.body.address.street).toBe('New St');

      // Verify password hash changed
      const dbUser = await User.findById(userId);
      expect(dbUser.password).not.toBe('NewPassword123'); // must be hashed
    });

    it('should use existing values if update body fields are empty', async () => {
      const res = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send({});

      expect(res.statusCode).toBe(200);
      expect(res.body.name).toBeDefined();
      expect(res.body.email).toBeDefined();
    });

    it('should return 404 on profile update if user no longer exists', async () => {
      const spy = jest.spyOn(User, 'findById').mockImplementation(() => {
        return {
          select: () => Promise.resolve({ _id: userId, name: 'Test User', email: 'test@test.com' }),
          then: (resolve) => resolve(null) // Controller gets null
        };
      });

      const res = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Test' });

      spy.mockRestore();

      expect(res.statusCode).toBe(404);
      expect(res.body.message).toBe('User not found');
    });
  });

  describe('Wishlist Operations', () => {
    it('should add to wishlist and not duplicate', async () => {
      const { body: product } = await createProduct(adminToken);

      // Add first time
      const res1 = await request(app)
        .post(`/api/users/wishlist/${product._id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res1.statusCode).toBe(200);
      expect(res1.body.wishlist.length).toBe(1);

      // Add second time (should not duplicate)
      const res2 = await request(app)
        .post(`/api/users/wishlist/${product._id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res2.statusCode).toBe(200);
      expect(res2.body.wishlist.length).toBe(1);
    });

    it('should remove from wishlist successfully', async () => {
      const { body: product } = await createProduct(adminToken);

      // Add to wishlist
      await User.findByIdAndUpdate(userId, { $push: { wishlist: product._id } });

      const res = await request(app)
        .delete(`/api/users/wishlist/${product._id}`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.wishlist.length).toBe(0);
    });
  });

  describe('Admin Operations', () => {
    it('should list all users for admin but block regular users', async () => {
      // Admin list users
      const resAdmin = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(resAdmin.statusCode).toBe(200);
      expect(resAdmin.body.length).toBe(2);

      // User list users (Block)
      const resUser = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${userToken}`);

      expect(resUser.statusCode).toBe(403);
    });

    it('should toggle block user status', async () => {
      // Block
      const resBlock = await request(app)
        .put(`/api/users/${userId}/block`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(resBlock.statusCode).toBe(200);
      expect(resBlock.body.message).toContain('blocked successfully');

      const dbUserBlock = await User.findById(userId);
      expect(dbUserBlock.isBlocked).toBe(true);

      // Unblock
      const resUnblock = await request(app)
        .put(`/api/users/${userId}/block`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(resUnblock.statusCode).toBe(200);
      expect(resUnblock.body.message).toContain('unblocked successfully');

      const dbUserUnblock = await User.findById(userId);
      expect(dbUserUnblock.isBlocked).toBe(false);
    });

    it('should return 404 when blocking non-existent user', async () => {
      const res = await request(app)
        .put('/api/users/507f1f77bcf86cd799439011/block')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.statusCode).toBe(404);
    });

    it('should delete a user successfully', async () => {
      const res = await request(app)
        .delete(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('User removed');

      const dbUser = await User.findById(userId);
      expect(dbUser).toBeNull();
    });

    it('should return 404 when deleting non-existent user', async () => {
      const res = await request(app)
        .delete('/api/users/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.statusCode).toBe(404);
    });
  });

  describe('Error Simulation', () => {
    it('should handle database errors on profile fetch', async () => {
      const spy = jest.spyOn(User, 'findById').mockImplementation(() => {
        return {
          select: () => Promise.resolve({ _id: userId, name: 'Test User', email: 'test@test.com' }),
          populate: () => Promise.reject(new Error('Profile fetch failure'))
        };
      });

      const res = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${userToken}`);

      spy.mockRestore();

      expect(res.statusCode).toBe(500);
      expect(res.body.message).toBe('Profile fetch failure');
    });

    it('should handle database errors on profile update', async () => {
      const spy = jest.spyOn(User, 'findById').mockImplementation(() => {
        return {
          select: () => Promise.resolve({ _id: userId, name: 'Test User', email: 'test@test.com' }),
          then: (resolve, reject) => reject(new Error('Profile update failure'))
        };
      });

      const res = await request(app)
        .put('/api/users/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ name: 'Test' });

      spy.mockRestore();

      expect(res.statusCode).toBe(500);
      expect(res.body.message).toBe('Profile update failure');
    });

    it('should handle errors in addToWishlist', async () => {
      const spy = jest.spyOn(User, 'findById').mockImplementation(() => {
        return {
          select: () => Promise.resolve({ _id: userId, name: 'Test User', email: 'test@test.com' }),
          then: (resolve, reject) => reject(new Error('Wishlist error'))
        };
      });

      const res = await request(app)
        .post(`/api/users/wishlist/507f1f77bcf86cd799439011`)
        .set('Authorization', `Bearer ${userToken}`);

      spy.mockRestore();

      expect(res.statusCode).toBe(500);
      expect(res.body.message).toBe('Wishlist error');
    });

    it('should handle errors in removeFromWishlist', async () => {
      const spy = jest.spyOn(User, 'findById').mockImplementation(() => {
        return {
          select: () => Promise.resolve({ _id: userId, name: 'Test User', email: 'test@test.com' }),
          then: (resolve, reject) => reject(new Error('Wishlist remove error'))
        };
      });

      const res = await request(app)
        .delete(`/api/users/wishlist/507f1f77bcf86cd799439011`)
        .set('Authorization', `Bearer ${userToken}`);

      spy.mockRestore();

      expect(res.statusCode).toBe(500);
      expect(res.body.message).toBe('Wishlist remove error');
    });

    it('should handle errors in getUsers admin route', async () => {
      const originalFind = User.find;
      User.find = jest.fn().mockReturnValue({
        select: jest.fn().mockRejectedValue(new Error('Get users failure'))
      });

      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`);

      User.find = originalFind;

      expect(res.statusCode).toBe(500);
      expect(res.body.message).toBe('Get users failure');
    });

    it('should handle errors in deleteUser admin route', async () => {
      const spy = jest.spyOn(User, 'findById').mockImplementation(() => {
        return {
          select: () => Promise.resolve({ _id: adminId, name: 'Admin User', role: 'admin' }),
          then: (resolve, reject) => reject(new Error('Delete user failure'))
        };
      });

      const res = await request(app)
        .delete(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      spy.mockRestore();

      expect(res.statusCode).toBe(500);
      expect(res.body.message).toBe('Delete user failure');
    });

    it('should handle errors in toggleBlockUser admin route', async () => {
      const spy = jest.spyOn(User, 'findById').mockImplementation(() => {
        return {
          select: () => Promise.resolve({ _id: adminId, name: 'Admin User', role: 'admin' }),
          then: (resolve, reject) => reject(new Error('Block user failure'))
        };
      });

      const res = await request(app)
        .put(`/api/users/${userId}/block`)
        .set('Authorization', `Bearer ${adminToken}`);

      spy.mockRestore();

      expect(res.statusCode).toBe(500);
      expect(res.body.message).toBe('Block user failure');
    });
  });
});
