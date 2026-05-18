import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Building2,
  Briefcase,
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  RefreshCw,
  History,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { staffDirectoryService } from '../utils/staffDirectoryService';
import type { Department, SalaryHistoryEntry } from '../types/StaffDirectory';
import {
  loadTaxSettingsFromLocalStorage,
  payrollFundBurdenMultiplier,
  TAX_SETTINGS_CHANGED_EVENT,
  type TaxSettings
} from '../constants/taxSettings';
import { getFirstDayOfNextMonthDateString } from '../utils/salaryEffectiveFrom';

const formatRub = (value: number) =>
  `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 2 }).format(value)} руб.`;

const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' });

const formatDateRu = (yyyyMmDd: string) => {
  if (!yyyyMmDd || !/^\d{4}-\d{2}-\d{2}$/.test(yyyyMmDd)) return '—';
  const [y, m, d] = yyyyMmDd.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('ru-RU');
};

interface DepartmentDraft {
  name: string;
}

interface PositionDraft {
  name: string;
  salary: string;
  effectiveFrom: string;
}

const createEmptyPositionDraft = (): PositionDraft => ({
  name: '',
  salary: '',
  effectiveFrom: getFirstDayOfNextMonthDateString()
});

const StaffDirectory: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [taxSettings, setTaxSettings] = useState<TaxSettings>(() => loadTaxSettingsFromLocalStorage());
  const [loading, setLoading] = useState(true);
  const [operationLoading, setOperationLoading] = useState(false);

  const [newDepartment, setNewDepartment] = useState<DepartmentDraft>({ name: '' });
  const [editingDepartmentId, setEditingDepartmentId] = useState<string | null>(null);
  const [editingDepartmentDraft, setEditingDepartmentDraft] = useState<DepartmentDraft>({ name: '' });

  const [positionDraftByDepartment, setPositionDraftByDepartment] = useState<Record<string, PositionDraft>>({});
  const [editingPositionId, setEditingPositionId] = useState<string | null>(null);
  const [editingPositionDraft, setEditingPositionDraft] = useState<PositionDraft>(() => createEmptyPositionDraft());
  const [salaryHistory, setSalaryHistory] = useState<SalaryHistoryEntry[]>([]);
  const [historyExpanded, setHistoryExpanded] = useState(true);
  const [historyFilterPositionId, setHistoryFilterPositionId] = useState('');
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyLoadError, setHistoryLoadError] = useState<string | null>(null);
  const historySectionRef = useRef<HTMLDivElement>(null);

  const fetchSalaryHistory = useCallback(async (positionId?: string) => {
    setHistoryLoading(true);
    setHistoryLoadError(null);
    try {
      const { items } = await staffDirectoryService.getSalaryHistory({ limit: 200, positionId });
      setSalaryHistory(items);
    } catch (e) {
      setHistoryLoadError(e instanceof Error ? e.message : 'Не удалось загрузить историю окладов');
      setSalaryHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadDirectory();
  }, []);

  useEffect(() => {
    const syncTax = () => setTaxSettings(loadTaxSettingsFromLocalStorage());
    window.addEventListener('storage', syncTax);
    window.addEventListener(TAX_SETTINGS_CHANGED_EVENT, syncTax);
    return () => {
      window.removeEventListener('storage', syncTax);
      window.removeEventListener(TAX_SETTINGS_CHANGED_EVENT, syncTax);
    };
  }, []);

  const loadDirectory = async () => {
    setLoading(true);
    try {
      const data = await staffDirectoryService.getDirectory();
      setDepartments(data.departments);
      await fetchSalaryHistory(historyFilterPositionId || undefined);
    } catch (error) {
      alert(`Ошибка загрузки структуры предприятия: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    } finally {
      setLoading(false);
    }
  };

  const payrollMultiplier = useMemo(() => payrollFundBurdenMultiplier(taxSettings), [taxSettings]);

  const payroll = useMemo(() => {
    const byDepartment = departments.map((department) => {
      const base = department.positions.reduce((acc, position) => acc + Number(position.salary), 0);
      return {
        departmentId: department.id,
        departmentName: department.name,
        total: base * payrollMultiplier
      };
    });
    const total = byDepartment.reduce((acc, item) => acc + item.total, 0);
    return { total, byDepartment };
  }, [departments, payrollMultiplier]);

  const handleAddDepartment = async () => {
    const name = newDepartment.name.trim();
    if (!name) {
      alert('Введите название отдела');
      return;
    }
    setOperationLoading(true);
    try {
      await staffDirectoryService.addDepartment({ name });
      setNewDepartment({ name: '' });
      await loadDirectory();
    } catch (error) {
      alert(`Ошибка добавления отдела: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    } finally {
      setOperationLoading(false);
    }
  };

  const startEditDepartment = (department: Department) => {
    setEditingDepartmentId(department.id);
    setEditingDepartmentDraft({ name: department.name });
  };

  const handleSaveDepartment = async (departmentId: string) => {
    const name = editingDepartmentDraft.name.trim();
    if (!name) {
      alert('Введите название отдела');
      return;
    }
    setOperationLoading(true);
    try {
      await staffDirectoryService.updateDepartment(departmentId, { name });
      setEditingDepartmentId(null);
      await loadDirectory();
    } catch (error) {
      alert(`Ошибка обновления отдела: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    } finally {
      setOperationLoading(false);
    }
  };

  const handleDeleteDepartment = async (departmentId: string) => {
    if (!confirm('Удалить отдел и все его должности?')) return;
    setOperationLoading(true);
    try {
      await staffDirectoryService.deleteDepartment(departmentId);
      await loadDirectory();
    } catch (error) {
      alert(`Ошибка удаления отдела: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    } finally {
      setOperationLoading(false);
    }
  };

  const handleAddPosition = async (departmentId: string) => {
    const draft = positionDraftByDepartment[departmentId] ?? createEmptyPositionDraft();
    const name = draft.name.trim();
    const salary = Number(draft.salary);
    const salaryEffectiveFrom = draft.effectiveFrom.trim();
    if (!name) {
      alert('Введите название должности');
      return;
    }
    if (!Number.isFinite(salary) || salary < 0) {
      alert('Введите корректный оклад');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(salaryEffectiveFrom)) {
      alert('Укажите дату «Действует с»');
      return;
    }
    setOperationLoading(true);
    try {
      await staffDirectoryService.addPosition(departmentId, { name, salary, salaryEffectiveFrom });
      setPositionDraftByDepartment((prev) => ({ ...prev, [departmentId]: createEmptyPositionDraft() }));
      await loadDirectory();
    } catch (error) {
      alert(`Ошибка добавления должности: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    } finally {
      setOperationLoading(false);
    }
  };

  const startEditPosition = (position: {
    id: string;
    name: string;
    salary: number;
    salaryEffectiveFrom: string;
  }) => {
    setEditingPositionId(position.id);
    setEditingPositionDraft({
      name: position.name,
      salary: String(position.salary),
      effectiveFrom: position.salaryEffectiveFrom || getFirstDayOfNextMonthDateString()
    });
  };

  const handleSavePosition = async (positionId: string) => {
    const name = editingPositionDraft.name.trim();
    const salary = Number(editingPositionDraft.salary);
    const salaryEffectiveFrom = editingPositionDraft.effectiveFrom.trim();
    if (!name) {
      alert('Введите название должности');
      return;
    }
    if (!Number.isFinite(salary) || salary < 0) {
      alert('Введите корректный оклад');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(salaryEffectiveFrom)) {
      alert('Укажите дату «Действует с»');
      return;
    }
    setOperationLoading(true);
    try {
      await staffDirectoryService.updatePosition(positionId, { name, salary, salaryEffectiveFrom });
      setEditingPositionId(null);
      setEditingPositionDraft(createEmptyPositionDraft());
      await loadDirectory();
    } catch (error) {
      alert(`Ошибка обновления должности: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    } finally {
      setOperationLoading(false);
    }
  };

  const handleDeletePosition = async (positionId: string) => {
    if (!confirm('Удалить должность?')) return;
    setOperationLoading(true);
    try {
      await staffDirectoryService.deletePosition(positionId);
      await loadDirectory();
    } catch (error) {
      alert(`Ошибка удаления должности: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    } finally {
      setOperationLoading(false);
    }
  };

  const scrollToSalaryHistory = () => {
    setHistoryExpanded(true);
    requestAnimationFrame(() => {
      historySectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const openPositionSalaryHistory = (positionId: string) => {
    setHistoryFilterPositionId(positionId);
    setHistoryExpanded(true);
    void fetchSalaryHistory(positionId);
    requestAnimationFrame(() => {
      historySectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  if (loading) {
    return <div className="text-gray-600">Загрузка структуры предприятия...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Building2 className="w-8 h-8 text-indigo-600" />
          <h1 className="text-2xl font-bold text-gray-900">Структура предприятия</h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <button
            type="button"
            onClick={scrollToSalaryHistory}
            className="bg-indigo-50 text-indigo-800 border border-indigo-200 px-4 py-2 rounded-lg hover:bg-indigo-100 transition-colors flex items-center gap-2 text-sm"
          >
            <History className="w-4 h-4 shrink-0" />
            История окладов
          </button>
          <button
            type="button"
            onClick={loadDirectory}
            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2 text-sm"
          >
            <RefreshCw className="w-4 h-4 shrink-0" />
            Обновить
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Добавить отдел</h2>
        <div className="flex flex-col md:flex-row gap-3">
          <input
            type="text"
            value={newDepartment.name}
            onChange={(e) => setNewDepartment({ name: e.target.value })}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Например: Отдел логистики"
          />
          <button
            onClick={handleAddDepartment}
            disabled={operationLoading}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-gray-400"
          >
            Добавить отдел
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Фонд оплаты труда (ФОТ)</h2>
        <p className="text-sm text-gray-600 mb-3">
          Расчёт по формуле суммы окладов с коэффициентом нагрузки: оклад × (1 + подоходный + белгосстрах + ФСЗН
          работодателя + % на отпускные + НДС + рентабельность) / 100. Ставки берутся со страницы «Налоги» (текущий
          коэффициент {new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 4 }).format(payrollMultiplier)}).
        </p>
        <div className="text-xl font-semibold text-indigo-700 mb-4">Общий ФОТ предприятия: {formatRub(payroll.total)}</div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {payroll.byDepartment.map((item) => (
            <div key={item.departmentId} className="border border-gray-200 rounded-lg p-3">
              <div className="text-sm text-gray-500">{item.departmentName}</div>
              <div className="font-semibold text-gray-900">ФОТ: {formatRub(item.total)}</div>
            </div>
          ))}
        </div>
      </div>

      <div
        id="staff-salary-history"
        ref={historySectionRef}
        className="bg-white rounded-lg shadow p-6 scroll-mt-4"
      >
        <button
          type="button"
          onClick={() => setHistoryExpanded((v) => !v)}
          className="flex items-center gap-2 w-full text-left mb-2 group"
        >
          {historyExpanded ? (
            <ChevronDown className="w-5 h-5 text-gray-500 shrink-0" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-500 shrink-0" />
          )}
          <History className="w-5 h-5 text-indigo-600 shrink-0" />
          <h2 className="text-lg font-semibold text-gray-900">История изменений окладов</h2>
          <span className="text-sm text-gray-500 ml-auto">
            {historyLoading ? 'Загрузка…' : `${salaryHistory.length} запис.`}
          </span>
        </button>
        <p className="text-sm text-gray-600 mb-3 pl-7">
          Просмотр всех правок окладов и записей о новых должностях. Можно отфильтровать по должности или открыть историю
          из строки таблицы кнопкой «История».
        </p>

        {historyExpanded && (
          <>
            <div className="flex flex-wrap gap-3 items-center mb-3 pl-7">
              <label className="text-sm text-gray-700 whitespace-nowrap" htmlFor="salary-history-position-filter">
                Должность
              </label>
              <select
                id="salary-history-position-filter"
                value={historyFilterPositionId}
                onChange={(e) => {
                  const v = e.target.value;
                  setHistoryFilterPositionId(v);
                  void fetchSalaryHistory(v || undefined);
                }}
                className="text-sm border border-gray-300 rounded-lg px-3 py-2 min-w-[12rem] max-w-full bg-white"
              >
                <option value="">Все записи</option>
                {departments.flatMap((d) =>
                  d.positions.map((p) => (
                    <option key={p.id} value={p.id}>
                      {d.name} — {p.name}
                    </option>
                  ))
                )}
              </select>
              <button
                type="button"
                onClick={() => fetchSalaryHistory(historyFilterPositionId || undefined)}
                disabled={historyLoading}
                className="inline-flex items-center gap-2 text-sm px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${historyLoading ? 'animate-spin' : ''}`} />
                Обновить историю
              </button>
              {historyFilterPositionId ? (
                <button
                  type="button"
                  onClick={() => {
                    setHistoryFilterPositionId('');
                    void fetchSalaryHistory(undefined);
                  }}
                  className="text-sm text-indigo-600 hover:text-indigo-800"
                >
                  Сбросить фильтр
                </button>
              ) : null}
            </div>

            {historyLoadError ? (
              <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3 ml-7">
                {historyLoadError}
              </div>
            ) : null}

            {historyLoading && salaryHistory.length === 0 ? (
              <p className="text-sm text-gray-500 pl-7">Загрузка таблицы…</p>
            ) : null}

            {!historyLoading && salaryHistory.length === 0 ? (
              <p className="text-sm text-gray-500 pl-7">
                {historyFilterPositionId
                  ? 'Для выбранной должности записей пока нет.'
                  : 'Пока нет записей. Они появятся при добавлении должности или изменении оклада.'}
              </p>
            ) : null}

            {salaryHistory.length > 0 ? (
              <div
                className={`overflow-x-auto max-h-96 overflow-y-auto border border-gray-200 rounded-lg ml-7 transition-opacity ${historyLoading ? 'opacity-60' : ''}`}
              >
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">Дата</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">Подразделение</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">Должность</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-600">Было</th>
                      <th className="px-3 py-2 text-right font-medium text-gray-600">Стало</th>
                      <th className="px-3 py-2 text-left font-medium text-gray-600">Пользователь</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 bg-white">
                    {salaryHistory.map((row) => (
                      <tr key={row.id}>
                        <td className="px-3 py-2 whitespace-nowrap text-gray-800">{formatDateTime(row.createdAt)}</td>
                        <td className="px-3 py-2 text-gray-800">{row.departmentName}</td>
                        <td className="px-3 py-2 text-gray-800">{row.positionName}</td>
                        <td className="px-3 py-2 text-right text-gray-800">
                          {row.oldSalary == null ? '—' : formatRub(row.oldSalary)}
                        </td>
                        <td className="px-3 py-2 text-right font-medium text-gray-900">{formatRub(row.newSalary)}</td>
                        <td className="px-3 py-2 text-gray-800">
                          {row.changedByName || row.changedByUserId || '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </>
        )}
      </div>

      {departments.map((department) => (
        <div key={department.id} className="bg-white rounded-lg shadow p-6 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1">
              <Briefcase className="w-5 h-5 text-indigo-600" />
              {editingDepartmentId === department.id ? (
                <input
                  type="text"
                  value={editingDepartmentDraft.name}
                  onChange={(e) => setEditingDepartmentDraft({ name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  aria-label="Название отдела"
                />
              ) : (
                <h3 className="text-lg font-semibold text-gray-900">{department.name}</h3>
              )}
              {department.isDefault && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">Базовый отдел</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {editingDepartmentId === department.id ? (
                <>
                  <button onClick={() => handleSaveDepartment(department.id)} title="Сохранить">
                    <Save className="w-4 h-4 text-green-600" />
                  </button>
                  <button onClick={() => setEditingDepartmentId(null)} title="Отмена">
                    <X className="w-4 h-4 text-gray-600" />
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => startEditDepartment(department)} title="Редактировать">
                    <Edit2 className="w-4 h-4 text-indigo-600" />
                  </button>
                  {!department.isDefault && (
                    <button onClick={() => handleDeleteDepartment(department.id)} title="Удалить">
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Должность</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Оклад</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 whitespace-nowrap">Действует с</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {department.positions.map((position) => (
                  <tr key={position.id}>
                    <td className="px-4 py-2">
                      {editingPositionId === position.id ? (
                        <input
                          type="text"
                          value={editingPositionDraft.name}
                          onChange={(e) => setEditingPositionDraft((prev) => ({ ...prev, name: e.target.value }))}
                          className="w-full px-2 py-1 border border-gray-300 rounded"
                          aria-label="Название должности"
                        />
                      ) : (
                        <div className="flex items-center gap-2">
                          <span>{position.name}</span>
                          {position.isDefault && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Базовая</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {editingPositionId === position.id ? (
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={editingPositionDraft.salary}
                          onChange={(e) => setEditingPositionDraft((prev) => ({ ...prev, salary: e.target.value }))}
                          className="w-full px-2 py-1 border border-gray-300 rounded"
                          aria-label="Оклад должности"
                        />
                      ) : (
                        formatRub(position.salary)
                      )}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap">
                      {editingPositionId === position.id ? (
                        <input
                          type="date"
                          value={editingPositionDraft.effectiveFrom}
                          onChange={(e) => setEditingPositionDraft((prev) => ({ ...prev, effectiveFrom: e.target.value }))}
                          className="w-full min-w-[9rem] px-2 py-1 border border-gray-300 rounded"
                          aria-label="Оклад действует с"
                        />
                      ) : (
                        formatDateRu(position.salaryEffectiveFrom)
                      )}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {editingPositionId === position.id ? (
                        <div className="inline-flex gap-2">
                          <button onClick={() => handleSavePosition(position.id)} title="Сохранить">
                            <Save className="w-4 h-4 text-green-600" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingPositionId(null);
                              setEditingPositionDraft(createEmptyPositionDraft());
                            }}
                            title="Отмена"
                          >
                            <X className="w-4 h-4 text-gray-600" />
                          </button>
                        </div>
                      ) : (
                        <div className="inline-flex gap-2 items-center justify-end flex-wrap">
                          <button
                            type="button"
                            onClick={() => openPositionSalaryHistory(position.id)}
                            title="История изменений оклада"
                            className="p-0.5 rounded hover:bg-indigo-50 text-indigo-600"
                          >
                            <History className="w-4 h-4" />
                          </button>
                          <button type="button" onClick={() => startEditPosition(position)} title="Редактировать">
                            <Edit2 className="w-4 h-4 text-indigo-600" />
                          </button>
                          {!position.isDefault && (
                            <button type="button" onClick={() => handleDeletePosition(position.id)} title="Удалить">
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <input
              type="text"
              value={(positionDraftByDepartment[department.id] ?? createEmptyPositionDraft()).name}
              onChange={(e) =>
                setPositionDraftByDepartment((prev) => ({
                  ...prev,
                  [department.id]: { ...(prev[department.id] ?? createEmptyPositionDraft()), name: e.target.value }
                }))
              }
              className="px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="Новая должность"
            />
            <input
              type="number"
              min="0"
              step="0.01"
              value={(positionDraftByDepartment[department.id] ?? createEmptyPositionDraft()).salary}
              onChange={(e) =>
                setPositionDraftByDepartment((prev) => ({
                  ...prev,
                  [department.id]: { ...(prev[department.id] ?? createEmptyPositionDraft()), salary: e.target.value }
                }))
              }
              className="px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="Оклад"
            />
            <input
              type="date"
              title="Оклад действует с (по умолчанию — 1-е число следующего месяца)"
              value={(positionDraftByDepartment[department.id] ?? createEmptyPositionDraft()).effectiveFrom}
              onChange={(e) =>
                setPositionDraftByDepartment((prev) => ({
                  ...prev,
                  [department.id]: { ...(prev[department.id] ?? createEmptyPositionDraft()), effectiveFrom: e.target.value }
                }))
              }
              className="px-3 py-2 border border-gray-300 rounded-lg"
              aria-label="Действует с"
            />
            <button
              onClick={() => handleAddPosition(department.id)}
              disabled={operationLoading}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-gray-400 flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Добавить должность
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

export default StaffDirectory;
