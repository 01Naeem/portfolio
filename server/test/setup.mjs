// Imported first by every test file: the app refuses to boot without these, exactly like production.
process.env.MONGODB_URI = 'mongodb://127.0.0.1:1/test';
process.env.JWT_SECRET = 'test-secret-'.padEnd(48, 'x');
process.env.CLIENT_ORIGINS = 'http://localhost:5173';
