import express from 'express';
import { pool } from '../config/database.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

// Test endpoint для проверки заголовков (БЕЗ requireAuth для отладки)
router.get('/test-headers', (req, res) => {
  const allHeaders: Record<string, any> = {};
  Object.keys(req.headers).forEach(key => {
    allHeaders[key] = req.headers[key];
  });
  
  const xHeaders: Record<string, any> = {};
  Object.keys(req.headers).forEach(key => {
    if (key.toLowerCase().startsWith('x-') || key.toLowerCase().includes('user')) {
      xHeaders[key] = req.headers[key];
    }
  });
  
  res.json({
    method: req.method,
    path: req.path,
    query: req.query,
    body: req.body,
    allHeaders: allHeaders,
    xHeaders: xHeaders,
    specificHeaders: {
      'x-user-id': req.headers['x-user-id'],
      'X-User-Id': req.headers['x-user-id'],
      'x-userid': req.headers['x-userid'],
      'user-id': req.headers['user-id'],
    }
  });
});

// GET /api/projects - Получить все проекты
router.get('/', (req, res, next) => {
  // Логируем заголовки для отладки
  console.log('GET /api/projects - Заголовки запроса:', {
    'x-user-id': req.headers['x-user-id'],
    'X-User-Id': req.headers['x-user-id'],
    'x-userid': req.headers['x-userid'],
    'user-id': req.headers['user-id'],
    query: req.query,
    allXHeaders: Object.keys(req.headers)
      .filter(k => k.toLowerCase().startsWith('x-') || k.toLowerCase().includes('user'))
      .reduce((acc, k) => { acc[k] = req.headers[k]; return acc; }, {} as Record<string, any>)
  });
  next();
}, requireAuth, async (req, res) => {
  try {
    // Проверяем наличие полей tender_link и tender_date
    const tenderFieldsCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'projects' 
      AND column_name IN ('tender_link', 'tender_date')
    `);
    const hasTenderFields = tenderFieldsCheck.rows.length > 0;
    
    const selectFields = hasTenderFields
      ? 'p.id, p.name, p.description, p.type, p.contractor_id, p.contract_number, p.contract_date, p.tender_link, p.tender_date, p.status, p.created_by, p.created_at, p.updated_at, c.name as contractor_name'
      : 'p.id, p.name, p.description, p.type, p.contractor_id, p.contract_number, p.contract_date, p.status, p.created_by, p.created_at, p.updated_at, c.name as contractor_name';
    
    const result = await pool.query(`
      SELECT ${selectFields}
      FROM projects p
      LEFT JOIN contractors c ON p.contractor_id = c.id
      ORDER BY p.created_at DESC
    `);
    
    // Проверяем наличие таблицы project_qualification_objects
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'project_qualification_objects'
      )
    `);
    
    const hasProjectQualificationObjectsTable = tableCheck.rows[0].exists;
    
    // Получаем объекты квалификации для каждого проекта
    const projects = await Promise.all(result.rows.map(async (row) => {
      let qualificationObjects: any[] = [];
      
      if (hasProjectQualificationObjectsTable) {
        // Используем таблицу связей
        const objectsResult = await pool.query(`
          SELECT pqo.id, pqo.qualification_object_id, qo.name, qo.object_type
          FROM project_qualification_objects pqo
          JOIN qualification_objects qo ON pqo.qualification_object_id = qo.id
          WHERE pqo.project_id = $1
        `, [row.id]);
        qualificationObjects = objectsResult.rows.map(obj => ({
          id: obj.id,
          qualificationObjectId: obj.qualification_object_id,
          name: obj.name,
          objectType: obj.object_type
        }));
      } else {
        // Используем прямое поле project_id в qualification_objects
        const objectsResult = await pool.query(`
          SELECT id, name, object_type
          FROM qualification_objects
          WHERE project_id = $1
        `, [row.id]);
        qualificationObjects = objectsResult.rows.map(obj => ({
          id: obj.id,
          qualificationObjectId: obj.id,
          name: obj.name,
          objectType: obj.object_type
        }));
      }
      
      // Получаем товары проекта, если они есть
      let items: any[] = [];
      const itemsTableCheck = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'project_items'
        )
      `);
      
      if (itemsTableCheck.rows[0].exists) {
        // Проверяем наличие новых колонок для технических характеристик
        const columnsCheck = await pool.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'project_items'
          AND column_name IN ('category_id', 'channels_count', 'dosing_volume', 'volume_step', 
                              'dosing_accuracy', 'reproducibility', 'autoclavable', 'in_registry_si')
        `);
        const hasNewColumns = columnsCheck.rows.length > 0;
        const newColumnsList = columnsCheck.rows.map(r => r.column_name);
        const hasCategoryId = newColumnsList.includes('category_id');
        
        // Формируем список колонок для SELECT
        let selectColumns = 'pi.id, pi.name, pi.quantity, pi.declared_price, pi.supplier_id, pi.supplier_price, pi.description, pi.created_at, pi.updated_at, c.name as supplier_name';
        if (hasNewColumns) {
          selectColumns += ', pi.category_id, pi.channels_count, pi.dosing_volume, pi.volume_step, pi.dosing_accuracy, pi.reproducibility, pi.autoclavable, pi.in_registry_si';
        }
        if (hasCategoryId) {
          selectColumns += ', es.name as category_name';
        }
        
        let itemsQuery = `
          SELECT ${selectColumns}
          FROM project_items pi
          LEFT JOIN contractors c ON pi.supplier_id = c.id
        `;
        if (hasCategoryId) {
          itemsQuery += ' LEFT JOIN equipment_sections es ON pi.category_id = es.id';
        }
        itemsQuery += ' WHERE pi.project_id = $1 ORDER BY pi.created_at';
        
        try {
          const itemsResult = await pool.query(itemsQuery, [row.id]);
          
          items = itemsResult.rows.map(item => ({
          id: item.id,
          projectId: row.id,
          name: item.name,
          quantity: item.quantity,
          declaredPrice: parseFloat(item.declared_price),
          supplierId: item.supplier_id,
          supplierName: item.supplier_name,
          supplierPrice: item.supplier_price ? parseFloat(item.supplier_price) : undefined,
          description: item.description,
          categoryId: hasNewColumns ? item.category_id : undefined,
          categoryName: hasCategoryId ? item.category_name : undefined,
          channelsCount: hasNewColumns ? item.channels_count : undefined,
          dosingVolume: hasNewColumns ? item.dosing_volume : undefined,
          volumeStep: hasNewColumns ? item.volume_step : undefined,
          dosingAccuracy: hasNewColumns ? item.dosing_accuracy : undefined,
          reproducibility: hasNewColumns ? item.reproducibility : undefined,
          autoclavable: hasNewColumns ? item.autoclavable : undefined,
          inRegistrySI: hasNewColumns ? item.in_registry_si : undefined,
          createdAt: new Date(item.created_at),
          updatedAt: new Date(item.updated_at)
          }));
        } catch (itemsError: any) {
          console.error(`Error fetching items for project ${row.id}:`, itemsError);
          console.error('Items query:', itemsQuery);
          console.error('Items error details:', {
            message: itemsError.message,
            code: itemsError.code,
            detail: itemsError.detail,
            hint: itemsError.hint
          });
          // Продолжаем без товаров, чтобы не прерывать загрузку проектов
          items = [];
        }
      }
      
      return {
        id: row.id,
        name: row.name,
        description: row.description,
        type: row.type || 'qualification',
        contractorId: row.contractor_id,
        contractorName: row.contractor_name,
        contractNumber: row.contract_number,
        contractDate: row.contract_date ? new Date(row.contract_date) : undefined,
        tenderLink: row.tender_link || undefined,
        tenderDate: row.tender_date ? new Date(row.tender_date) : undefined,
        status: row.status,
        createdBy: row.created_by,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        qualificationObjects: qualificationObjects,
        items: items.length > 0 ? items : undefined
      };
    }));
    
    res.json(projects);
  } catch (error: any) {
    console.error('Error fetching projects:', error);
    console.error('Error stack:', error.stack);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint,
      position: error.position,
      internalPosition: error.internalPosition,
      internalQuery: error.internalQuery,
      where: error.where,
      schema: error.schema,
      table: error.table,
      column: error.column,
      dataType: error.dataType,
      constraint: error.constraint,
      file: error.file,
      line: error.line,
      routine: error.routine
    });
    res.status(500).json({
      error: 'Ошибка получения проектов',
      details: process.env.NODE_ENV === 'development' ? (error.message || String(error)) : undefined,
    });
  }
});

// GET /api/projects/:id - Получить проект по ID
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Проверяем наличие полей tender_link и tender_date
    const tenderFieldsCheck = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'projects' 
      AND column_name IN ('tender_link', 'tender_date')
    `);
    const hasTenderFields = tenderFieldsCheck.rows.length > 0;
    
    const selectFields = hasTenderFields
      ? 'p.id, p.name, p.description, p.type, p.contractor_id, p.contract_number, p.contract_date, p.tender_link, p.tender_date, p.status, p.created_by, p.created_at, p.updated_at, c.name as contractor_name'
      : 'p.id, p.name, p.description, p.type, p.contractor_id, p.contract_number, p.contract_date, p.status, p.created_by, p.created_at, p.updated_at, c.name as contractor_name';
    
    const projectResult = await pool.query(`
      SELECT ${selectFields}
      FROM projects p
      LEFT JOIN contractors c ON p.contractor_id = c.id
      WHERE p.id = $1
    `, [id]);
    
    if (projectResult.rows.length === 0) {
      return res.status(404).json({ error: 'Проект не найден' });
    }
    
    const projectRow = projectResult.rows[0];
    
    // Проверяем наличие таблицы project_qualification_objects
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'project_qualification_objects'
      )
    `);
    
    // Получаем связанные объекты квалификации
    let objectsResult;
    if (tableCheck.rows[0].exists) {
      // Используем таблицу связей
      objectsResult = await pool.query(`
        SELECT pqo.id, pqo.qualification_object_id, qo.name, qo.object_type
        FROM project_qualification_objects pqo
        JOIN qualification_objects qo ON pqo.qualification_object_id = qo.id
        WHERE pqo.project_id = $1
      `, [id]);
    } else {
      // Используем прямое поле project_id
      objectsResult = await pool.query(`
        SELECT id, name, object_type
        FROM qualification_objects
        WHERE project_id = $1
      `, [id]);
    }
    
    // Получаем товары проекта
    let projectItems: any[] = [];
    const itemsTableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'project_items'
      )
    `);
    
    if (itemsTableCheck.rows[0].exists) {
      // Проверяем наличие новых колонок для технических характеристик
      const columnsCheck = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'project_items'
        AND column_name IN ('category_id', 'channels_count', 'dosing_volume', 'volume_step', 
                            'dosing_accuracy', 'reproducibility', 'autoclavable', 'in_registry_si')
      `);
      const hasNewColumns = columnsCheck.rows.length > 0;
      const newColumnsList = columnsCheck.rows.map(r => r.column_name);
      const hasCategoryId = newColumnsList.includes('category_id');
      
      // Формируем список колонок для SELECT
      let selectColumns = 'pi.id, pi.name, pi.quantity, pi.declared_price, pi.supplier_id, pi.supplier_price, pi.description, pi.created_at, pi.updated_at, c.name as supplier_name';
      if (hasNewColumns) {
        selectColumns += ', pi.category_id, pi.channels_count, pi.dosing_volume, pi.volume_step, pi.dosing_accuracy, pi.reproducibility, pi.autoclavable, pi.in_registry_si';
      }
      if (hasCategoryId) {
        selectColumns += ', es.name as category_name';
      }
      
      let itemsQuery = `
        SELECT ${selectColumns}
        FROM project_items pi
        LEFT JOIN contractors c ON pi.supplier_id = c.id
      `;
      if (hasCategoryId) {
        itemsQuery += ' LEFT JOIN equipment_sections es ON pi.category_id = es.id';
      }
      itemsQuery += ' WHERE pi.project_id = $1 ORDER BY pi.created_at';
      
      const itemsResult = await pool.query(itemsQuery, [id]);
      
      console.log('GET /api/projects/:id - Результат запроса товаров:', {
        hasNewColumns,
        hasCategoryId,
        newColumnsList,
        rowsCount: itemsResult.rows.length,
        firstRow: itemsResult.rows[0] ? {
          id: itemsResult.rows[0].id,
          name: itemsResult.rows[0].name,
          category_id: itemsResult.rows[0].category_id,
          category_id_type: typeof itemsResult.rows[0].category_id,
          category_name: itemsResult.rows[0].category_name,
          allColumns: Object.keys(itemsResult.rows[0])
        } : null
      });
      
      projectItems = itemsResult.rows.map(item => {
        const mappedItem = {
          id: item.id,
          projectId: id,
          name: item.name,
          quantity: item.quantity,
          declaredPrice: parseFloat(item.declared_price),
          supplierId: item.supplier_id,
          supplierName: item.supplier_name,
          supplierPrice: item.supplier_price ? parseFloat(item.supplier_price) : undefined,
          description: item.description,
          categoryId: hasNewColumns ? item.category_id : undefined,
          categoryName: hasCategoryId ? item.category_name : undefined,
          channelsCount: hasNewColumns ? item.channels_count : undefined,
          dosingVolume: hasNewColumns ? item.dosing_volume : undefined,
          volumeStep: hasNewColumns ? item.volume_step : undefined,
          dosingAccuracy: hasNewColumns ? item.dosing_accuracy : undefined,
          reproducibility: hasNewColumns ? item.reproducibility : undefined,
          autoclavable: hasNewColumns ? item.autoclavable : undefined,
          inRegistrySI: hasNewColumns ? item.in_registry_si : undefined,
          createdAt: new Date(item.created_at),
          updatedAt: new Date(item.updated_at)
        };
        console.log('GET /api/projects/:id - Загружен товар:', {
          itemName: mappedItem.name,
          hasNewColumns,
          hasCategoryId,
          categoryId: mappedItem.categoryId,
          categoryIdType: typeof mappedItem.categoryId,
          categoryName: mappedItem.categoryName,
          rawCategoryId: item.category_id,
          rawCategoryIdType: typeof item.category_id,
          rawCategoryName: item.category_name,
          selectColumns: selectColumns
        });
        return mappedItem;
      });
    }
    
    // Получаем назначения этапов (если таблица существует)
    let stagesResult;
    try {
      const tableCheckStages = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'project_stage_assignments'
        )
      `);
      
      if (tableCheckStages.rows[0].exists) {
        stagesResult = await pool.query(`
          SELECT id, stage, assigned_user_id, assigned_at, completed_at, notes
          FROM project_stage_assignments
          WHERE project_id = $1
          ORDER BY assigned_at
        `, [id]);
      } else {
        stagesResult = { rows: [] };
      }
    } catch (error) {
      console.error('Error fetching stage assignments:', error);
      stagesResult = { rows: [] };
    }
    
    const project = {
      id: projectRow.id,
      name: projectRow.name,
      description: projectRow.description,
      type: projectRow.type || 'qualification',
      contractorId: projectRow.contractor_id,
      contractorName: projectRow.contractor_name,
      contractNumber: projectRow.contract_number,
      contractDate: projectRow.contract_date ? new Date(projectRow.contract_date) : undefined,
      tenderLink: projectRow.tender_link || undefined,
      tenderDate: projectRow.tender_date ? new Date(projectRow.tender_date) : undefined,
      status: projectRow.status,
      createdBy: projectRow.created_by,
      createdAt: new Date(projectRow.created_at),
      updatedAt: new Date(projectRow.updated_at),
      qualificationObjects: objectsResult.rows.map(row => ({
        id: tableCheck.rows[0].exists ? row.id : row.id,
        qualificationObjectId: tableCheck.rows[0].exists ? row.qualification_object_id : row.id,
        name: row.name,
        objectType: row.object_type
      })),
      items: projectItems.length > 0 ? projectItems : undefined,
      stageAssignments: (stagesResult?.rows || []).map(row => ({
        id: row.id,
        stage: row.stage,
        assignedUserId: row.assigned_user_id,
        assignedAt: row.assigned_at ? new Date(row.assigned_at) : undefined,
        completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
        notes: row.notes
      }))
    };
    
    res.json(project);
  } catch (error: any) {
    console.error('Error fetching project:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    res.status(500).json({ 
      error: 'Ошибка получения проекта',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// POST /api/projects - Создать проект
router.post('/', requireAuth, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    
    const { name, description, type, contractorId, contractNumber, contractDate, tenderLink, tenderDate, status, createdBy, qualificationObjectIds, items: projectItemsData } = req.body;
    
    if (!name || !contractorId) {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Название и подрядчик обязательны' });
    }
    
    // Проверяем наличие полей tender_link и tender_date
    const tenderFieldsCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'projects' 
      AND column_name IN ('tender_link', 'tender_date')
    `);
    const hasTenderFields = tenderFieldsCheck.rows.length > 0;
    
    // Формируем запрос с учетом наличия полей
    const insertFields = hasTenderFields
      ? 'INSERT INTO projects (name, description, type, contractor_id, contract_number, contract_date, tender_link, tender_date, status, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id, name, description, type, contractor_id, contract_number, contract_date, tender_link, tender_date, status, created_by, created_at, updated_at'
      : 'INSERT INTO projects (name, description, type, contractor_id, contract_number, contract_date, status, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, name, description, type, contractor_id, contract_number, contract_date, status, created_by, created_at, updated_at';
    
    // Начальный статус по умолчанию — "Подача документов"
    const initialStatus = status || 'documents_submission';
    
    const insertValues = hasTenderFields
      ? [name, description || null, type || 'qualification', contractorId, contractNumber || null, contractDate || null, tenderLink || null, tenderDate || null, initialStatus, createdBy || null]
      : [name, description || null, type || 'qualification', contractorId, contractNumber || null, contractDate || null, initialStatus, createdBy || null];
    
    // Создаем проект
    const result = await client.query(insertFields, insertValues);
    
    const project = result.rows[0];
    const projectId = project.id;
    
    // Добавляем связи с объектами квалификации, если они указаны
    if (qualificationObjectIds && Array.isArray(qualificationObjectIds) && qualificationObjectIds.length > 0) {
      // Проверяем существование таблицы project_qualification_objects
      const tableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'project_qualification_objects'
        )
      `);
      
      if (tableCheck.rows[0].exists) {
        // Вставляем связи в таблицу project_qualification_objects
        for (const objectId of qualificationObjectIds) {
          try {
            await client.query(`
              INSERT INTO project_qualification_objects (project_id, qualification_object_id)
              VALUES ($1, $2)
              ON CONFLICT (project_id, qualification_object_id) DO NOTHING
            `, [projectId, objectId]);
          } catch (linkError: any) {
            console.error(`Ошибка добавления связи с объектом ${objectId}:`, linkError);
            // Продолжаем с другими объектами
          }
        }
      } else {
        // Если таблицы нет, обновляем project_id в объектах квалификации напрямую
        for (const objectId of qualificationObjectIds) {
          try {
            await client.query(`
              UPDATE qualification_objects
              SET project_id = $1
              WHERE id = $2
            `, [projectId, objectId]);
          } catch (updateError: any) {
            console.error(`Ошибка обновления объекта ${objectId}:`, updateError);
            // Продолжаем с другими объектами
          }
        }
      }
    }

    // Добавляем товары проекта (для типа "Продажа"), если они указаны и таблица существует
    if (projectItemsData && Array.isArray(projectItemsData) && projectItemsData.length > 0) {
      const itemsTableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'project_items'
        )
      `);

      if (itemsTableCheck.rows[0].exists) {
        // Проверяем наличие новых колонок перед вставкой
        const insertColumnsCheck = await client.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'project_items'
          AND column_name IN ('category_id', 'channels_count', 'dosing_volume', 'volume_step', 
                              'dosing_accuracy', 'reproducibility', 'autoclavable', 'in_registry_si')
        `);
        const hasNewColumnsForInsert = insertColumnsCheck.rows.length > 0;
        
        for (const item of projectItemsData) {
          try {
            console.log('POST /api/projects - Сохранение товара:', {
              itemName: item.name,
              categoryId: item.categoryId,
              hasNewColumnsForInsert
            });
            if (hasNewColumnsForInsert) {
              await client.query(
                `
                INSERT INTO project_items
                  (project_id, name, quantity, declared_price, supplier_id, supplier_price, description,
                   category_id, channels_count, dosing_volume, volume_step, dosing_accuracy, 
                   reproducibility, autoclavable, in_registry_si)
                VALUES
                  ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
                `,
                [
                  projectId,
                  item.name,
                  item.quantity,
                  item.declaredPrice ?? 0,
                  item.supplierId || null,
                  item.supplierPrice ?? null,
                  item.description || null,
                  item.categoryId || null,
                  item.channelsCount || null,
                  item.dosingVolume || null,
                  item.volumeStep || null,
                  item.dosingAccuracy || null,
                  item.reproducibility || null,
                  item.autoclavable !== undefined ? item.autoclavable : null,
                  item.inRegistrySI || false,
                ],
              );
              console.log('POST /api/projects - Товар сохранен с categoryId:', item.categoryId);
            } else {
              // Старый вариант без новых колонок
              await client.query(
                `
                INSERT INTO project_items
                  (project_id, name, quantity, declared_price, supplier_id, supplier_price, description)
                VALUES
                  ($1, $2, $3, $4, $5, $6, $7)
                `,
                [
                  projectId,
                  item.name,
                  item.quantity,
                  item.declaredPrice ?? 0,
                  item.supplierId || null,
                  item.supplierPrice ?? null,
                  item.description || null,
                ],
              );
            }
          } catch (itemError: any) {
            console.error('Ошибка добавления товара проекта:', {
              error: itemError,
              item,
            });
            // Не прерываем транзакцию из-за одной неудачной позиции
          }
        }
      }
    }
    
    await client.query('COMMIT');
    
    // Получаем полную информацию о проекте с объектами квалификации
    const fullProjectResult = await pool.query(`
      SELECT 
        p.id, p.name, p.description, p.type, p.contractor_id, 
        p.contract_number, p.contract_date, p.status, 
        p.created_by, p.created_at, p.updated_at,
        c.name as contractor_name
      FROM projects p
      LEFT JOIN contractors c ON p.contractor_id = c.id
      WHERE p.id = $1
    `, [projectId]);
    
    const projectRow = fullProjectResult.rows[0];
    
    // Получаем связанные объекты квалификации
    let qualificationObjects: any[] = [];
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'project_qualification_objects'
      )
    `);
    
    if (tableCheck.rows[0].exists) {
      const objectsResult = await pool.query(`
        SELECT pqo.id, pqo.qualification_object_id, qo.name, qo.object_type
        FROM project_qualification_objects pqo
        JOIN qualification_objects qo ON pqo.qualification_object_id = qo.id
        WHERE pqo.project_id = $1
      `, [projectId]);
      qualificationObjects = objectsResult.rows.map(row => ({
        id: row.id,
        qualificationObjectId: row.qualification_object_id,
        name: row.name,
        objectType: row.object_type
      }));
    } else {
      // Если таблицы нет, получаем объекты по project_id
      const objectsResult = await pool.query(`
        SELECT id, name, object_type
        FROM qualification_objects
        WHERE project_id = $1
      `, [projectId]);
      qualificationObjects = objectsResult.rows.map(row => ({
        id: row.id,
        qualificationObjectId: row.id,
        name: row.name,
        objectType: row.object_type
      }));
    }
    
    // Получаем товары проекта
    let savedItems: any[] = [];
    const itemsTableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'project_items'
      )
    `);
    
    if (itemsTableCheck.rows[0].exists) {
      // Проверяем наличие новых колонок для технических характеристик
      const columnsCheck = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'project_items'
        AND column_name IN ('category_id', 'channels_count', 'dosing_volume', 'volume_step', 
                            'dosing_accuracy', 'reproducibility', 'autoclavable', 'in_registry_si')
      `);
      const hasNewColumns = columnsCheck.rows.length > 0;
      const newColumnsList = columnsCheck.rows.map(r => r.column_name);
      const hasCategoryId = newColumnsList.includes('category_id');
      
      // Формируем список колонок для SELECT
      let selectColumns = 'pi.id, pi.name, pi.quantity, pi.declared_price, pi.supplier_id, pi.supplier_price, pi.description, pi.created_at, pi.updated_at, c.name as supplier_name';
      if (hasNewColumns) {
        selectColumns += ', pi.category_id, pi.channels_count, pi.dosing_volume, pi.volume_step, pi.dosing_accuracy, pi.reproducibility, pi.autoclavable, pi.in_registry_si';
      }
      if (hasCategoryId) {
        selectColumns += ', es.name as category_name';
      }
      
      let itemsQuery = `
        SELECT ${selectColumns}
        FROM project_items pi
        LEFT JOIN contractors c ON pi.supplier_id = c.id
      `;
      if (hasCategoryId) {
        itemsQuery += ' LEFT JOIN equipment_sections es ON pi.category_id = es.id';
      }
      itemsQuery += ' WHERE pi.project_id = $1 ORDER BY pi.created_at';
      
      const itemsResult = await pool.query(itemsQuery, [projectId]);
      
      savedItems = itemsResult.rows.map(item => ({
        id: item.id,
        projectId: projectId,
        name: item.name,
        quantity: item.quantity,
        declaredPrice: parseFloat(item.declared_price),
        supplierId: item.supplier_id,
        supplierName: item.supplier_name,
        supplierPrice: item.supplier_price ? parseFloat(item.supplier_price) : undefined,
        description: item.description,
        categoryId: hasNewColumns ? item.category_id : undefined,
        categoryName: hasCategoryId ? item.category_name : undefined,
        channelsCount: hasNewColumns ? item.channels_count : undefined,
        dosingVolume: hasNewColumns ? item.dosing_volume : undefined,
        volumeStep: hasNewColumns ? item.volume_step : undefined,
        dosingAccuracy: hasNewColumns ? item.dosing_accuracy : undefined,
        reproducibility: hasNewColumns ? item.reproducibility : undefined,
        autoclavable: hasNewColumns ? item.autoclavable : undefined,
        inRegistrySI: hasNewColumns ? item.in_registry_si : undefined,
        createdAt: new Date(item.created_at),
        updatedAt: new Date(item.updated_at)
      }));
    }
    
    res.status(201).json({
      id: projectRow.id,
      name: projectRow.name,
      description: projectRow.description,
      type: projectRow.type || 'qualification',
      contractorId: projectRow.contractor_id,
      contractorName: projectRow.contractor_name,
      contractNumber: projectRow.contract_number,
      contractDate: projectRow.contract_date ? new Date(projectRow.contract_date) : undefined,
      tenderLink: projectRow.tender_link || undefined,
      tenderDate: projectRow.tender_date ? new Date(projectRow.tender_date) : undefined,
      status: projectRow.status,
      createdBy: projectRow.created_by,
      createdAt: new Date(projectRow.created_at),
      updatedAt: new Date(projectRow.updated_at),
      qualificationObjects: qualificationObjects,
      items: savedItems.length > 0 ? savedItems : undefined
    });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Error creating project:', error);
    res.status(500).json({ error: `Ошибка создания проекта: ${error.message || 'Неизвестная ошибка'}` });
  } finally {
    client.release();
  }
});

// PUT /api/projects/:id - Обновить проект
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, type, contractorId, contractNumber, contractDate, status } = req.body;
    
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;
    
    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description);
    }
    if (type !== undefined) {
      updates.push(`type = $${paramCount++}`);
      values.push(type);
    }
    if (contractorId !== undefined) {
      updates.push(`contractor_id = $${paramCount++}`);
      values.push(contractorId);
    }
    if (contractNumber !== undefined) {
      updates.push(`contract_number = $${paramCount++}`);
      values.push(contractNumber);
    }
    if (contractDate !== undefined) {
      updates.push(`contract_date = $${paramCount++}`);
      values.push(contractDate);
    }
    if (status !== undefined) {
      updates.push(`status = $${paramCount++}`);
      values.push(status);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'Нет данных для обновления' });
    }
    
    updates.push(`updated_at = NOW()`);
    values.push(id);
    
    const result = await pool.query(
      `UPDATE projects SET ${updates.join(', ')} WHERE id = $${paramCount}
       RETURNING id, name, description, type, contractor_id, contract_number, contract_date, status, created_by, created_at, updated_at`,
      values
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Проект не найден' });
    }
    
    const project = result.rows[0];
    res.json({
      id: project.id,
      name: project.name,
      description: project.description,
      type: project.type || 'qualification',
      contractorId: project.contractor_id,
      contractNumber: project.contract_number,
      contractDate: project.contract_date ? new Date(project.contract_date) : undefined,
      status: project.status,
      createdBy: project.created_by,
      createdAt: new Date(project.created_at),
      updatedAt: new Date(project.updated_at)
    });
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ error: 'Ошибка обновления проекта' });
  }
});

// POST /api/projects/:id/not-suitable - Установить статус "Не подходит" с комментарием
router.post('/:id/not-suitable', requireAuth, async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { comment, userId } = req.body;

    if (!comment || typeof comment !== 'string' || !comment.trim()) {
      client.release();
      return res.status(400).json({ error: 'Комментарий обязателен для заполнения' });
    }

    await client.query('BEGIN');

    // Обновляем статус проекта
    await client.query(
      `UPDATE projects 
       SET status = $1, updated_at = NOW()
       WHERE id = $2`,
      ['not_suitable', id],
    );

    // Фиксируем комментарий, дату/время и пользователя в project_stage_assignments
    await client.query(
      `
      INSERT INTO project_stage_assignments (project_id, stage, assigned_user_id, assigned_at, completed_at, notes)
      VALUES ($1, $2, $3, NOW(), NOW(), $4)
      ON CONFLICT (project_id, stage)
      DO UPDATE SET 
        assigned_user_id = EXCLUDED.assigned_user_id,
        assigned_at = NOW(),
        completed_at = NOW(),
        notes = EXCLUDED.notes
      `,
      [id, 'not_suitable', userId || null, comment.trim()],
    );

    await client.query('COMMIT');

    // Возвращаем обновлённый проект
    const result = await pool.query(
      `SELECT id, name, description, type, contractor_id, contract_number, contract_date, status, created_by, created_at, updated_at
       FROM projects
       WHERE id = $1`,
      [id],
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Проект не найден' });
    }

    const project = result.rows[0];
    res.json({
      id: project.id,
      name: project.name,
      description: project.description,
      type: project.type || 'qualification',
      contractorId: project.contractor_id,
      contractNumber: project.contract_number,
      contractDate: project.contract_date ? new Date(project.contract_date) : undefined,
      status: project.status,
      createdBy: project.created_by,
      createdAt: new Date(project.created_at),
      updatedAt: new Date(project.updated_at),
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error setting not_suitable status:', error);
    res.status(500).json({ error: 'Ошибка установки статуса \"Не подходит\"' });
  } finally {
    client.release();
  }
});

// DELETE /api/projects/:id - Удалить проект
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    
    await pool.query('DELETE FROM projects WHERE id = $1', [id]);
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: 'Ошибка удаления проекта' });
  }
});

export default router;

