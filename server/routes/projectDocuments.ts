import express from 'express';
import { pool } from '../config/database.js';

const router = express.Router();

// GET /api/project-documents - Получить документы
router.get('/', async (req, res) => {
  try {
    const { project_id } = req.query;
    
    let query = `
      SELECT 
        id, project_id, document_type, file_name, 
        file_size, file_url, file_path, mime_type, 
        uploaded_by, uploaded_at, created_at
      FROM project_documents 
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (project_id) {
      query += ` AND project_id = $${paramIndex++}`;
      params.push(project_id);
    }

    query += ' ORDER BY COALESCE(uploaded_at, created_at) DESC';

    const result = await pool.query(query, params);
    
    const documents = result.rows.map((row: any) => ({
      id: row.id,
      projectId: row.project_id,
      documentType: row.document_type,
      fileName: row.file_name,
      fileSize: row.file_size,
      fileUrl: row.file_url || row.file_path, // Поддержка обоих вариантов
      mimeType: row.mime_type,
      uploadedBy: row.uploaded_by,
      uploadedAt: row.uploaded_at ? new Date(row.uploaded_at) : (row.created_at ? new Date(row.created_at) : new Date()),
      createdAt: row.created_at ? new Date(row.created_at) : new Date()
    }));

    res.json(documents);
  } catch (error: any) {
    console.error('Error fetching project documents:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint
    });
    res.status(500).json({ 
      error: 'Ошибка получения документов проекта',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/project-documents - Загрузить документ
router.post('/', async (req, res) => {
  try {
    const {
      projectId,
      documentType,
      fileName,
      fileSize,
      fileUrl,
      mimeType,
      uploadedBy
    } = req.body;

    if (!projectId || !documentType || !fileName || !fileUrl) {
      return res.status(400).json({ error: 'projectId, documentType, fileName и fileUrl обязательны' });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Сохраняем документ в project_documents
      const result = await client.query(`
        INSERT INTO project_documents (
          project_id, document_type, file_name, file_size, file_url, mime_type, uploaded_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `, [
        projectId,
        documentType,
        fileName,
        fileSize || 0,
        fileUrl,
        mimeType || 'application/octet-stream',
        uploadedBy || null
      ]);

      const row = result.rows[0];

      // Регистрируем файл в централизованной таблице project_files (если она существует)
      try {
        await client.query(`
          INSERT INTO project_files (
            project_id, file_type, file_category, file_name, original_file_name,
            file_url, file_size, mime_type, related_table, related_id, uploaded_by
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
          ON CONFLICT DO NOTHING
        `, [
          projectId,
          'document',
          documentType,
          fileName,
          fileName,
          fileUrl,
          fileSize || 0,
          mimeType || 'application/octet-stream',
          'project_documents',
          row.id,
          uploadedBy || null
        ]);
      } catch (fileTrackingError: any) {
        // Игнорируем ошибку, если таблица project_files не существует
        if (fileTrackingError.code !== '42P01') {
          console.warn('Ошибка регистрации файла в project_files:', fileTrackingError);
        }
      }

      await client.query('COMMIT');
    res.status(201).json({
      id: row.id,
      projectId: row.project_id,
      documentType: row.document_type,
      fileName: row.file_name,
      fileSize: row.file_size,
      fileUrl: row.file_url,
      mimeType: row.mime_type,
      uploadedBy: row.uploaded_by,
      uploadedAt: new Date(row.uploaded_at),
      createdAt: new Date(row.created_at)
    });
    } catch (error: any) {
      await client.query('ROLLBACK');
      console.error('Error creating project document:', error);
      res.status(500).json({ error: `Ошибка создания документа: ${error.message}` });
    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Error creating project document:', error);
    res.status(500).json({ error: `Ошибка создания документа: ${error.message}` });
  }
});

// DELETE /api/project-documents/:id - Удалить документ
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query('DELETE FROM project_documents WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Документ не найден' });
    }

    res.status(204).send();
  } catch (error: any) {
    console.error('Error deleting project document:', error);
    res.status(500).json({ error: `Ошибка удаления документа: ${error.message}` });
  }
});

export default router;

