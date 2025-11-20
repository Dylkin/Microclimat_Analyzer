import express from 'express';
import { pool } from '../config/database.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// GET /api/tenders/settings - Получить настройки поиска пользователя
// Требуется авторизация
router.get('/settings', requireAuth, async (req, res) => {
  try {
    const userId = req.body.userId || req.query.userId as string;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId обязателен' });
    }
    
    const result = await pool.query(
      'SELECT * FROM tender_search_settings WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 1',
      [userId]
    );
    
    if (result.rows.length === 0) {
      return res.json(null);
    }
    
    const row = result.rows[0];
    res.json({
      id: row.id,
      userId: row.user_id,
      purchaseItems: row.purchase_items || [],
      organizationUnps: row.organization_unps || [],
      createdAt: row.created_at,
      updatedAt: row.updated_at
    });
  } catch (error) {
    console.error('Error fetching tender search settings:', error);
    res.status(500).json({ error: 'Ошибка получения настроек поиска' });
  }
});

// POST /api/tenders/settings - Сохранить настройки поиска
// Требуется авторизация
router.post('/settings', requireAuth, async (req, res) => {
  try {
    console.log('=== POST /api/tenders/settings ===');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('Request headers:', req.headers);
    
    const { userId, purchaseItems, organizationUnps } = req.body;
    
    console.log('Распарсенные данные:', { 
      userId, 
      purchaseItems, 
      organizationUnps,
      purchaseItemsType: typeof purchaseItems,
      organizationUnpsType: typeof organizationUnps,
      purchaseItemsIsArray: Array.isArray(purchaseItems),
      organizationUnpsIsArray: Array.isArray(organizationUnps)
    });
    
    if (!userId) {
      console.error('Ошибка: userId не предоставлен');
      console.error('Полный body:', req.body);
      return res.status(400).json({ error: 'userId обязателен' });
    }
    
    // Проверяем формат userId (должен быть UUID)
    if (typeof userId !== 'string' || userId.trim() === '') {
      console.error('Ошибка: userId имеет неверный формат:', userId, typeof userId);
      return res.status(400).json({ error: 'userId должен быть непустой строкой' });
    }
    
    // Убеждаемся, что массивы не undefined и являются массивами
    const items = Array.isArray(purchaseItems) ? purchaseItems : (purchaseItems ? [purchaseItems] : []);
    const unps = Array.isArray(organizationUnps) ? organizationUnps : (organizationUnps ? [organizationUnps] : []);
    
    console.log('Обработанные массивы:', { items, unps });
    
    // Проверяем, есть ли уже настройки
    // Примечание: пользователь уже проверен в middleware requireAuth
    const existing = await pool.query(
      'SELECT id FROM tender_search_settings WHERE user_id = $1 ORDER BY updated_at DESC LIMIT 1',
      [userId]
    );
    
    let result;
    if (existing.rows.length > 0) {
      // Обновляем существующие настройки
      console.log('Обновление существующих настроек для пользователя:', userId);
      result = await pool.query(
        `UPDATE tender_search_settings 
         SET purchase_items = $1, organization_unps = $2, updated_at = NOW()
         WHERE id = $3
         RETURNING id, user_id, purchase_items, organization_unps, created_at, updated_at`,
        [items, unps, existing.rows[0].id]
      );
    } else {
      // Создаем новые настройки
      console.log('Создание новых настроек для пользователя:', userId);
      result = await pool.query(
        `INSERT INTO tender_search_settings (user_id, purchase_items, organization_unps)
         VALUES ($1, $2, $3)
         RETURNING id, user_id, purchase_items, organization_unps, created_at, updated_at`,
        [userId, items, unps]
      );
    }
    
    if (result.rows.length === 0) {
      throw new Error('Не удалось сохранить настройки');
    }
    
    const row = result.rows[0];
    console.log('Настройки успешно сохранены:', row.id);
    
    res.json({
      id: row.id,
      userId: row.user_id,
      purchaseItems: row.purchase_items || [],
      organizationUnps: row.organization_unps || [],
      createdAt: row.created_at,
      updatedAt: row.updated_at
    });
  } catch (error: any) {
    console.error('Error saving tender search settings:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint,
      stack: error.stack
    });
    res.status(500).json({ 
      error: 'Ошибка сохранения настроек поиска',
      details: error.message 
    });
  }
});

// GET /api/tenders - Получить найденные тендеры
router.get('/', async (req, res) => {
  try {
    const searchSettingsId = req.query.searchSettingsId as string;
    const userId = req.query.userId as string;
    
    let query = 'SELECT * FROM tenders';
    const params: any[] = [];
    let paramCount = 1;
    
    if (searchSettingsId) {
      query += ` WHERE search_settings_id = $${paramCount}`;
      params.push(searchSettingsId);
      paramCount++;
    } else if (userId) {
      // Получаем последние настройки пользователя и их тендеры
      query = `
        SELECT t.* FROM tenders t
        INNER JOIN tender_search_settings tss ON t.search_settings_id = tss.id
        WHERE tss.user_id = $${paramCount}
        ORDER BY t.parsed_at DESC
      `;
      params.push(userId);
    } else {
      query += ' ORDER BY parsed_at DESC';
    }
    
    if (!searchSettingsId && !userId) {
      query += ' ORDER BY parsed_at DESC';
    }
    
    const result = await pool.query(query, params);
    
    const tenders = result.rows.map((row: any) => ({
      id: row.id,
      searchSettingsId: row.search_settings_id,
      tenderNumber: row.tender_number,
      title: row.title,
      organizationName: row.organization_name,
      organizationUnp: row.organization_unp,
      purchaseItem: row.purchase_item,
      publicationDate: row.publication_date,
      deadlineDate: row.deadline_date,
      tenderUrl: row.tender_url,
      status: row.status,
      parsedAt: row.parsed_at
    }));
    
    res.json(tenders);
  } catch (error) {
    console.error('Error fetching tenders:', error);
    res.status(500).json({ error: 'Ошибка получения тендеров' });
  }
});

// POST /api/tenders - Сохранить найденные тендеры
router.post('/', async (req, res) => {
  try {
    const { searchSettingsId, tenders } = req.body;
    
    if (!searchSettingsId || !Array.isArray(tenders)) {
      return res.status(400).json({ error: 'searchSettingsId и массив tenders обязательны' });
    }
    
    const savedTenders = [];
    
    for (const tender of tenders) {
      const result = await pool.query(
        `INSERT INTO tenders (
          search_settings_id, tender_number, title, organization_name, 
          organization_unp, purchase_item, publication_date, deadline_date, 
          tender_url, status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT DO NOTHING
        RETURNING id, search_settings_id, tender_number, title, organization_name, 
                  organization_unp, purchase_item, publication_date, deadline_date, 
                  tender_url, status, parsed_at`,
        [
          searchSettingsId,
          tender.tenderNumber,
          tender.title,
          tender.organizationName,
          tender.organizationUnp,
          tender.purchaseItem || null,
          tender.publicationDate,
          tender.deadlineDate || null,
          tender.tenderUrl,
          tender.status || null
        ]
      );
      
      if (result.rows.length > 0) {
        const row = result.rows[0];
        savedTenders.push({
          id: row.id,
          searchSettingsId: row.search_settings_id,
          tenderNumber: row.tender_number,
          title: row.title,
          organizationName: row.organization_name,
          organizationUnp: row.organization_unp,
          purchaseItem: row.purchase_item,
          publicationDate: row.publication_date,
          deadlineDate: row.deadline_date,
          tenderUrl: row.tender_url,
          status: row.status,
          parsedAt: row.parsed_at
        });
      }
    }
    
    res.json(savedTenders);
  } catch (error) {
    console.error('Error saving tenders:', error);
    res.status(500).json({ error: 'Ошибка сохранения тендеров' });
  }
});

// GET /api/tenders/history - Получить историю поиска
// Требуется авторизация
router.get('/history', requireAuth, async (req, res) => {
  try {
    const userId = req.query.userId as string;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId обязателен' });
    }
    
    const result = await pool.query(
      `SELECT 
        tsh.*,
        tss.purchase_items,
        tss.organization_unps
      FROM tender_search_history tsh
      LEFT JOIN tender_search_settings tss ON tsh.search_settings_id = tss.id
      WHERE tsh.user_id = $1
      ORDER BY tsh.search_date DESC
      LIMIT 50`,
      [userId]
    );
    
    const history = result.rows.map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      searchSettings: {
        id: row.search_settings_id,
        purchaseItems: row.purchase_items || [],
        organizationUnps: row.organization_unps || []
      },
      searchDate: row.search_date,
      foundTendersCount: row.found_tenders_count,
      parsingStatus: row.parsing_status,
      errorMessage: row.error_message
    }));
    
    res.json(history);
  } catch (error) {
    console.error('Error fetching tender search history:', error);
    res.status(500).json({ error: 'Ошибка получения истории поиска' });
  }
});

// POST /api/tenders/history - Сохранить запись в историю поиска
// Требуется авторизация
router.post('/history', requireAuth, async (req, res) => {
  try {
    const { userId, searchSettingsId, foundTendersCount, parsingStatus, errorMessage } = req.body;
    
    if (!userId || !parsingStatus) {
      return res.status(400).json({ error: 'userId и parsingStatus обязательны' });
    }
    
    const result = await pool.query(
      `INSERT INTO tender_search_history (
        user_id, search_settings_id, found_tenders_count, 
        parsing_status, error_message
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING id, user_id, search_settings_id, search_date, 
                found_tenders_count, parsing_status, error_message`,
      [userId, searchSettingsId || null, foundTendersCount || 0, parsingStatus, errorMessage || null]
    );
    
    const row = result.rows[0];
    res.json({
      id: row.id,
      userId: row.user_id,
      searchSettingsId: row.search_settings_id,
      searchDate: row.search_date,
      foundTendersCount: row.found_tenders_count,
      parsingStatus: row.parsing_status,
      errorMessage: row.error_message
    });
  } catch (error) {
    console.error('Error saving tender search history:', error);
    res.status(500).json({ error: 'Ошибка сохранения истории поиска' });
  }
});

export default router;

