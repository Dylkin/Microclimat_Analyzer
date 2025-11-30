import { Request, Response, NextFunction } from 'express';
import { pool } from '../config/database.js';

// Middleware для проверки авторизации пользователя
export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Извлекаем userId из body (для POST/PUT), query (для GET) или заголовков
    // Проверяем заголовки в разных форматах (x-user-id, x-userid, user-id)
    const userId = req.body?.userId 
      || req.query?.userId as string 
      || req.headers['x-user-id'] as string
      || req.headers['x-userid'] as string
      || req.headers['user-id'] as string;
    
    if (!userId) {
      // Логируем все заголовки для отладки
      const allHeaders: Record<string, any> = {};
      Object.keys(req.headers).forEach(key => {
        allHeaders[key] = req.headers[key];
      });
      
      console.error('Ошибка авторизации: userId не предоставлен', {
        method: req.method,
        path: req.path,
        body: req.body,
        query: req.query,
        allHeaders: allHeaders,
        specificHeaders: {
          'x-user-id': req.headers['x-user-id'],
          'x-userid': req.headers['x-userid'],
          'user-id': req.headers['user-id'],
          'x-user-id-lower': req.headers['x-user-id']?.toLowerCase(),
          'authorization': req.headers['authorization']
        }
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

