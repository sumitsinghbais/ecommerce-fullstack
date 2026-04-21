const Joi = require('joi');

const registerSchema = Joi.object({
  name: Joi.string().required().min(2).max(50),
  email: Joi.string().required().email(),
  password: Joi.string().required().min(6),
});

const loginSchema = Joi.object({
  email: Joi.string().required().email(),
  password: Joi.string().required(),
});

const productSchema = Joi.object({
  name: Joi.string().required(),
  price: Joi.number().required().min(0),
  description: Joi.string().required(),
  category: Joi.string().required(),
  brand: Joi.string().required(),
  countInStock: Joi.number().required().min(0),
  image: Joi.any().optional(),
});

module.exports = {
  registerSchema,
  loginSchema,
  productSchema,
};
