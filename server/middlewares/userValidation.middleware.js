import Joi from "joi";

export const registerSchema = Joi.object({
  name: Joi.string().trim().min(3).max(30).required().messages({
    "string.empty": "Name is required.",
    "string.min": "Name must be at least 3 characters.",
    "string.max": "Name must be at most 30 characters.",
  }),
  username: Joi.string().trim().min(3).max(30).required().messages({
    "string.empty": "Username is required.",
    "string.min": "Username must be at least 3 characters.",
    "string.max": "Username must be at most 30 characters.",
  }),
  email: Joi.string()
    .trim()
    .lowercase()
    .email({ tlds: { allow: ["com", "net", "in"] } })
    .required()
    .messages({
      "string.empty": "Email is required.",
      "string.email": "Email must be a valid email address.",
    }),
  password: Joi.string().min(8).max(15).required().messages({
    "string.empty": "Password is required.",
    "string.min": "Password must be at least 8 characters.",
    "string.max": "Password must be at most 15 characters.",
  }),
  gender: Joi.string().valid("male", "female", "other").required().messages({
    "any.only": "Gender must be 'male', 'female', or 'other'.",
    "string.empty": "Gender is required.",
  }),
  language: Joi.string().trim().optional(),
});

// For updates, all fields are optional but validated if present
export const updateSchema = Joi.object({
  name: Joi.string().trim().min(3).max(30).messages({
    "string.min": "Full Name must be at least 3 characters.",
    "string.max": "Full Name must be at most 30 characters.",
  }),
  username: Joi.string().trim().min(3).max(30).messages({
    "string.min": "Username must be at least 3 characters.",
    "string.max": "Username must be at most 30 characters.",
  }),
  email: Joi.string()
    .trim()
    .lowercase()
    .email({ tlds: { allow: ["com", "net", "in"] } })
    .messages({
      "string.email": "Email must be a valid email address.",
    }),
  password: Joi.string().min(8).max(15).messages({
    "string.min": "Password must be at least 8 characters.",
    "string.max": "Password must be at most 15 characters.",
  }),
  gender: Joi.string().valid("male", "female", "other").messages({
    "any.only": "Gender must be 'male', 'female', or 'other'.",
  }),
  language: Joi.string().trim().optional(),
})
  .min(1)
  .messages({
    "object.min": "At least one field must be provided for update.",
  });

// Middleware for user validation
const userValidation = (req, res, next) => {
  const isUpdate = req.method === "PUT";
  const schema = isUpdate ? updateSchema : registerSchema;

  const { error } = schema.validate(req.body, { abortEarly: true });

  if (error) {
    return res.status(400).json({ error: error.details[0].message });
  }

  next();
};

export default userValidation;
