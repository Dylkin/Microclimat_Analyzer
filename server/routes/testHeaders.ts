import express from 'express';

const router = express.Router();

// Test endpoint для проверки заголовков
router.get('/test-headers', (req, res) => {
  const allHeaders: Record<string, any> = {};
  Object.keys(req.headers).forEach(key => {
    allHeaders[key] = req.headers[key];
  });
  
  const xHeaders: Record<string, any> = {};
  Object.keys(req.headers).forEach(key => {
    if (key.toLowerCase().startsWith('x-') || key.toLowerCase().includes('user')) {
      xHeaders[key] = req.headers[key];
    }
  });
  
  res.json({
    method: req.method,
    path: req.path,
    query: req.query,
    body: req.body,
    allHeaders: allHeaders,
    xHeaders: xHeaders,
    specificHeaders: {
      'x-user-id': req.headers['x-user-id'],
      'X-User-Id': req.headers['x-user-id'],
      'x-userid': req.headers['x-userid'],
      'user-id': req.headers['user-id'],
    }
  });
});

export default router;

