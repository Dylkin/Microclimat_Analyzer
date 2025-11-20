import React, { useState } from 'react';
import { Users, Plus, Edit2, Trash2, Save, X, Eye, EyeOff, Key } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { User, UserRole } from '../types/User';

const UserDirectory: React.FC = () => {
  const { users, addUser, updateUser, deleteUser, resetPassword, user: currentUser } = useAuth();
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [showPasswords, setShowPasswords] = useState<{ [key: string]: boolean }>({});
  const [resetPasswordUser, setResetPasswordUser] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [operationLoading, setOperationLoading] = useState(false);

  const [newUser, setNewUser] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'specialist' as UserRole,
    position: ''
  });

  const [editUser, setEditUser] = useState({
    fullName: '',
    email: '',
    role: 'specialist' as UserRole,
    position: ''
  });

  const roleLabels: Record<UserRole, string> = {
    admin: 'Администратор',
    administrator: 'Администратор',
    specialist: 'Специалист',
    manager: 'Руководитель',
    director: 'Менеджер'
  };

  const handleAddUser = async () => {
    if (!newUser.fullName || !newUser.email || !newUser.password) {
      alert('Заполните все поля');
      return;
    }

    // Проверяем уникальность email
    if (users.some(u => u.email === newUser.email)) {
      alert('Пользователь с таким email уже существует');
      return;
    }

    setOperationLoading(true);
    try {
      console.log('Начинаем добавление пользователя:', newUser);
      await addUser(newUser);
      console.log('Пользователь успешно добавлен');
      
      // Сбрасываем форму только после успешного добавления
      setNewUser({
        fullName: '',
        email: '',
        password: '',
        role: 'specialist',
        position: ''
      });
      setShowAddForm(false);
      alert('Пользователь успешно добавлен');
    } catch (error) {
      console.error('Ошибка в handleAddUser:', error);
      const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка';
      alert(`Ошибка добавления пользователя: ${errorMessage}`);
      setOperationLoading(false);
      return;
    }
    setOperationLoading(false);
  };

  const handleEditUser = (user: User) => {
    setEditUser({
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      position: user.position || ''
    });
    setEditingUser(user.id);
  };

  const handleSaveEdit = async () => {
    if (!editUser.fullName || !editUser.email) {
      alert('Заполните все поля');
      return;
    }

    // Проверяем уникальность email (исключая текущего пользователя)
    if (users.some(u => u.email === editUser.email && u.id !== editingUser)) {
      alert('Пользователь с таким email уже существует');
      return;
    }

    setOperationLoading(true);
    try {
      await updateUser(editingUser!, editUser);
      alert('Пользователь успешно обновлен');
    } catch (error) {
      alert(`Ошибка обновления пользователя: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
      setOperationLoading(false);
      return;
    }
    setEditingUser(null);
    setOperationLoading(false);
  };

  const handleDeleteUser = async (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (user?.isDefault) {
      alert('Нельзя удалить пользователя по умолчанию');
      return;
    }

    if (userId === currentUser?.id) {
      alert('Нельзя удалить свою учетную запись');
      return;
    }

    if (confirm('Вы уверены, что хотите удалить этого пользователя?')) {
      setOperationLoading(true);
      try {
        await deleteUser(userId);
        alert('Пользователь успешно удален');
      } catch (error) {
        alert(`Ошибка удаления пользователя: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
      }
      setOperationLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) {
      alert('Пароль должен содержать минимум 6 символов');
      return;
    }

    setOperationLoading(true);
    try {
      const success = await resetPassword(resetPasswordUser!, newPassword);
      if (success) {
        alert('Пароль успешно изменен');
        setResetPasswordUser(null);
        setNewPassword('');
      } else {
        alert('Ошибка изменения пароля');
      }
    } catch (error) {
      alert(`Ошибка изменения пароля: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`);
    }
    setOperationLoading(false);
  };

  const togglePasswordVisibility = (userId: string) => {
    setShowPasswords(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewUser(prev => ({ ...prev, password }));
  };

  return (
    <div className="space-y-6">
      {/* Индикатор загрузки и ошибки удалены, так как их нет в AuthContextType */}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Users className="w-8 h-8 text-indigo-600" />
          <h1 className="text-2xl font-bold text-gray-900">Справочник пользователей</h1>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2"
        >
          <Plus className="w-4 h-4" />
          <span>Добавить пользователя</span>
        </button>
      </div>

      {/* Add User Form */}
      {showAddForm && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Добавить пользователя</h2>
            <button
              onClick={() => setShowAddForm(false)}
              className="text-gray-400 hover:text-gray-600"
              title="Закрыть"
              aria-label="Закрыть"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ФИО
              </label>
              <input
                type="text"
                value={newUser.fullName}
                onChange={(e) => setNewUser(prev => ({ ...prev, fullName: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Введите ФИО"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Введите email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Пароль
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={newUser.password}
                  onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Введите пароль"
                />
                <button
                  onClick={generatePassword}
                  className="bg-gray-500 text-white px-3 py-2 rounded-lg hover:bg-gray-600 transition-colors"
                  title="Сгенерировать пароль"
                >
                  <Key className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Роль
              </label>
              <select
                value={newUser.role}
                onChange={(e) => setNewUser(prev => ({ ...prev, role: e.target.value as UserRole }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                title="Роль пользователя"
                aria-label="Роль пользователя"
              >
                <option value="specialist">Специалист</option>
                <option value="manager">Руководитель</option>
                <option value="director">Менеджер</option>
                <option value="admin">Администратор</option>
                <option value="administrator">Администратор</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Должность
              </label>
              <input
                type="text"
                value={newUser.position}
                onChange={(e) => setNewUser(prev => ({ ...prev, position: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Введите должность"
                title="Должность пользователя"
                aria-label="Должность пользователя"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Отмена
            </button>
            <button
              onClick={handleAddUser}
              disabled={operationLoading}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {operationLoading ? 'Добавление...' : 'Добавить'}
            </button>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Пользователь
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Роль
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Должность
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Пароль
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingUser === user.id ? (
                      <input
                        type="text"
                        value={editUser.fullName}
                        onChange={(e) => setEditUser(prev => ({ ...prev, fullName: e.target.value }))}
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        title="Полное имя пользователя"
                        aria-label="Полное имя пользователя"
                      />
                    ) : (
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {user.fullName}
                          {user.isDefault && (
                            <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              По умолчанию
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingUser === user.id ? (
                      <input
                        type="email"
                        value={editUser.email}
                        onChange={(e) => setEditUser(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        title="Email пользователя"
                        aria-label="Email пользователя"
                      />
                    ) : (
                      <div className="text-sm text-gray-500">{user.email}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingUser === user.id ? (
                      <select
                        value={editUser.role}
                        onChange={(e) => setEditUser(prev => ({ ...prev, role: e.target.value as UserRole }))}
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        title="Роль пользователя"
                        aria-label="Роль пользователя"
                      >
                        <option value="specialist">Специалист</option>
                        <option value="manager">Руководитель</option>
                        <option value="director">Менеджер</option>
                        <option value="admin">Администратор</option>
                        <option value="administrator">Администратор</option>
                      </select>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {roleLabels[user.role] || 'Неизвестная роль'}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingUser === user.id ? (
                      <input
                        type="text"
                        value={editUser.position}
                        onChange={(e) => setEditUser(prev => ({ ...prev, position: e.target.value }))}
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="Введите должность"
                        title="Должность пользователя"
                        aria-label="Должность пользователя"
                      />
                    ) : (
                      <div className="text-sm text-gray-500">{user.position || 'Не указана'}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-500 font-mono">
                        {showPasswords[user.id] ? user.password : '••••••••'}
                      </span>
                      <button
                        onClick={() => togglePasswordVisibility(user.id)}
                        className="text-gray-400 hover:text-gray-600"
                        title={showPasswords[user.id] ? 'Скрыть пароль' : 'Показать пароль'}
                      >
                        {showPasswords[user.id] ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                      {currentUser?.role === 'administrator' && (
                        <button
                          onClick={() => setResetPasswordUser(user.id)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Сбросить пароль"
                        >
                          <Key className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {editingUser === user.id ? (
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={handleSaveEdit}
                        disabled={operationLoading}
                          className="text-green-600 hover:text-green-900"
                          title="Сохранить"
                        >
                          <Save className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingUser(null)}
                          className="text-gray-600 hover:text-gray-900"
                          title="Отмена"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleEditUser(user)}
                        disabled={operationLoading}
                          className="text-indigo-600 hover:text-indigo-900"
                          title="Редактировать"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {!user.isDefault && user.id !== currentUser?.id && (
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                          disabled={operationLoading}
                            className="text-red-600 hover:text-red-900"
                            title="Удалить"
                          >
                            <Trash2 className="w-4 h-4" />
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
      </div>

      {/* Reset Password Modal */}
      {resetPasswordUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Сброс пароля
            </h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Новый пароль
              </label>
              <input
                type="text"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Введите новый пароль"
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setResetPasswordUser(null);
                  setNewPassword('');
                }}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleResetPassword}
                disabled={operationLoading}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                {operationLoading ? 'Сброс...' : 'Сбросить пароль'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Statistics */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Статистика</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-indigo-600">{users.length}</div>
            <div className="text-sm text-gray-500">Всего пользователей</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {users.filter(u => u.role === 'administrator' || u.role === 'admin').length}
            </div>
            <div className="text-sm text-gray-500">Администраторов</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">
              {users.filter(u => u.role === 'specialist').length}
            </div>
            <div className="text-sm text-gray-500">Специалистов</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {users.filter(u => u.role === 'manager' || u.role === 'director').length}
            </div>
            <div className="text-sm text-gray-500">Руководителей</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserDirectory;