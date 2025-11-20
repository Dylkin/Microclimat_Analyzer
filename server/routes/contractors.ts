import express from 'express';
import { pool } from '../config/database.js';

const router = express.Router();

// GET /api/contractors - Получить всех контрагентов с контактами
router.get('/', async (req, res) => {
  try {
    const contractorsResult = await pool.query(`
      SELECT id, name, inn, kpp, address, phone, email, contact_person, created_at, updated_at
      FROM contractors 
      ORDER BY name
    `);
    
    const contactsResult = await pool.query(`
      SELECT id, contractor_id, employee_name, phone, comment, created_at
      FROM contractor_contacts
      ORDER BY created_at
    `);
    
    // Группируем контакты по контрагентам
    const contactsByContractor = new Map();
    contactsResult.rows.forEach((contact: any) => {
      if (!contactsByContractor.has(contact.contractor_id)) {
        contactsByContractor.set(contact.contractor_id, []);
      }
      contactsByContractor.get(contact.contractor_id).push({
        id: contact.id,
        contractorId: contact.contractor_id,
        employeeName: contact.employee_name,
        phone: contact.phone || undefined,
        comment: contact.comment || undefined,
        createdAt: new Date(contact.created_at)
      });
    });
    
    const contractors = contractorsResult.rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      address: row.address || undefined,
      latitude: undefined, // Пока не используется в БД
      longitude: undefined,
      geocodedAt: undefined,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      contacts: contactsByContractor.get(row.id) || []
    }));
    
    res.json(contractors);
  } catch (error) {
    console.error('Error fetching contractors:', error);
    res.status(500).json({ error: 'Ошибка получения подрядчиков' });
  }
});

// GET /api/contractors/:id - Получить контрагента по ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const contractorResult = await pool.query(
      'SELECT id, name, inn, kpp, address, phone, email, contact_person, created_at, updated_at FROM contractors WHERE id = $1',
      [id]
    );
    
    if (contractorResult.rows.length === 0) {
      return res.status(404).json({ error: 'Контрагент не найден' });
    }
    
    const contactsResult = await pool.query(
      'SELECT id, contractor_id, employee_name, phone, comment, created_at FROM contractor_contacts WHERE contractor_id = $1 ORDER BY created_at',
      [id]
    );
    
    const contractor = contractorResult.rows[0];
    res.json({
      id: contractor.id,
      name: contractor.name,
      address: contractor.address || undefined,
      latitude: undefined,
      longitude: undefined,
      geocodedAt: undefined,
      createdAt: new Date(contractor.created_at),
      updatedAt: new Date(contractor.updated_at),
      contacts: contactsResult.rows.map((contact: any) => ({
        id: contact.id,
        contractorId: contact.contractor_id,
        employeeName: contact.employee_name,
        phone: contact.phone || undefined,
        comment: contact.comment || undefined,
        createdAt: new Date(contact.created_at)
      }))
    });
  } catch (error) {
    console.error('Error fetching contractor:', error);
    res.status(500).json({ error: 'Ошибка получения контрагента' });
  }
});

// POST /api/contractors - Создать контрагента
router.post('/', async (req, res) => {
  try {
    const { name, address, contacts } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Название контрагента обязательно' });
    }
    
    const result = await pool.query(
      'INSERT INTO contractors (name, address) VALUES ($1, $2) RETURNING id, name, address, created_at, updated_at',
      [name, address || null]
    );
    
    const contractor = result.rows[0];
    const contractorId = contractor.id;
    
    // Добавляем контакты если они есть
    const insertedContacts = [];
    if (contacts && contacts.length > 0) {
      for (const contact of contacts) {
        const contactResult = await pool.query(
          'INSERT INTO contractor_contacts (contractor_id, employee_name, phone, comment) VALUES ($1, $2, $3, $4) RETURNING id, contractor_id, employee_name, phone, comment, created_at',
          [contractorId, contact.employeeName, contact.phone || null, contact.comment || null]
        );
        insertedContacts.push({
          id: contactResult.rows[0].id,
          contractorId: contactResult.rows[0].contractor_id,
          employeeName: contactResult.rows[0].employee_name,
          phone: contactResult.rows[0].phone || undefined,
          comment: contactResult.rows[0].comment || undefined,
          createdAt: new Date(contactResult.rows[0].created_at)
        });
      }
    }
    
    res.status(201).json({
      id: contractor.id,
      name: contractor.name,
      address: contractor.address || undefined,
      latitude: undefined,
      longitude: undefined,
      geocodedAt: undefined,
      createdAt: new Date(contractor.created_at),
      updatedAt: new Date(contractor.updated_at),
      contacts: insertedContacts
    });
  } catch (error: any) {
    console.error('Error creating contractor:', error);
    res.status(500).json({ error: 'Ошибка создания контрагента' });
  }
});

// PUT /api/contractors/:id - Обновить контрагента
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, address } = req.body;
    
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;
    
    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (address !== undefined) {
      updates.push(`address = $${paramCount++}`);
      values.push(address || null);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'Нет данных для обновления' });
    }
    
    updates.push(`updated_at = NOW()`);
    values.push(id);
    
    const result = await pool.query(
      `UPDATE contractors SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING id, name, address, created_at, updated_at`,
      values
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Контрагент не найден' });
    }
    
    // Получаем контакты
    const contactsResult = await pool.query(
      'SELECT id, contractor_id, employee_name, phone, comment, created_at FROM contractor_contacts WHERE contractor_id = $1 ORDER BY created_at',
      [id]
    );
    
    const contractor = result.rows[0];
    res.json({
      id: contractor.id,
      name: contractor.name,
      address: contractor.address || undefined,
      latitude: undefined,
      longitude: undefined,
      geocodedAt: undefined,
      createdAt: new Date(contractor.created_at),
      updatedAt: new Date(contractor.updated_at),
      contacts: contactsResult.rows.map((contact: any) => ({
        id: contact.id,
        contractorId: contact.contractor_id,
        employeeName: contact.employee_name,
        phone: contact.phone || undefined,
        comment: contact.comment || undefined,
        createdAt: new Date(contact.created_at)
      }))
    });
  } catch (error) {
    console.error('Error updating contractor:', error);
    res.status(500).json({ error: 'Ошибка обновления контрагента' });
  }
});

// DELETE /api/contractors/:id - Удалить контрагента
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    await pool.query('DELETE FROM contractors WHERE id = $1', [id]);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting contractor:', error);
    res.status(500).json({ error: 'Ошибка удаления контрагента' });
  }
});

export default router;

