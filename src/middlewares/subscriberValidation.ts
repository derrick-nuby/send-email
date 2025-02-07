import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import mongoose from 'mongoose';
import Segment from './../models/segment.js';

const subscriberSchema = Joi.object({
  name:
    Joi.string()
      .min(4)
      .allow('')
      .messages({
        'string.min': 'Name must be at least {#limit} characters long',
      }),
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.empty': 'Email is required',
      'string.email': 'Invalid email format',
    }),
  notes:
    Joi.string()
      .allow('')
      .min(5)
      .messages({
        'string.min': 'notes must be at least {#limit} characters long',
      }),
  segmentId:
    Joi.string()
      .hex().length(24)
      .required()
      .messages({
        'array.base': 'segmentId must be a valid MongoDB ObjectID',
        'string.length': 'segmentId must be exactly 24 hexadecimal characters',
      }),
  customFields: Joi.object()
    .pattern(Joi.string().min(1), Joi.any())
    .messages({
      'object.min': 'Custom fields must have at least one key-value pair',
      'object.unknown': 'Custom fields should be a valid key-value pair',
    })
});

const UpdateSubscriberSchema = Joi.object({
  name:
    Joi.string()
      .min(4)
      .messages({
        'string.min': 'Name must be at least {#limit} characters long',
      }),
  notes:
    Joi.string()
      .min(5)
      .messages({
        'string.min': 'notes must be at least {#limit} characters long',
      }),
  segmentId:
    Joi.string()
      .hex().length(24)
      .messages({
        'array.base': 'segmentId must be a valid MongoDB ObjectID',
        'string.length': 'segmentId must be exactly 24 hexadecimal characters',
      }),
  customFields: Joi.object()
    .pattern(Joi.string(), Joi.any())
    .messages({
      'object.unknown': 'Custom fields should be a valid key-value pair',
    })
});

const bulkJsonSubscriberSchema = Joi.array().items(
  Joi.object({
    name: Joi.string().min(4).allow('').messages({
      'string.min': 'Name must be at least {#limit} characters long',
    }),
    email: Joi.string().email().required().messages({
      'string.empty': 'Email is required',
      'string.email': 'Invalid email format',
    }),
    notes: Joi.string().allow('').min(5).messages({
      'string.min': 'notes must be at least {#limit} characters long',
    }),
    segmentId: Joi.string().hex().length(24).required().messages({
      'array.base': 'segmentId must be a valid MongoDB ObjectID',
      'string.length': 'segmentId must be exactly 24 hexadecimal characters',
    }),
    customFields: Joi.object().pattern(Joi.string().min(1), Joi.any()).messages({
      'object.min': 'Custom fields must have at least one key-value pair',
      'object.unknown': 'Custom fields should be a valid key-value pair',
    }),
    isSubscribed: Joi.boolean().required().messages({
      'any.required': 'isSubscribed is required',
    })
  })
);

const validateSubscriberCreation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error } = await subscriberSchema.validate(req.body, { abortEarly: false });
    if (error) {
      const errorMessage = error.details.map((detail) => detail.message).join('; ');
      return res.status(400).json({ error: errorMessage });
    }

    const { segmentId } = req.body;
    if (!mongoose.Types.ObjectId.isValid(segmentId)) {
      return res.status(400).json({ message: 'Invalid segmentId format' });
    }

    const segment = await Segment.findById(segmentId);
    if (!segment) {
      return res.status(404).json({ message: 'The specified segment does not exist' });
    }

    next();
  } catch (err) {
    console.error('Error validating subscriber Creation:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const validateSubscriberUpdate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error } = await UpdateSubscriberSchema.validate(req.body, { abortEarly: false });
    if (error) {
      const errorMessage = error.details.map((detail) => detail.message).join('; ');
      return res.status(400).json({ error: errorMessage });
    }
    next();
  } catch (err) {
    console.error('Error validating subscriber Creation:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const validateBulkJsonSubscribers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { error } = await bulkJsonSubscriberSchema.validate(req.body, { abortEarly: false });
    if (error) {
      const errorMessage = error.details.map((detail) => detail.message).join('\n');
      return res.status(400).json({ error: errorMessage });
    }
    next();
  } catch (err) {
    console.error('Error validating bulk JSON subscribers:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export { validateSubscriberCreation, validateSubscriberUpdate, subscriberSchema, validateBulkJsonSubscribers };
