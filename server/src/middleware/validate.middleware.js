export const validate = (schema) => (req, res, next) => {
  try {
    const parsed = schema.parse({
      body: req.body,
      query: req.query,
      params: req.params
    });

    if (parsed.body) req.body = parsed.body;
    if (parsed.query) req.query = parsed.query;
    if (parsed.params) req.params = parsed.params;

    next();
  } catch (error) {
    if (error.name === 'ZodError') {
      const formattedErrors = error.errors.map((err) => ({
        field: err.path.join('.').replace(/^(body|query|params)\./, ''),
        message: err.message
      }));

      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request data',
          details: formattedErrors
        }
      });
    }

    next(error);
  }
};
