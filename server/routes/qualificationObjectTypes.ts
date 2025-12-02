import express from 'express';
import { pool } from '../config/database.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';

const router = express.Router();

// Настройка multer для загрузки файлов
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: (req, file, cb) => {
    // Разрешаем только .docx файлы
    if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
        file.originalname.endsWith('.docx')) {
      cb(null, true);
    } else {
      cb(new Error('Разрешены только файлы формата .docx'));
    }
  }
});

// GET /api/qualification-object-types - Получить все типы объектов квалификации
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        id,
        type_key,
        type_label,
        description,
        protocol_template_url,
        protocol_template_filename,
        protocol_template_uploaded_at,
        protocol_template_uploaded_by,
        protocol_template_uploaded_by_name,
        report_template_url,
        report_template_filename,
        report_template_uploaded_at,
        report_template_uploaded_by,
        report_template_uploaded_by_name,
        created_at,
        updated_at,
        created_by,
        updated_by
      FROM public.qualification_object_types
      ORDER BY type_label ASC
    `);

    res.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching qualification object types:', error);
    res.status(500).json({ error: 'Ошибка получения типов объектов квалификации' });
  }
});

// GET /api/qualification-object-types/by-key/:key - Получить тип объекта квалификации по type_key
router.get('/by-key/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const result = await pool.query(`
      SELECT 
        id,
        type_key,
        type_label,
        description,
        protocol_template_url,
        protocol_template_filename,
        protocol_template_uploaded_at,
        protocol_template_uploaded_by,
        protocol_template_uploaded_by_name,
        report_template_url,
        report_template_filename,
        report_template_uploaded_at,
        report_template_uploaded_by,
        report_template_uploaded_by_name,
        created_at,
        updated_at,
        created_by,
        updated_by
      FROM public.qualification_object_types
      WHERE type_key = $1
    `, [key]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Тип объекта квалификации не найден' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error fetching qualification object type by key:', error);
    res.status(500).json({ error: 'Ошибка получения типа объекта квалификации' });
  }
});

// GET /api/qualification-object-types/:id - Получить тип объекта квалификации по ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(`
      SELECT 
        id,
        type_key,
        type_label,
        description,
        protocol_template_url,
        protocol_template_filename,
        protocol_template_uploaded_at,
        protocol_template_uploaded_by,
        protocol_template_uploaded_by_name,
        report_template_url,
        report_template_filename,
        report_template_uploaded_at,
        report_template_uploaded_by,
        report_template_uploaded_by_name,
        created_at,
        updated_at,
        created_by,
        updated_by
      FROM public.qualification_object_types
      WHERE id = $1
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Тип объекта квалификации не найден' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error fetching qualification object type:', error);
    res.status(500).json({ error: 'Ошибка получения типа объекта квалификации' });
  }
});

// PUT /api/qualification-object-types/:id - Обновить тип объекта квалификации
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { type_label, description, updated_by } = req.body;

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (type_label !== undefined) {
      updates.push(`type_label = $${paramIndex++}`);
      values.push(type_label);
    }

    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      values.push(description);
    }

    if (updated_by !== undefined) {
      updates.push(`updated_by = $${paramIndex++}`);
      values.push(updated_by);
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    if (updates.length === 1) {
      return res.status(400).json({ error: 'Нет данных для обновления' });
    }

    const query = `
      UPDATE public.qualification_object_types
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Тип объекта квалификации не найден' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error updating qualification object type:', error);
    res.status(500).json({ error: 'Ошибка обновления типа объекта квалификации' });
  }
});

// POST /api/qualification-object-types/:id/protocol-template - Загрузить шаблон протокола
router.post('/:id/protocol-template', upload.single('file'), async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!req.file) {
      return res.status(400).json({ error: 'Файл не загружен' });
    }

    // Проверяем, существует ли тип объекта квалификации
    const typeResult = await pool.query(
      'SELECT type_key FROM public.qualification_object_types WHERE id = $1',
      [id]
    );

    if (typeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Тип объекта квалификации не найден' });
    }

    const typeKey = typeResult.rows[0].type_key;
    const fileName = `${typeKey}_protocol_template_${Date.now()}.docx`;
    const relativePath = `qualification-object-types/${id}/protocol/${fileName}`;
    const uploadsRoot = path.join(process.cwd(), 'uploads');
    const fullPath = path.join(uploadsRoot, 'qualification-objects', relativePath);

    // Создаем директорию, если её нет
    await fs.mkdir(path.dirname(fullPath), { recursive: true });

    // Сохраняем файл
    await fs.writeFile(fullPath, req.file.buffer);

    // Формируем публичный URL
    const publicUrl = `/uploads/qualification-objects/${relativePath}`.replace(/\\/g, '/');

    // Получаем информацию о пользователе из запроса
    const uploadedBy = req.body.uploaded_by || null;
    const uploadedByName = req.body.uploaded_by_name || null;

    // Обновляем запись в БД
    const updateResult = await pool.query(`
      UPDATE public.qualification_object_types
      SET 
        protocol_template_url = $1,
        protocol_template_filename = $2,
        protocol_template_uploaded_at = NOW(),
        protocol_template_uploaded_by = $4,
        protocol_template_uploaded_by_name = $5,
        updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `, [publicUrl, fileName, id, uploadedBy, uploadedByName]);

    res.json({
      success: true,
      protocol_template_url: publicUrl,
      protocol_template_filename: fileName,
      type: updateResult.rows[0]
    });
  } catch (error: any) {
    console.error('Error uploading protocol template:', error);
    res.status(500).json({ error: 'Ошибка загрузки шаблона протокола' });
  }
});

// POST /api/qualification-object-types/:id/report-template - Загрузить шаблон отчета
router.post('/:id/report-template', upload.single('file'), async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!req.file) {
      return res.status(400).json({ error: 'Файл не загружен' });
    }

    // Проверяем, существует ли тип объекта квалификации
    const typeResult = await pool.query(
      'SELECT type_key FROM public.qualification_object_types WHERE id = $1',
      [id]
    );

    if (typeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Тип объекта квалификации не найден' });
    }

    const typeKey = typeResult.rows[0].type_key;
    const fileName = `${typeKey}_report_template_${Date.now()}.docx`;
    const relativePath = `qualification-object-types/${id}/report/${fileName}`;
    const uploadsRoot = path.join(process.cwd(), 'uploads');
    const fullPath = path.join(uploadsRoot, 'qualification-objects', relativePath);

    // Создаем директорию, если её нет
    await fs.mkdir(path.dirname(fullPath), { recursive: true });

    // Сохраняем файл
    await fs.writeFile(fullPath, req.file.buffer);

    // Формируем публичный URL
    const publicUrl = `/uploads/qualification-objects/${relativePath}`.replace(/\\/g, '/');

    // Получаем информацию о пользователе из запроса
    const uploadedBy = req.body.uploaded_by || null;
    const uploadedByName = req.body.uploaded_by_name || null;

    // Обновляем запись в БД
    const updateResult = await pool.query(`
      UPDATE public.qualification_object_types
      SET 
        report_template_url = $1,
        report_template_filename = $2,
        report_template_uploaded_at = NOW(),
        report_template_uploaded_by = $4,
        report_template_uploaded_by_name = $5,
        updated_at = NOW()
      WHERE id = $3
      RETURNING *
    `, [publicUrl, fileName, id, uploadedBy, uploadedByName]);

    res.json({
      success: true,
      report_template_url: publicUrl,
      report_template_filename: fileName,
      type: updateResult.rows[0]
    });
  } catch (error: any) {
    console.error('Error uploading report template:', error);
    res.status(500).json({ error: 'Ошибка загрузки шаблона отчета' });
  }
});

// DELETE /api/qualification-object-types/:id/protocol-template - Удалить шаблон протокола
router.delete('/:id/protocol-template', async (req, res) => {
  try {
    const { id } = req.params;

    // Получаем информацию о файле
    const typeResult = await pool.query(
      'SELECT protocol_template_url FROM public.qualification_object_types WHERE id = $1',
      [id]
    );

    if (typeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Тип объекта квалификации не найден' });
    }

    const templateUrl = typeResult.rows[0].protocol_template_url;
    
    if (templateUrl) {
      // Извлекаем путь к файлу из URL
      const urlParts = templateUrl.split('/uploads/');
      if (urlParts.length > 1) {
        const relativePath = urlParts[1];
        const uploadsRoot = path.join(process.cwd(), 'uploads');
        const fullPath = path.join(uploadsRoot, relativePath);

        try {
          await fs.unlink(fullPath);
        } catch (deleteError: any) {
          if (deleteError.code !== 'ENOENT') {
            console.error('Error deleting file from Storage:', deleteError);
          }
        }
      }
    }

    // Обновляем запись в БД
    await pool.query(`
      UPDATE public.qualification_object_types
      SET 
        protocol_template_url = NULL,
        protocol_template_filename = NULL,
        updated_at = NOW()
      WHERE id = $1
    `, [id]);

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting protocol template:', error);
    res.status(500).json({ error: 'Ошибка удаления шаблона протокола' });
  }
});

// DELETE /api/qualification-object-types/:id/report-template - Удалить шаблон отчета
router.delete('/:id/report-template', async (req, res) => {
  try {
    const { id } = req.params;

    // Получаем информацию о файле
    const typeResult = await pool.query(
      'SELECT report_template_url FROM public.qualification_object_types WHERE id = $1',
      [id]
    );

    if (typeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Тип объекта квалификации не найден' });
    }

    const templateUrl = typeResult.rows[0].report_template_url;
    
    if (templateUrl) {
      // Извлекаем путь к файлу из URL
      const urlParts = templateUrl.split('/uploads/');
      if (urlParts.length > 1) {
        const relativePath = urlParts[1];
        const uploadsRoot = path.join(process.cwd(), 'uploads');
        const fullPath = path.join(uploadsRoot, relativePath);

        try {
          await fs.unlink(fullPath);
        } catch (deleteError: any) {
          if (deleteError.code !== 'ENOENT') {
            console.error('Error deleting file from Storage:', deleteError);
          }
        }
      }
    }

    // Обновляем запись в БД
    await pool.query(`
      UPDATE public.qualification_object_types
      SET 
        report_template_url = NULL,
        report_template_filename = NULL,
        report_template_uploaded_at = NULL,
        report_template_uploaded_by = NULL,
        report_template_uploaded_by_name = NULL,
        updated_at = NOW()
      WHERE id = $1
    `, [id]);

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting report template:', error);
    res.status(500).json({ error: 'Ошибка удаления шаблона отчета' });
  }
});


export default router;

