import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Lock, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';

const ResetPassword: React.FC = () => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const { updatePasswordWithToken } = useAuth();

  useEffect(() => {
    // Проверяем, есть ли токен сброса пароля в URL
    const urlParams = new URLSearchParams(window.location.search);
    const accessToken = urlParams.get('access_token');
    const refreshToken = urlParams.get('refresh_token');
    
    if (!accessToken || !refreshToken) {
      setError('Недействительная ссылка для сброса пароля. Пожалуйста, запросите новую ссылку.');
    }
  }, []);

  const validatePassword = (password: string): string[] => {
    const errors: string[] = [];
    
    if (password.length < 8) {
      errors.push('Пароль должен содержать минимум 8 символов');
    }
    
    if (!/[A-Z]/.test(password)) {
      errors.push('Пароль должен содержать хотя бы одну заглавную букву');
    }
    
    if (!/[a-z]/.test(password)) {
      errors.push('Пароль должен содержать хотя бы одну строчную букву');
    }
    
    if (!/\d/.test(password)) {
      errors.push('Пароль должен содержать хотя бы одну цифру');
    }
    
    return errors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Валидация пароля
      const passwordErrors = validatePassword(newPassword);
      if (passwordErrors.length > 0) {
        setError(passwordErrors.join('. '));
        setLoading(false);
        return;
      }

      // Проверка совпадения паролей
      if (newPassword !== confirmPassword) {
        setError('Пароли не совпадают');
        setLoading(false);
        return;
      }

      // Обновление пароля
      await updatePasswordWithToken(newPassword);
      setSuccess(true);
    } catch (error) {
      setError('Ошибка обновления пароля. Возможно, ссылка устарела или недействительна.');
      console.error('Ошибка обновления пароля:', error);
    }
    
    setLoading(false);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl p-8 w-full max-w-md text-center">
          <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Пароль успешно изменен!</h1>
          <p className="text-gray-600 mb-6">
            Ваш пароль был успешно обновлен. Теперь вы можете войти в систему с новым паролем.
          </p>
          <button
            onClick={() => window.location.href = '/'}
            className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors font-medium"
          >
            Перейти к входу
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-indigo-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Установка нового пароля</h1>
          <p className="text-gray-600">Microclimat Analyzer</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Новый пароль
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                placeholder="Введите новый пароль"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Подтвердите пароль
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
                placeholder="Подтвердите новый пароль"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Требования к паролю */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Требования к паролю:</h4>
            <ul className="text-xs text-gray-600 space-y-1">
              <li className={`flex items-center ${newPassword.length >= 8 ? 'text-green-600' : ''}`}>
                <span className="mr-2">•</span>
                Минимум 8 символов
              </li>
              <li className={`flex items-center ${/[A-Z]/.test(newPassword) ? 'text-green-600' : ''}`}>
                <span className="mr-2">•</span>
                Хотя бы одна заглавная буква
              </li>
              <li className={`flex items-center ${/[a-z]/.test(newPassword) ? 'text-green-600' : ''}`}>
                <span className="mr-2">•</span>
                Хотя бы одна строчная буква
              </li>
              <li className={`flex items-center ${/\d/.test(newPassword) ? 'text-green-600' : ''}`}>
                <span className="mr-2">•</span>
                Хотя бы одна цифра
              </li>
            </ul>
          </div>

          {error && (
            <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg">
              <AlertCircle className="w-5 h-5" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Обновление...</span>
              </div>
            ) : (
              'Обновить пароль'
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
