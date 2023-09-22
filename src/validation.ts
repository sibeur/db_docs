import Joi from "joi";

const pgConnConfigBody = Joi.object({
    host: Joi.string().required(),
    port: Joi.number().required(),
    user: Joi.string().required(),
    password: Joi.string().required(),
    database: Joi.string().required(),
    ssl: Joi.boolean()
});

const pgSchemasBody = Joi.object({
    name: Joi.string().required(),
    tables: Joi.array().items(Joi.string()),
});

export const docsValidationBody = Joi.object({
    config: pgConnConfigBody.required(),
    schemas: Joi.array().items(pgSchemasBody).required()
});