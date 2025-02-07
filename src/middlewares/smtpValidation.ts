import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';

const smtpSchema = Joi.object({
    name: Joi.string()
        .required()
        .messages({
            'string.base': 'please name your smtp server correctly',
        }),
    fromEmail: Joi.string()
        .email()
        .required()
        .messages({
            'string.empty': 'Email is required',
            'string.email': 'Invalid email format',
        }),
    service: Joi.string()
        .messages({
            'string.base': 'the service is string',
        }),
    pool: Joi.boolean()
        .optional()
        .messages({
            'boolean.base': 'Pool must be a boolean value',
        }),
    host: Joi.string()
        .hostname()
        .optional()
        .messages({
            'string.hostname': 'Invalid host format',
        }),
    port: Joi.number()
        .optional()
        .integer()
        .min(1)
        .max(65535)
        .messages({
            'number.base': 'Port must be a number',
            'number.min': 'Port must be a positive number',
            'number.max': 'Port must be between 1 and 65535',
        }),
    secure: Joi.boolean()
        .optional()
        .messages({
            'boolean.base': 'Secure must be a boolean value',
        }),
    auth: Joi.object({
        user: Joi.string()
            .required()
            .messages({
                'string.empty': 'Username is required',
            }),
        pass: Joi.string()
            .required()
            .messages({
                'string.empty': 'Password is required',
            }),
    }).required()
        .messages({
            'object.base': 'Auth object is required and must include both user and pass',
        }),
});

const smtpUpdateSchema = Joi.object({
    name: Joi.string()
        .messages({
            'string.base': 'please name your smtp server correctly',
        }),
    service: Joi.string()
        .messages({
            'string.base': 'the service is string',
        }),
    fromEmail: Joi.string()
        .email()
        .messages({
            'string.empty': 'Email is required',
            'string.email': 'Invalid email format',
        }),
    pool: Joi.boolean()
        .optional()
        .messages({
            'boolean.base': 'Pool must be a boolean value',
        }),
    host: Joi.string()
        .hostname()
        .optional()
        .messages({
            'string.hostname': 'Invalid host format',
        }),
    port: Joi.number()
        .optional()
        .integer()
        .min(1)
        .max(65535)
        .messages({
            'number.base': 'Port must be a number',
            'number.min': 'Port must be a positive number',
            'number.max': 'Port must be between 1 and 65535',
        }),
    secure: Joi.boolean()
        .optional()
        .messages({
            'boolean.base': 'Secure must be a boolean value',
        }),
    auth: Joi.object({
        user: Joi.string(),
        pass: Joi.string()
    })
});

const validateSmtpAddition = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { error } = await smtpSchema.validate(req.body, { abortEarly: false });
        if (error) {
            const errorMessage = error.details.map((detail) => detail.message).join('; ');
            return res.status(400).json({ error: errorMessage });
        }
        next();
    } catch (err) {
        console.error('Error validating user Creation:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};

const validateSmtpUpdate = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { error } = await smtpUpdateSchema.validate(req.body, { abortEarly: false });
        if (error) {
            const errorMessage = error.details.map((detail) => detail.message).join('; ');
            return res.status(400).json({ error: errorMessage });
        }
        next();
    } catch (err) {
        console.error('Error validating user Login:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
};
export { validateSmtpAddition, validateSmtpUpdate };
