import express from 'express';
import { pool } from '../config/database.js';

type Operator = 'eq' | 'in' | 'gte' | 'lte';

interface Filter {
  column: string;
  operator: Operator;
  value: any;
}

interface QueryPayload {
  table: string;
  action: 'select' | 'insert' | 'update' | 'delete';
  data?: any;
  select?: string;
  filters?: Filter[];
  order?: { column: string; ascending?: boolean };
  range?: { from: number; to: number };
  single?: boolean;
  returningColumns?: string;
}

const router = express.Router();

const allowedTables = new Set<string>([
  'analysis_reports',
  'audit_logs',
  'document_approvals',
  'document_comments',
  'documentation_checks',
  'logger_data_records',
  'logger_data_summary',
  'project_documents',
  'qualification_object_testing_periods',
  'qualification_objects',
  'qualification_protocols',
  'qualification_protocols_with_documents',
  'qualification_work_schedule',
  'testing_period_documents',
  'uploaded_files',
  'users',
]);

const columnCache = new Map<string, Set<string>>();
const identifierRegex = /^[a-zA-Z0-9_]+$/;

const quoteIdentifier = (identifier: string) => {
  if (!identifierRegex.test(identifier)) {
    throw new Error(`Недопустимое имя столбца: ${identifier}`);
  }
  return `"${identifier}"`;
};

const ensureTableAllowed = (table: string) => {
  if (!allowedTables.has(table)) {
    throw new Error(`Таблица ${table} недоступна для операций`);
  }
};

const getColumnsForTable = async (table: string): Promise<Set<string>> => {
  if (columnCache.has(table)) {
    return columnCache.get(table)!;
  }

  const { rows } = await pool.query(
    `SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = $1`,
    [table]
  );

  const columns = new Set(rows.map((row) => row.column_name));
  columnCache.set(table, columns);
  return columns;
};

const buildColumnList = (columns: string | undefined, tableColumns: Set<string>) => {
  if (!columns || columns.trim() === '' || columns.trim() === '*') {
    return '*';
  }

  const parts = columns
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return '*';
  }

  parts.forEach((col) => {
    if (!tableColumns.has(col)) {
      throw new Error(`Колонка ${col} отсутствует в таблице`);
    }
  });

  return parts.map((col) => quoteIdentifier(col)).join(', ');
};

const buildWhereClause = (
  filters: Filter[] | undefined,
  params: any[],
  tableColumns: Set<string>
) => {
  if (!filters || filters.length === 0) {
    return '';
  }

  const clauses: string[] = [];

  filters.forEach((filter) => {
    if (!tableColumns.has(filter.column)) {
      throw new Error(`Колонка ${filter.column} отсутствует в таблице`);
    }

    const column = quoteIdentifier(filter.column);

    switch (filter.operator) {
      case 'eq':
        clauses.push(`${column} = $${params.length + 1}`);
        params.push(filter.value);
        break;
      case 'gte':
        clauses.push(`${column} >= $${params.length + 1}`);
        params.push(filter.value);
        break;
      case 'lte':
        clauses.push(`${column} <= $${params.length + 1}`);
        params.push(filter.value);
        break;
      case 'in':
        if (!Array.isArray(filter.value)) {
          throw new Error(`Оператор IN требует массив значений`);
        }
        if (filter.value.length === 0) {
          clauses.push('FALSE');
        } else {
          clauses.push(`${column} = ANY($${params.length + 1})`);
          params.push(filter.value);
        }
        break;
      default:
        throw new Error(`Неподдерживаемый оператор: ${filter.operator}`);
    }
  });

  return clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
};

router.post('/', async (req, res) => {
  try {
    const payload: QueryPayload = req.body;
    const { table, action } = payload;

    if (!table || !action) {
      return res.status(400).json({ data: null, error: 'Не указаны таблица или действие' });
    }

    ensureTableAllowed(table);
    const tableColumns = await getColumnsForTable(table);

    const params: any[] = [];
    let query = '';
    let returningClause = '';

    if (payload.returningColumns) {
      returningClause = ` RETURNING ${buildColumnList(payload.returningColumns, tableColumns)}`;
    }

    switch (action) {
      case 'select': {
        const columns = buildColumnList(payload.select, tableColumns);
        query = `SELECT ${columns} FROM ${table}`;
        query += ` ${buildWhereClause(payload.filters, params, tableColumns)}`;

        if (payload.order) {
          const { column, ascending = true } = payload.order;
          if (!tableColumns.has(column)) {
            throw new Error(`Колонка ${column} отсутствует в таблице`);
          }
          query += ` ORDER BY ${quoteIdentifier(column)} ${ascending ? 'ASC' : 'DESC'}`;
        }

        if (payload.range) {
          const { from, to } = payload.range;
          const limit = to - from + 1;
          const offset = from;
          if (limit > 0) {
            query += ` LIMIT ${limit}`;
          }
          if (offset > 0) {
            query += ` OFFSET ${offset}`;
          }
        }
        break;
      }
      case 'insert': {
        if (!payload.data) {
          throw new Error('Нет данных для вставки');
        }

        const rows = Array.isArray(payload.data) ? payload.data : [payload.data];
        if (rows.length === 0) {
          throw new Error('Пустой набор данных для вставки');
        }

        const allColumns = Array.from(
          rows.reduce((set, row) => {
            Object.keys(row).forEach((key) => set.add(key));
            return set;
          }, new Set<string>())
        );

        allColumns.forEach((col) => {
          if (!tableColumns.has(col)) {
            throw new Error(`Колонка ${col} отсутствует в таблице`);
          }
        });

        const columnList = allColumns.map((col) => quoteIdentifier(col)).join(', ');
        const valuePlaceholders = rows
          .map((row) => {
            const placeholders = allColumns.map((col) => {
              params.push(row[col] ?? null);
              return `$${params.length}`;
            });
            return `(${placeholders.join(', ')})`;
          })
          .join(', ');

        query = `INSERT INTO ${table} (${columnList}) VALUES ${valuePlaceholders}`;
        if (returningClause) {
          query += returningClause;
        }
        break;
      }
      case 'update': {
        if (!payload.data) {
          throw new Error('Нет данных для обновления');
        }
        if (!payload.filters || payload.filters.length === 0) {
          throw new Error('Обновление без фильтра запрещено');
        }

        const updates: string[] = [];
        Object.entries(payload.data).forEach(([key, value]) => {
          if (!tableColumns.has(key)) {
            throw new Error(`Колонка ${key} отсутствует в таблице`);
          }
          params.push(value);
          updates.push(`${quoteIdentifier(key)} = $${params.length}`);
        });

        if (updates.length === 0) {
          throw new Error('Нет валидных данных для обновления');
        }

        query = `UPDATE ${table} SET ${updates.join(', ')}`;
        query += ` ${buildWhereClause(payload.filters, params, tableColumns)}`;
        if (returningClause) {
          query += returningClause;
        }
        break;
      }
      case 'delete': {
        if (!payload.filters || payload.filters.length === 0) {
          throw new Error('Удаление без фильтра запрещено');
        }

        query = `DELETE FROM ${table}`;
        query += ` ${buildWhereClause(payload.filters, params, tableColumns)}`;
        if (returningClause) {
          query += returningClause;
        }
        break;
      }
      default:
        throw new Error(`Неподдерживаемое действие: ${action}`);
    }

    const result = await pool.query(query, params);
    let data: any = result.rows;

    if (payload.single) {
      data = Array.isArray(result.rows) ? result.rows[0] ?? null : result.rows;
    }

    res.json({ data, error: null });
  } catch (error: any) {
    console.error('DB Proxy error:', error);
    res.status(400).json({
      data: null,
      error: error.message || 'Ошибка выполнения запроса',
    });
  }
});

export default router;

