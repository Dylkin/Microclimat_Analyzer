import express from 'express';
import { pool } from '../config/database.js';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { sendEmail } from '../services/mailService.js';

const router = express.Router();

function mapUserRow(row: Record<string, unknown>) {
  const staffPositionName = (row.staff_position_name as string | null) ?? null;
  const legacyPosition = (row.position as string | null) ?? null;
  return {
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    password: '',
    role: row.role,
    position: staffPositionName ?? legacyPosition ?? undefined,
    staffPositionId: (row.staff_position_id as string | null) ?? null,
    staffDepartmentName: (row.staff_department_name as string | null) ?? undefined,
    staffPositionName: staffPositionName ?? undefined,
    isDefault: row.is_default
  };
}

const usersSelectJoin = `
  SELECT u.id, u.full_name, u.email, u.role, u.position, u.staff_position_id, u.is_default, u.created_at, u.updated_at,
         d.name AS staff_department_name,
         sp.name AS staff_position_name
  FROM users u
  LEFT JOIN staff_positions sp ON sp.id = u.staff_position_id
  LEFT JOIN staff_departments d ON d.id = sp.department_id
`;

// GET /api/users - Получить всех пользователей
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`${usersSelectJoin} ORDER BY u.created_at ASC`);
    const users = result.rows.map(mapUserRow);
    
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Ошибка получения пользователей' });
  }
});

// GET /api/users/:id - Получить пользователя по ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`${usersSelectJoin} WHERE u.id = $1`, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    
    res.json(mapUserRow(result.rows[0] as Record<string, unknown>));
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Ошибка получения пользователя' });
  }
});

// POST /api/users/login - Авторизация пользователя
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email и пароль обязательны' });
    }
    
    const result = await pool.query(
      'SELECT id, full_name, email, password, role, is_default FROM users WHERE email = $1',
      [email]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }
    
    const user = result.rows[0];
    const isValidPassword = await bcrypt.compare(password, user.password) || password === user.password;
    
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Неверный email или пароль' });
    }
    
    res.json({
      id: user.id,
      fullName: user.full_name,
      email: user.email,
      password: '',
      role: user.role,
      isDefault: user.is_default
    });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ error: 'Ошибка авторизации' });
  }
});

// POST /api/users/:id/change-password — смена пароля с проверкой текущего (для личного кабинета)
router.post('/:id/change-password', async (req, res) => {
  try {
    const { id } = req.params;
    const { oldPassword, newPassword } = req.body as { oldPassword?: string; newPassword?: string };

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: 'Текущий и новый пароль обязательны' });
    }
    if (String(newPassword).length < 6) {
      return res.status(400).json({ error: 'Новый пароль должен быть не короче 6 символов' });
    }

    const result = await pool.query('SELECT id, password FROM users WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const stored = result.rows[0].password as string;
    const isValid =
      (await bcrypt.compare(oldPassword, stored)) || oldPassword === stored;

    if (!isValid) {
      return res.status(401).json({ error: 'Неверный текущий пароль' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2', [
      hashedPassword,
      id
    ]);

    res.json({ message: 'Пароль успешно изменен' });
  } catch (error) {
    console.error('Error changing password:', error);
    res.status(500).json({ error: 'Ошибка смены пароля' });
  }
});

// POST /api/users - Создать пользователя
router.post('/', async (req, res) => {
  try {
    const { fullName, email, password, role, position, staffPositionId, isDefault } = req.body;
    // #region agent log
    try {
      const fs = await import('fs');
      const path = await import('path');
      const logPath = path.join(process.cwd(), 'debug-43c079.log');
      fs.appendFileSync(logPath, JSON.stringify({ sessionId: '43c079', location: 'server/routes/users.ts:POST /', message: 'req.body', data: { fullName, email, role, hasPassword: !!password }, timestamp: Date.now(), hypothesisId: 'B' }) + '\n');
    } catch (_) {}
    // #endregion

    if (!fullName || !email || !password) {
      return res.status(400).json({ error: 'Имя, email и пароль обязательны' });
    }
    
    // Хешируем пароль
    const hashedPassword = await bcrypt.hash(password, 10);

    let positionVal: string | null = position ?? null;
    let staffPositionIdVal: string | null = null;
    const sid =
      staffPositionId !== undefined && staffPositionId !== null && String(staffPositionId).trim() !== ''
        ? String(staffPositionId).trim()
        : null;
    if (sid) {
      const posRes = await pool.query('SELECT name FROM staff_positions WHERE id = $1', [sid]);
      if (posRes.rows.length === 0) {
        return res.status(400).json({ error: 'Указанная должность не найдена в справочнике структуры предприятия' });
      }
      staffPositionIdVal = sid;
      positionVal = posRes.rows[0].name as string;
    }
    
    const result = await pool.query(
      `INSERT INTO users (full_name, email, password, role, position, staff_position_id, is_default)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, full_name, email, role, position, staff_position_id, is_default, created_at, updated_at`,
      [fullName, email, hashedPassword, role || 'user', positionVal, staffPositionIdVal, isDefault || false]
    );

    const created = result.rows[0];
    const withNames = await pool.query(`${usersSelectJoin} WHERE u.id = $1`, [created.id]);
    res.status(201).json(mapUserRow(withNames.rows[0] as Record<string, unknown>));
  } catch (error: any) {
    console.error('Error creating user:', error);
    // #region agent log
    try {
      const fs = await import('fs');
      const path = await import('path');
      const logPath = path.join(process.cwd(), 'debug-43c079.log');
      fs.appendFileSync(logPath, JSON.stringify({ sessionId: '43c079', location: 'server/routes/users.ts:POST / catch', message: 'create user error', data: { code: error.code, message: error.message, detail: error.detail }, timestamp: Date.now(), hypothesisId: 'C' }) + '\n');
    } catch (_) {}
    // #endregion
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Пользователь с таким email уже существует' });
    }
    if (error.code === '23514') {
      return res.status(400).json({ error: 'Недопустимая роль пользователя. Выполните миграцию: fix_users_role_constraint.sql' });
    }
    res.status(500).json({ error: 'Ошибка создания пользователя' });
  }
});

// PUT /api/users/:id - Обновить пользователя
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, email, password, role, position, staffPositionId, isDefault } = req.body;

    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;
    
    if (fullName !== undefined) {
      updates.push(`full_name = $${paramCount++}`);
      values.push(fullName);
    }
    if (email !== undefined) {
      updates.push(`email = $${paramCount++}`);
      values.push(email);
    }
    if (password !== undefined) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updates.push(`password = $${paramCount++}`);
      values.push(hashedPassword);
    }
    if (role !== undefined) {
      updates.push(`role = $${paramCount++}`);
      values.push(role);
    }
    if (staffPositionId !== undefined) {
      const sid =
        staffPositionId !== null && staffPositionId !== undefined && String(staffPositionId).trim() !== ''
          ? String(staffPositionId).trim()
          : null;
      if (sid) {
        const posRes = await pool.query('SELECT name FROM staff_positions WHERE id = $1', [sid]);
        if (posRes.rows.length === 0) {
          return res.status(400).json({ error: 'Указанная должность не найдена в справочнике структуры предприятия' });
        }
        updates.push(`staff_position_id = $${paramCount++}`);
        values.push(sid);
        updates.push(`position = $${paramCount++}`);
        values.push(posRes.rows[0].name as string);
      } else {
        updates.push(`staff_position_id = NULL`);
        updates.push(`position = $${paramCount++}`);
        values.push(position !== undefined ? position || null : null);
      }
    } else if (position !== undefined) {
      updates.push(`position = $${paramCount++}`);
      values.push(position || null);
    }
    if (isDefault !== undefined) {
      updates.push(`is_default = $${paramCount++}`);
      values.push(isDefault);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'Нет данных для обновления' });
    }
    
    updates.push(`updated_at = NOW()`);
    values.push(id);

    const result = await pool.query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount}
       RETURNING id`,
      values
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }

    const withNames = await pool.query(`${usersSelectJoin} WHERE u.id = $1`, [id]);
    res.json(mapUserRow(withNames.rows[0] as Record<string, unknown>));
  } catch (error: any) {
    console.error('Error updating user:', error);
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Пользователь с таким email уже существует' });
    }
    res.status(500).json({ error: 'Ошибка обновления пользователя' });
  }
});

// DELETE /api/users/:id - Удалить пользователя
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Проверяем, что пользователь не является пользователем по умолчанию
    const checkResult = await pool.query(
      'SELECT is_default FROM users WHERE id = $1',
      [id]
    );
    
    if (checkResult.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    
    if (checkResult.rows[0].is_default) {
      return res.status(403).json({ error: 'Нельзя удалить пользователя по умолчанию' });
    }
    
    await pool.query('DELETE FROM users WHERE id = $1', [id]);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Ошибка удаления пользователя' });
  }
});

// POST /api/users/:id/reset-password - Сброс пароля (прямой сброс с новым паролем)
router.post('/:id/reset-password', async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;
    
    if (!newPassword) {
      return res.status(400).json({ error: 'Новый пароль обязателен' });
    }
    
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    await pool.query(
      'UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2',
      [hashedPassword, id]
    );
    
    res.json({ message: 'Пароль успешно изменен' });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ error: 'Ошибка сброса пароля' });
  }
});

// POST /api/users/:id/send-password-reset - Отправка email с ссылкой для сброса пароля
router.post('/:id/send-password-reset', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Получаем информацию о пользователе
    const userResult = await pool.query(
      'SELECT id, full_name, email FROM users WHERE id = $1',
      [id]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    
    const user = userResult.rows[0];
    
    if (!user.email) {
      return res.status(400).json({ error: 'У пользователя не указан email' });
    }
    
    // Генерируем токен сброса пароля
    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date();
    tokenExpiry.setHours(tokenExpiry.getHours() + 24); // Токен действителен 24 часа
    
    // Сохраняем токен в базе данных (создаем таблицу если её нет)
    try {
      // Проверяем существование таблицы password_reset_tokens
      const tableCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'password_reset_tokens'
        )
      `);
      
      if (!tableCheck.rows[0].exists) {
        // Создаем таблицу для токенов сброса пароля
        await pool.query(`
          CREATE TABLE IF NOT EXISTS password_reset_tokens (
            id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            token TEXT NOT NULL UNIQUE,
            expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            used BOOLEAN DEFAULT FALSE
          );
          CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens(user_id);
          CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
        `);
      }
      
      // Удаляем старые неиспользованные токены для этого пользователя
      await pool.query(
        'DELETE FROM password_reset_tokens WHERE user_id = $1 AND (used = TRUE OR expires_at < NOW())',
        [id]
      );
      
      // Сохраняем новый токен
      await pool.query(
        'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
        [id, resetToken, tokenExpiry]
      );
    } catch (dbError: any) {
      console.error('Ошибка работы с таблицей токенов:', dbError);
      // Если таблица не создалась, продолжаем без неё (токен будет в URL)
    }
    
    // Формируем ссылку для сброса пароля
    const baseUrl = process.env.FRONTEND_URL || process.env.API_URL || 'http://localhost:5173';
    const resetUrl = `${baseUrl}/reset-password?token=${resetToken}&userId=${id}`;
    
    // Отправляем email
    try {
      await sendEmail({
        to: user.email,
        subject: 'Сброс пароля - Microclimat Analyzer',
        text: `Здравствуйте, ${user.full_name}!

Вы запросили сброс пароля для вашей учетной записи в системе Microclimat Analyzer.

Для создания нового пароля перейдите по следующей ссылке:
${resetUrl}

Ссылка действительна в течение 24 часов.

Если вы не запрашивали сброс пароля, проигнорируйте это письмо.

С уважением,
Команда Microclimat Analyzer`
      });
      
      res.json({ 
        message: 'Письмо с инструкциями по сбросу пароля отправлено на email',
        email: user.email 
      });
    } catch (emailError: any) {
      console.error('Ошибка отправки email:', emailError);
      res.status(500).json({ 
        error: 'Ошибка отправки email',
        details: emailError.message 
      });
    }
  } catch (error: any) {
    console.error('Error sending password reset email:', error);
    res.status(500).json({ error: 'Ошибка отправки письма для сброса пароля' });
  }
});

export default router;

