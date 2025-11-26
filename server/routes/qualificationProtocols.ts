import express from 'express';
import { pool } from '../config/database.js';

const router = express.Router();

// GET /api/qualification-protocols - Получить протоколы
router.get('/', async (req, res) => {
  try {
    const { project_id } = req.query;
    
    let query = `
      SELECT 
        qp.*,
        pd.id as document_id,
        pd.file_name,
        pd.file_size,
        pd.file_url,
        pd.mime_type,
        pd.uploaded_by,
        pd.uploaded_at
      FROM qualification_protocols qp
      LEFT JOIN project_documents pd ON qp.protocol_document_id = pd.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIndex = 1;

    if (project_id) {
      query += ` AND qp.project_id = $${paramIndex++}`;
      params.push(project_id);
    }

    query += ' ORDER BY qp.created_at DESC';

    const result = await pool.query(query, params);
    
    const protocols = result.rows.map((row: any) => ({
      id: row.id,
      projectId: row.project_id,
      qualificationObjectId: row.qualification_object_id,
      objectType: row.object_type,
      objectName: row.object_name,
      protocolDocumentId: row.protocol_document_id,
      status: row.status,
      approvedBy: row.approved_by,
      approvedAt: row.approved_at ? new Date(row.approved_at) : null,
      rejectionReason: row.rejection_reason,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      document: row.document_id ? {
        id: row.document_id,
        projectId: row.project_id,
        documentType: 'qualification_protocol' as const,
        fileName: row.file_name,
        fileSize: row.file_size,
        fileUrl: row.file_url,
        mimeType: row.mime_type,
        uploadedBy: row.uploaded_by,
        uploadedAt: row.uploaded_at ? new Date(row.uploaded_at) : new Date()
      } : undefined
    }));

    res.json(protocols);
  } catch (error) {
    console.error('Error fetching qualification protocols:', error);
    res.status(500).json({ error: 'Ошибка получения протоколов квалификации' });
  }
});

// POST /api/qualification-protocols - Создать протокол
router.post('/', async (req, res) => {
  try {
    const {
      projectId,
      qualificationObjectId,
      objectType,
      objectName,
      protocolDocumentId,
      status
    } = req.body;

    if (!projectId || !protocolDocumentId) {
      return res.status(400).json({ error: 'projectId и protocolDocumentId обязательны' });
    }

    const result = await pool.query(`
      INSERT INTO qualification_protocols (
        project_id, qualification_object_id, object_type, object_name,
        protocol_document_id, status
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      projectId,
      qualificationObjectId || null,
      objectType || null,
      objectName || null,
      protocolDocumentId,
      status || 'pending'
    ]);

    const row = result.rows[0];
    res.status(201).json({
      id: row.id,
      projectId: row.project_id,
      qualificationObjectId: row.qualification_object_id,
      objectType: row.object_type,
      objectName: row.object_name,
      protocolDocumentId: row.protocol_document_id,
      status: row.status,
      approvedBy: row.approved_by,
      approvedAt: row.approved_at ? new Date(row.approved_at) : null,
      rejectionReason: row.rejection_reason,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    });
  } catch (error: any) {
    console.error('Error creating qualification protocol:', error);
    res.status(500).json({ error: `Ошибка создания протокола: ${error.message}` });
  }
});

// PUT /api/qualification-protocols/:id - Обновить статус протокола
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, approvedBy, rejectionReason } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'status обязателен' });
    }

    const updateData: any = {
      status,
      updated_at: new Date()
    };

    if (status === 'approved') {
      updateData.approved_by = approvedBy || null;
      updateData.approved_at = new Date();
      updateData.rejection_reason = null;
    } else if (status === 'rejected') {
      updateData.rejection_reason = rejectionReason || null;
      updateData.approved_by = null;
      updateData.approved_at = null;
    } else {
      // pending
      updateData.approved_by = null;
      updateData.approved_at = null;
      updateData.rejection_reason = null;
    }

    const result = await pool.query(`
      UPDATE qualification_protocols
      SET status = $1, approved_by = $2, approved_at = $3, rejection_reason = $4, updated_at = $5
      WHERE id = $6
      RETURNING *
    `, [
      updateData.status,
      updateData.approved_by,
      updateData.approved_at,
      updateData.rejection_reason,
      updateData.updated_at,
      id
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Протокол не найден' });
    }

    const row = result.rows[0];
    res.json({
      id: row.id,
      projectId: row.project_id,
      qualificationObjectId: row.qualification_object_id,
      objectType: row.object_type,
      objectName: row.object_name,
      protocolDocumentId: row.protocol_document_id,
      status: row.status,
      approvedBy: row.approved_by,
      approvedAt: row.approved_at ? new Date(row.approved_at) : null,
      rejectionReason: row.rejection_reason,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    });
  } catch (error: any) {
    console.error('Error updating qualification protocol:', error);
    res.status(500).json({ error: `Ошибка обновления протокола: ${error.message}` });
  }
});

// DELETE /api/qualification-protocols/:id - Удалить протокол
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query('DELETE FROM qualification_protocols WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Протокол не найден' });
    }

    res.status(204).send();
  } catch (error: any) {
    console.error('Error deleting qualification protocol:', error);
    res.status(500).json({ error: `Ошибка удаления протокола: ${error.message}` });
  }
});

export default router;

