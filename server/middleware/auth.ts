import { Request, Response, NextFunction } from 'express';
import { pool } from '../config/database.js';

// Middleware для проверки авторизации пользователя
export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Логируем все заголовки для диагностики
    const allHeaders = Object.keys(req.headers).reduce((acc, key) => {
      acc[key.toLowerCase()] = req.headers[key];
      return acc;
    }, {} as Record<string, any>);
    
    // Извлекаем userId из body (для POST/PUT), query (для GET) или заголовков
    // Проверяем заголовки в разных форматах (x-user-id, x-userid, user-id)
    // Nginx может преобразовывать заголовки, поэтому проверяем все варианты
    const userId = req.body?.userId 
      || req.query?.userId as string 
      || req.headers['x-user-id'] as string
      || req.headers['x-userid'] as string
      || req.headers['user-id'] as string
      || allHeaders['x-user-id'] as string
      || allHeaders['x-userid'] as string
      || allHeaders['user-id'] as string;
    
    // Детальное логирование для диагностики
    console.log('requireAuth: Проверка авторизации', {
      method: req.method,
      path: req.path,
      hasBody: !!req.body,
      bodyUserId: req.body?.userId,
      queryUserId: req.query?.userId,
      headers: {
        'x-user-id': req.headers['x-user-id'],
        'x-userid': req.headers['x-userid'],
        'user-id': req.headers['user-id'],
      },
      allHeadersLowercase: allHeaders,
      extractedUserId: userId,
      rawHeaders: req.rawHeaders
    });
    
    if (!userId) {
      // Логируем все заголовки для отладки
      const allHeaders: Record<string, any> = {};
      Object.keys(req.headers).forEach(key => {
        allHeaders[key] = req.headers[key];
      });
      
      // Логируем все заголовки, начинающиеся с x- или X-
      const xHeaders: Record<string, any> = {};
      Object.keys(req.headers).forEach(key => {
        if (key.toLowerCase().startsWith('x-') || key.toLowerCase().includes('user')) {
          xHeaders[key] = req.headers[key];
        }
      });
      
      console.error('Ошибка авторизации: userId не предоставлен', {
        method: req.method,
        path: req.path,
        body: req.body,
        query: req.query,
        xHeaders: xHeaders,
        allHeaders: allHeaders,
        specificHeaders: {
          'x-user-id': req.headers['x-user-id'],
          'X-User-Id': req.headers['x-user-id'],
          'x-userid': req.headers['x-userid'],
          'user-id': req.headers['user-id'],
          'authorization': req.headers['authorization']
        },
        rawHeaders: Object.keys(req.headers).map(k => `${k}: ${req.headers[k]}`)
      });
      return res.status(401).json({ 
        error: 'Не авторизован',
        details: 'userId не предоставлен. Убедитесь, что вы авторизованы в системе.'
      });
    }
    
    // Проверяем существование пользователя в БД
    const userResult = await pool.query(
      'SELECT id, full_name, email, role FROM users WHERE id = $1',
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      console.error('Ошибка авторизации: пользователь не найден в БД', {
        userId,
        method: req.method,
        path: req.path
      });
      return res.status(401).json({ 
        error: 'Не авторизован',
        details: `Пользователь с ID ${userId} не найден в базе данных. Пожалуйста, войдите в систему заново.`
      });
    }
    
    // Добавляем информацию о пользователе в request для использования в роутах
    (req as any).user = userResult.rows[0];
    // Убеждаемся, что userId в body соответствует проверенному пользователю
    if (req.body) {
      req.body.userId = userResult.rows[0].id;
    }
    
    next();
  } catch (error: any) {
    console.error('Ошибка проверки авторизации:', error);
    res.status(500).json({ 
      error: 'Ошибка проверки авторизации',
      details: error.message 
    });
  }
};

