import React, { useEffect, useState } from 'react';
import { Save, RefreshCw } from 'lucide-react';
import { apiClient } from '../utils/apiClient';

interface MailSettingsDto {
  companyName: string;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  password: string;
  from: string;
  imapHost: string;
  imapPort: number;
  imapSecure: boolean;
  imapUser: string;
  imapPassword: string;
}

export const MailSettingsPage: React.FC = () => {
  const [settings, setSettings] = useState<MailSettingsDto>({
    companyName: '',
    host: '',
    port: 587,
    secure: false,
    user: '',
    password: '',
    from: '',
    imapHost: '',
    imapPort: 993,
    imapSecure: true,
    imapUser: '',
    imapPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadSettings = async () => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const data = await apiClient.get<MailSettingsDto>('/mail/settings');
      if (data) {
        setSettings({
          companyName: data.companyName || '',
          host: data.host || '',
          port: data.port || 587,
          secure: !!data.secure,
          user: data.user || '',
          password: data.password || '',
          from: data.from || '',
          imapHost: data.imapHost || '',
          imapPort: data.imapPort || 993,
          imapSecure: !!data.imapSecure,
          imapUser: data.imapUser || '',
          imapPassword: data.imapPassword || '',
        });
      }
    } catch (e: any) {
      console.error('Ошибка загрузки настроек почты:', e);
      setError(e?.message || 'Ошибка загрузки настроек почты');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await apiClient.post('/mail/settings', settings);
      setSuccess('Настройки почты успешно сохранены.');
    } catch (e: any) {
      console.error('Ошибка сохранения настроек почты:', e);
      setError(e?.message || 'Ошибка сохранения настроек почты');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Настройки почты</h1>
          <p className="text-sm text-gray-500 mt-1">
            Конфигурация SMTP (отправка) и IMAP (получение) для коммерческих предложений.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadSettings}
            disabled={loading}
            className="inline-flex items-center px-3 py-2 text-sm rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-50"
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            Обновить
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center px-4 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4 mr-1" />
            Сохранить
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-800 text-sm px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        {/* SMTP */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            MAIL_COMPANY_NAME
          </label>
          <input
            type="text"
            value={settings.companyName}
            onChange={(e) => setSettings((s) => ({ ...s, companyName: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            placeholder="ОДО «Комсистем»"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              MAIL_HOST
            </label>
            <input
              type="text"
              value={settings.host}
              onChange={(e) => setSettings((s) => ({ ...s, host: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              placeholder="smtp.ваш_провайдер.by"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              MAIL_PORT
            </label>
            <input
              type="number"
              value={settings.port}
              onChange={(e) => setSettings((s) => ({ ...s, port: Number(e.target.value) || 0 }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              placeholder="587"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <input
            id="mail-secure"
            type="checkbox"
            checked={settings.secure}
            onChange={(e) => setSettings((s) => ({ ...s, secure: e.target.checked }))}
            className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
          />
          <label htmlFor="mail-secure" className="text-sm text-gray-700">
            MAIL_SECURE (использовать защищённое соединение, обычно для порта 465)
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              MAIL_USER
            </label>
            <input
              type="text"
              value={settings.user}
              onChange={(e) => setSettings((s) => ({ ...s, user: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              placeholder="ваш_логин"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              MAIL_PASSWORD
            </label>
            <input
              type="password"
              value={settings.password}
              onChange={(e) => setSettings((s) => ({ ...s, password: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              placeholder="ваш_пароль"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            MAIL_FROM
          </label>
          <input
            type="email"
            value={settings.from}
            onChange={(e) => setSettings((s) => ({ ...s, from: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            placeholder="почта_отправителя@домен"
          />
        </div>

        {/* IMAP */}
        <div className="mt-6 border-t border-gray-200 pt-4">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">IMAP (получение почты)</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                MAIL_IMAP_HOST
              </label>
              <input
                type="text"
                value={settings.imapHost}
                onChange={(e) => setSettings((s) => ({ ...s, imapHost: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                placeholder="imap.ваш_провайдер.by"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                MAIL_IMAP_PORT
              </label>
              <input
                type="number"
                value={settings.imapPort}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, imapPort: Number(e.target.value) || 0 }))
                }
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                placeholder="993"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 mt-2">
            <input
              id="mail-imap-secure"
              type="checkbox"
              checked={settings.imapSecure}
              onChange={(e) => setSettings((s) => ({ ...s, imapSecure: e.target.checked }))}
              className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
            />
            <label htmlFor="mail-imap-secure" className="text-sm text-gray-700">
              MAIL_IMAP_SECURE (обычно true для порта 993)
            </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                MAIL_IMAP_USER
              </label>
              <input
                type="text"
                value={settings.imapUser}
                onChange={(e) => setSettings((s) => ({ ...s, imapUser: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                placeholder="логин IMAP (если отличается от SMTP)"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                MAIL_IMAP_PASSWORD
              </label>
              <input
                type="password"
                value={settings.imapPassword}
                onChange={(e) => setSettings((s) => ({ ...s, imapPassword: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                placeholder="пароль IMAP (если отличается от SMTP)"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};



