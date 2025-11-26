import express from 'express';
import { pool } from '../config/database.js';

const router = express.Router();

// GET /api/contractors - Получить всех контрагентов с контактами
router.get('/', async (req, res) => {
  try {
    // Проверяем наличие поля tags
    const tagsCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'contractors' 
      AND column_name = 'tags'
    `);
    const hasTagsField = tagsCheck.rows.length > 0;

    const selectFields = [
      'id, name, inn, kpp, address, phone, email, contact_person',
      'role',
      hasTagsField ? 'tags' : '',
      'created_at, updated_at'
    ].filter(Boolean).join(', ');

    const contractorsResult = await pool.query(`
      SELECT ${selectFields}
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
    
    const contractors = contractorsResult.rows.map((row: any) => {
      // Приводим tags из формата text[] (строка "{tag1,tag2}") к массиву строк
      let tags: string[] = [];
      if (Array.isArray(row.tags)) {
        tags = row.tags;
      } else if (typeof row.tags === 'string') {
        tags = row.tags
          .replace(/^{|}$/g, '')
          .split(',')
          .map((t: string) => t.trim())
          .filter((t: string) => t.length > 0);
      }

      return {
        id: row.id,
        name: row.name,
        address: row.address || undefined,
        role: row.role && Array.isArray(row.role) ? row.role : (row.role ? [row.role] : []),
        tags,
        latitude: undefined, // Пока не используется в БД
        longitude: undefined,
        geocodedAt: undefined,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        contacts: contactsByContractor.get(row.id) || []
      };
    });
    
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
    
    // Проверяем наличие полей latitude, longitude, geocoded_at в таблице
    const tableCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'contractors' 
      AND column_name IN ('latitude', 'longitude', 'geocoded_at')
    `);
    
    const hasGeoFields = tableCheck.rows.length > 0;
    
    // Проверяем наличие поля role
    const roleCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'contractors' 
      AND column_name = 'role'
    `);
    const hasRoleField = roleCheck.rows.length > 0;

    // Проверяем наличие поля tags
    const tagsCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'contractors' 
      AND column_name = 'tags'
    `);
    const hasTagsField = tagsCheck.rows.length > 0;
    
    const selectFields = [
      'id, name, inn, kpp, address, phone, email, contact_person',
      hasRoleField ? 'role' : '',
      hasTagsField ? 'tags' : '',
      hasGeoFields ? 'latitude, longitude, geocoded_at' : '',
      'created_at, updated_at'
    ].filter(Boolean).join(', ');
    
    const contractorResult = await pool.query(
      `SELECT ${selectFields} FROM contractors WHERE id = $1`,
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

    // Приводим tags из формата text[] (строка "{tag1,tag2}") к массиву строк
    let tags: string[] = [];
    if (Array.isArray(contractor.tags)) {
      tags = contractor.tags;
    } else if (typeof contractor.tags === 'string') {
      tags = contractor.tags
        .replace(/^{|}$/g, '')
        .split(',')
        .map((t: string) => t.trim())
        .filter((t: string) => t.length > 0);
    }
    res.json({
      id: contractor.id,
      name: contractor.name,
      address: contractor.address || undefined,
      role: contractor.role && Array.isArray(contractor.role) ? contractor.role : (contractor.role ? [contractor.role] : []),
      tags,
      latitude: contractor.latitude !== null && contractor.latitude !== undefined ? parseFloat(contractor.latitude) : undefined,
      longitude: contractor.longitude !== null && contractor.longitude !== undefined ? parseFloat(contractor.longitude) : undefined,
      geocodedAt: contractor.geocoded_at ? new Date(contractor.geocoded_at) : undefined,
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
    const { name, address, role, tags, contacts } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Название контрагента обязательно' });
    }
    
    // Проверяем наличие поля role
    const roleCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'contractors' 
      AND column_name = 'role'
    `);
    const hasRoleField = roleCheck.rows.length > 0;

    // Проверяем наличие поля tags
    const tagsCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'contractors' 
      AND column_name = 'tags'
    `);
    const hasTagsField = tagsCheck.rows.length > 0;
    
    let insertFields = '';
    let insertValues: any[] = [];
    
    if (hasRoleField && hasTagsField) {
      insertFields = 'INSERT INTO contractors (name, address, role, tags) VALUES ($1, $2, $3, $4) RETURNING id, name, address, role, tags, created_at, updated_at';
      insertValues = [
        name,
        address || null,
        role && Array.isArray(role) && role.length > 0 ? role : null,
        tags && Array.isArray(tags) && tags.length > 0 ? tags : []
      ];
    } else if (hasRoleField && !hasTagsField) {
      insertFields = 'INSERT INTO contractors (name, address, role) VALUES ($1, $2, $3) RETURNING id, name, address, role, created_at, updated_at';
      insertValues = [
        name,
        address || null,
        role && Array.isArray(role) && role.length > 0 ? role : null
      ];
    } else if (!hasRoleField && hasTagsField) {
      insertFields = 'INSERT INTO contractors (name, address, tags) VALUES ($1, $2, $3) RETURNING id, name, address, tags, created_at, updated_at';
      insertValues = [
        name,
        address || null,
        tags && Array.isArray(tags) && tags.length > 0 ? tags : []
      ];
    } else {
      insertFields = 'INSERT INTO contractors (name, address) VALUES ($1, $2) RETURNING id, name, address, created_at, updated_at';
      insertValues = [
        name,
        address || null
      ];
    }
    
    const result = await pool.query(insertFields, insertValues);
    
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
      role: contractor.role && Array.isArray(contractor.role) ? contractor.role : (contractor.role ? [contractor.role] : []),
      tags,
      latitude: undefined,
      longitude: undefined,
      geocodedAt: undefined,
      createdAt: new Date(contractor.created_at),
      updatedAt: new Date(contractor.updated_at),
      contacts: insertedContacts
    });
  } catch (error: any) {
    console.error('Error creating contractor:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      constraint: error.constraint
    });
    res.status(500).json({ 
      error: 'Ошибка создания контрагента',
      details: error.message || 'Неизвестная ошибка'
    });
  }
});

// PUT /api/contractors/:id - Обновить контрагента
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, address, role, tags, latitude, longitude, geocodedAt } = req.body;
    
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
    if (role !== undefined) {
      // Проверяем наличие поля role
      const roleCheck = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'contractors' 
        AND column_name = 'role'
      `);
      const hasRoleField = roleCheck.rows.length > 0;
      
      if (hasRoleField) {
        updates.push(`role = $${paramCount++}`);
        values.push(role && Array.isArray(role) && role.length > 0 ? role : null);
      }
    }
    if (tags !== undefined) {
      // Проверяем наличие поля tags
      const tagsCheck = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'contractors' 
        AND column_name = 'tags'
      `);
      const hasTagsField = tagsCheck.rows.length > 0;

      if (hasTagsField) {
        updates.push(`tags = $${paramCount++}`);
        values.push(tags && Array.isArray(tags) && tags.length > 0 ? tags : []);
      }
    }
    if (latitude !== undefined) {
      updates.push(`latitude = $${paramCount++}`);
      values.push(latitude || null);
    }
    if (longitude !== undefined) {
      updates.push(`longitude = $${paramCount++}`);
      values.push(longitude || null);
    }
    if (geocodedAt !== undefined) {
      updates.push(`geocoded_at = $${paramCount++}`);
      values.push(geocodedAt ? new Date(geocodedAt) : null);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'Нет данных для обновления' });
    }
    
    updates.push(`updated_at = NOW()`);
    values.push(id);
    
    // Проверяем наличие полей latitude, longitude, geocoded_at в таблице
    const tableCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'contractors' 
      AND column_name IN ('latitude', 'longitude', 'geocoded_at')
    `);
    
    const hasGeoFields = tableCheck.rows.length > 0;
    
    // Проверяем наличие поля role
    const roleCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'contractors' 
      AND column_name = 'role'
    `);
    const hasRoleField = roleCheck.rows.length > 0;
    
    // Формируем SELECT для RETURNING с учетом наличия полей
    const returningFields = [
      'id, name, address',
      hasRoleField ? 'role' : '',
      hasGeoFields ? 'latitude, longitude, geocoded_at' : '',
      'created_at, updated_at'
    ].filter(Boolean).join(', ');
    
    const result = await pool.query(
      `UPDATE contractors SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING ${returningFields}`,
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
      role: contractor.role && Array.isArray(contractor.role) ? contractor.role : (contractor.role ? [contractor.role] : []),
      tags,
      latitude: contractor.latitude !== null && contractor.latitude !== undefined ? parseFloat(contractor.latitude) : undefined,
      longitude: contractor.longitude !== null && contractor.longitude !== undefined ? parseFloat(contractor.longitude) : undefined,
      geocodedAt: contractor.geocoded_at ? new Date(contractor.geocoded_at) : undefined,
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

// POST /api/contractors/:id/contacts - Добавить контакт к контрагенту
router.post('/:id/contacts', async (req, res) => {
  try {
    const { id } = req.params;
    const { employeeName, phone, comment } = req.body;

    if (!employeeName) {
      return res.status(400).json({ error: 'Имя сотрудника обязательно' });
    }

    const result = await pool.query(`
      INSERT INTO contractor_contacts (contractor_id, employee_name, phone, comment)
      VALUES ($1, $2, $3, $4)
      RETURNING id, contractor_id, employee_name, phone, comment, created_at
    `, [id, employeeName, phone || null, comment || null]);

    const contact = result.rows[0];
    res.status(201).json({
      id: contact.id,
      contractorId: contact.contractor_id,
      employeeName: contact.employee_name,
      phone: contact.phone || undefined,
      comment: contact.comment || undefined,
      createdAt: new Date(contact.created_at)
    });
  } catch (error: any) {
    console.error('Error creating contact:', error);
    res.status(500).json({ 
      error: 'Ошибка создания контакта',
      details: error.message || 'Неизвестная ошибка'
    });
  }
});

// PUT /api/contractors/contacts/:id - Обновить контакт
router.put('/contacts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { employeeName, phone, comment } = req.body;

    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (employeeName !== undefined) {
      updates.push(`employee_name = $${paramCount++}`);
      values.push(employeeName);
    }
    if (phone !== undefined) {
      updates.push(`phone = $${paramCount++}`);
      values.push(phone || null);
    }
    if (comment !== undefined) {
      updates.push(`comment = $${paramCount++}`);
      values.push(comment || null);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Нет данных для обновления' });
    }

    values.push(id);

    const result = await pool.query(`
      UPDATE contractor_contacts
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING id, contractor_id, employee_name, phone, comment, created_at
    `, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Контакт не найден' });
    }

    const contact = result.rows[0];
    res.json({
      id: contact.id,
      contractorId: contact.contractor_id,
      employeeName: contact.employee_name,
      phone: contact.phone || undefined,
      comment: contact.comment || undefined,
      createdAt: new Date(contact.created_at)
    });
  } catch (error: any) {
    console.error('Error updating contact:', error);
    res.status(500).json({ 
      error: 'Ошибка обновления контакта',
      details: error.message || 'Неизвестная ошибка'
    });
  }
});

// DELETE /api/contractors/contacts/:id - Удалить контакт
router.delete('/contacts/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query('DELETE FROM contractor_contacts WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Контакт не найден' });
    }

    res.status(204).send();
  } catch (error: any) {
    console.error('Error deleting contact:', error);
    res.status(500).json({ 
      error: 'Ошибка удаления контакта',
      details: error.message || 'Неизвестная ошибка'
    });
  }
});

export default router;

