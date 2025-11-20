import express from 'express';
import { pool } from '../config/database.js';
import bcrypt from 'bcryptjs';

const router = express.Router();

// GET /api/users - Получить всех пользователей
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, full_name, email, role, is_default, created_at, updated_at FROM users ORDER BY created_at ASC'
    );
    
    const users = result.rows.map(row => ({
      id: row.id,
      fullName: row.full_name,
      email: row.email,
      password: '', // Не возвращаем пароль
      role: row.role,
      isDefault: row.is_default
    }));
    
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
    const result = await pool.query(
      'SELECT id, full_name, email, role, is_default, created_at, updated_at FROM users WHERE id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    
    const row = result.rows[0];
    res.json({
      id: row.id,
      fullName: row.full_name,
      email: row.email,
      password: '',
      role: row.role,
      isDefault: row.is_default
    });
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

// POST /api/users - Создать пользователя
router.post('/', async (req, res) => {
  try {
    const { fullName, email, password, role, isDefault } = req.body;
    
    if (!fullName || !email || !password) {
      return res.status(400).json({ error: 'Имя, email и пароль обязательны' });
    }
    
    // Хешируем пароль
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = await pool.query(
      `INSERT INTO users (full_name, email, password, role, is_default)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, full_name, email, role, is_default, created_at, updated_at`,
      [fullName, email, hashedPassword, role || 'user', isDefault || false]
    );
    
    const user = result.rows[0];
    res.status(201).json({
      id: user.id,
      fullName: user.full_name,
      email: user.email,
      password: '',
      role: user.role,
      isDefault: user.is_default
    });
  } catch (error: any) {
    console.error('Error creating user:', error);
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Пользователь с таким email уже существует' });
    }
    res.status(500).json({ error: 'Ошибка создания пользователя' });
  }
});

// PUT /api/users/:id - Обновить пользователя
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { fullName, email, password, role, isDefault } = req.body;
    
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
       RETURNING id, full_name, email, role, is_default, created_at, updated_at`,
      values
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Пользователь не найден' });
    }
    
    const user = result.rows[0];
    res.json({
      id: user.id,
      fullName: user.full_name,
      email: user.email,
      password: '',
      role: user.role,
      isDefault: user.is_default
    });
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

// POST /api/users/:id/reset-password - Сброс пароля
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

export default router;

