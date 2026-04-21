const express = require('express');
const router = express.Router();
const { registerUser, loginUser, googleLogin } = require('../controllers/authController');
const { validate } = require('../middleware/validationMiddleware');
const { registerSchema, loginSchema } = require('../middleware/validators');

router.post('/register', validate(registerSchema), registerUser);
router.post('/login', validate(loginSchema), loginUser);
router.post('/google', googleLogin);

module.exports = router;
