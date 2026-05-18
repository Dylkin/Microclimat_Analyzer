import React, { useEffect, useMemo, useState } from 'react';
import { User, UserRole } from '../types/User';
import { useAuth } from '../contexts/AuthContext';
import { staffDirectoryService } from '../utils/staffDirectoryService';
import type { SalaryHistoryEntry, StaffDirectoryData } from '../types/StaffDirectory';
import {
  loadTaxSettingsFromLocalStorage,
  TAX_SETTINGS_CHANGED_EVENT,
  type TaxSettings
} from '../constants/taxSettings';
import {
  applyPayrollBurdenMultiplier,
  computeFinancePlanRowVsego,
  computeMonthlyPayrollSalarySums
} from '../utils/financePayrollPlan';

const RU_PLAN_MONTHS = [
  'Январь',
  'Февраль',
  'Март',
  'Апрель',
  'Май',
  'Июнь',
  'Июль',
  'Август',
  'Сентябрь',
  'Октябрь',
  'Ноябрь',
  'Декабрь'
] as const;

const roleLabels: Record<UserRole, string> = {
  admin: 'Администратор',
  administrator: 'Администратор',
  specialist: 'Специалист',
  manager: 'Руководитель',
  director: 'Менеджер'
};

export const PersonalProfilePage: React.FC = () => {
  const { user, users, changePassword, reloadUsers } = useAuth();
  const [directoryData, setDirectoryData] = useState<StaffDirectoryData | null>(null);
  const [salaryHistory, setSalaryHistory] = useState<SalaryHistoryEntry[]>([]);
  const [taxSettings, setTaxSettings] = useState<TaxSettings>(() => loadTaxSettingsFromLocalStorage());
  const [loadError, setLoadError] = useState<string | null>(null);

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwdSubmitting, setPwdSubmitting] = useState(false);
  const [pwdMessage, setPwdMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  useEffect(() => {
    void reloadUsers();
    // один раз при открытии страницы — актуальные staff-поля из API
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [directory, historyResponse] = await Promise.all([
          staffDirectoryService.getDirectory(),
          staffDirectoryService.getSalaryHistory({ limit: 500 })
        ]);
        if (cancelled) return;
        setDirectoryData(directory);
        setSalaryHistory(historyResponse.items ?? []);
        setLoadError(null);
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : 'Не удалось загрузить данные');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const refreshTaxSettings = () => {
      setTaxSettings(loadTaxSettingsFromLocalStorage());
    };
    window.addEventListener(TAX_SETTINGS_CHANGED_EVENT, refreshTaxSettings);
    window.addEventListener('storage', refreshTaxSettings);
    return () => {
      window.removeEventListener(TAX_SETTINGS_CHANGED_EVENT, refreshTaxSettings);
      window.removeEventListener('storage', refreshTaxSettings);
    };
  }, []);

  const cardUser: User | undefined = useMemo(
    () => users.find((u) => u.id === user?.id),
    [users, user?.id]
  );

  const currentMonthIndex = new Date().getMonth();

  const planVsegoCurrentMonth = useMemo(() => {
    if (!directoryData) return null;
    const sums = computeMonthlyPayrollSalarySums(directoryData, salaryHistory);
    const monthlyPayrollPlan = applyPayrollBurdenMultiplier(sums, taxSettings);
    const formattedMonthlyPayrollPlan = monthlyPayrollPlan.map((value) =>
      Number.isFinite(value) ? value.toFixed(2) : '0.00'
    );
    const yearlyPayrollTotal = formattedMonthlyPayrollPlan
      .reduce((sum, value) => sum + Number(value), 0)
      .toFixed(2);
    const rowIndex = currentMonthIndex * 2;
    return computeFinancePlanRowVsego({
      rowIndexInTable: rowIndex,
      rowMonth: RU_PLAN_MONTHS[currentMonthIndex],
      rowType: 'План',
      columnValues: {},
      formattedMonthlyPayrollPlan,
      yearlyPayrollTotal
    });
  }, [directoryData, salaryHistory, taxSettings, currentMonthIndex]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdMessage(null);
    if (!user) return;
    if (newPassword.length < 6) {
      setPwdMessage({ type: 'err', text: 'Новый пароль должен быть не короче 6 символов' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdMessage({ type: 'err', text: 'Новый пароль и подтверждение не совпадают' });
      return;
    }
    setPwdSubmitting(true);
    try {
      const ok = await changePassword(user.id, oldPassword, newPassword);
      if (ok) {
        setOldPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setPwdMessage({ type: 'ok', text: 'Пароль успешно изменён' });
      } else {
        setPwdMessage({ type: 'err', text: 'Неверный текущий пароль' });
      }
    } catch {
      setPwdMessage({ type: 'err', text: 'Не удалось сменить пароль' });
    } finally {
      setPwdSubmitting(false);
    }
  };

  if (!user) {
    return null;
  }

  const displayName = cardUser?.fullName ?? user.fullName;
  const displayEmail = cardUser?.email ?? user.email;
  const displayRole = roleLabels[cardUser?.role ?? user.role] ?? (cardUser?.role ?? user.role);
  const displayDept = cardUser?.staffDepartmentName?.trim() || '—';
  const displayPosition = cardUser?.staffPositionName?.trim() || cardUser?.position?.trim() || '—';

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Личный кабинет</h1>
        <p className="mt-1 text-sm text-gray-500">Данные учётной записи и настройки безопасности.</p>
      </div>

      {loadError ? (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">{loadError}</p>
      ) : null}

      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Профиль</h2>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Пользователь</dt>
            <dd className="mt-1 text-sm font-medium text-gray-900">{displayName}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Email</dt>
            <dd className="mt-1 text-sm text-gray-900">{displayEmail}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Роль</dt>
            <dd className="mt-1 text-sm text-gray-900">{displayRole}</dd>
          </div>
          <div>
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Отдел</dt>
            <dd className="mt-1 text-sm text-gray-900">{displayDept}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs font-medium uppercase tracking-wide text-gray-500">Должность</dt>
            <dd className="mt-1 text-sm text-gray-900">{displayPosition}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">План</h2>
        <div className="mt-4">
          <label className="text-xs font-medium uppercase tracking-wide text-gray-500">Всего</label>
          <div className="mt-1 rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium text-gray-900">
            {planVsegoCurrentMonth ?? '…'}
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Смена пароля</h2>
        <form className="mt-4 space-y-4" onSubmit={handlePasswordSubmit}>
          <div>
            <label htmlFor="profile-old-password" className="block text-sm font-medium text-gray-700">
              Текущий пароль
            </label>
            <input
              id="profile-old-password"
              type="password"
              autoComplete="current-password"
              value={oldPassword}
              onChange={(ev) => setOldPassword(ev.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              required
            />
          </div>
          <div>
            <label htmlFor="profile-new-password" className="block text-sm font-medium text-gray-700">
              Новый пароль
            </label>
            <input
              id="profile-new-password"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(ev) => setNewPassword(ev.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              required
              minLength={6}
            />
          </div>
          <div>
            <label htmlFor="profile-confirm-password" className="block text-sm font-medium text-gray-700">
              Подтверждение нового пароля
            </label>
            <input
              id="profile-confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(ev) => setConfirmPassword(ev.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              required
              minLength={6}
            />
          </div>
          {pwdMessage ? (
            <p
              className={`text-sm ${pwdMessage.type === 'ok' ? 'text-green-700' : 'text-red-700'}`}
              role="status"
            >
              {pwdMessage.text}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={pwdSubmitting}
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pwdSubmitting ? 'Сохранение…' : 'Сменить пароль'}
          </button>
        </form>
      </section>
    </div>
  );
};
