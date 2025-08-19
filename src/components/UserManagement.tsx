import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { User, UserRole } from '../types/User';
import { 
  Users, 
  Plus, 
  Edit2, 
  Trash2, 
  Save, 
  X, 
  AlertCircle,
  Shield,
  UserCheck,
  Settings,
  Key
} from 'lucide-react';

export const UserManagement: React.FC = () => {
  const { user: currentUser, users, addUser, updateUser, deleteUser, changePassword, resetPassword } = useAuth();
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState<User | null>(null);
  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState('');
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'specialist' as UserRole
  });
  const [error, setError] = useState('');

  const roleLabels = {
    administrator: 'Администратор',
    manager: 'Руководитель', 
    director: 'Менеджер',
    specialist: 'Специалист'
  };

  const roleIcons = {
    administrator: Shield,
    manager: UserCheck,
    director: UserCheck,
    specialist: Settings
  };

  const roleColors = {
    administrator: 'bg-red-100 text-red-800',
    manager: 'bg-blue-100 text-blue-800',
    director: 'bg-purple-100 text-purple-800',
    specialist: 'bg-green-100 text-green-800'
  };

  const handleAddUser = () => {
    setError('');
    
    if (!formData.fullName || !formData.email || !formData.password) {
      setError('Все поля обязательны для заполнения');
      return;
    }

    if (users.some(u => u.email === formData.email)) {
      setError('Пользователь с таким email уже существует');
      return;
    }

    addUser(formData);
    setShowAddForm(false);
    setFormData({ fullName: '', email: '', password: '', role: 'specialist' });
  };

  const handleUpdateUser = () => {
    if (!editingUser) return;
    
    setError('');
    
    if (!editingUser.fullName || !editingUser.email) {
      setError('ФИО и email обязательны для заполнения');
      return;
    }

    updateUser(editingUser.id, editingUser);
    setEditingUser(null);
  };

  const handleDeleteUser = (userId: string) => {
    const user = users.find(u => u.id === userId);
    if (user?.isDefault) {
      setError('Нельзя удалить пользователя по умолчанию');
      return;
    }
    
    if (confirm('Вы уверены, что хотите удалить этого пользователя?')) {
      deleteUser(userId);
    }
  };

  const handleOpenPasswordModal = (user: User) => {
    setShowPasswordModal(user);
    setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
    setPasswordError('');
  };

  const handleClosePasswordModal = () => {
    setShowPasswordModal(null);
    setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
    setPasswordError('');
  };

  const handlePasswordChange = () => {
    setPasswordError('');
    
    if (!passwordForm.newPassword || passwordForm.newPassword.length < 6) {
      setPasswordError('Новый пароль должен содержать минимум 6 символов');
      return;
    }
    
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('Пароли не совпадают');
      return;
    }
    
    if (!showPasswordModal) return;
    
    let success = false;
    
    // Если администратор меняет пароль другому пользователю
    if (currentUser?.role === 'administrator' && showPasswordModal.id !== currentUser.id) {
      success = resetPassword(showPasswordModal.id, passwordForm.newPassword);
      if (!success) {
        setPasswordError('Ошибка сброса пароля');
        return;
      }
    } else {
      // Пользователь меняет свой пароль
      if (!passwordForm.oldPassword) {
        setPasswordError('Введите текущий пароль');
        return;
      }
      
      success = changePassword(showPasswordModal.id, passwordForm.oldPassword, passwordForm.newPassword);
      if (!success) {
        setPasswordError('Неверный текущий пароль');
        return;
      }
    }
    
    handleClosePasswordModal();
    setError('');
  };
  return (
    <div className="space-y-6">
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

      {error && (
        <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-4 rounded-lg">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
          <button onClick={() => setError('')} className="ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Форма добавления пользователя */}
      {showAddForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-4">Добавить нового пользователя</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ФИО</label>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Пароль</label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Роль</label>
              <select
                value={formData.role}
                onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="specialist">Специалист</option>
                <option value="manager">Руководитель</option>
                <option value="director">Менеджер</option>
                <option value="administrator">Администратор</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end space-x-3 mt-4">
            <button
              onClick={() => setShowAddForm(false)}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Отмена
            </button>
            <button
              onClick={handleAddUser}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2"
            >
              <Save className="w-4 h-4" />
              <span>Создать</span>
            </button>
          </div>
        </div>
      )}

      {/* Список пользователей */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                ФИО
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Роль
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Действия
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user) => {
              const RoleIcon = roleIcons[user.role];
              return (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingUser?.id === user.id ? (
                      <input
                        type="text"
                        value={editingUser.fullName}
                        onChange={(e) => setEditingUser({ ...editingUser, fullName: e.target.value })}
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    ) : (
                      <div className="flex items-center">
                        <div className="text-sm font-medium text-gray-900">{user.fullName}</div>
                        {user.isDefault && (
                          <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                            По умолчанию
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingUser?.id === user.id ? (
                      <input
                        type="email"
                        value={editingUser.email}
                        onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                        className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    ) : (
                      <div className="text-sm text-gray-500">{user.email}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {editingUser?.id === user.id ? (
                      <select
                        value={editingUser.role}
                        onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as UserRole })}
                        className="px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      >
                        <option value="specialist">Специалист</option>
                        <option value="manager">Руководитель</option>
                        <option value="director">Менеджер</option>
                        <option value="administrator">Администратор</option>
                      </select>
                    ) : (
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${roleColors[user.role]}`}>
                        <RoleIcon className="w-3 h-3 mr-1" />
                        {roleLabels[user.role]}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {editingUser?.id === user.id ? (
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={handleUpdateUser}
                          className="text-green-600 hover:text-green-900"
                        >
                          <Save className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingUser(null)}
                          className="text-gray-600 hover:text-gray-900"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => setEditingUser(user)}
                          className="text-indigo-600 hover:text-indigo-900"
                          title="Редактировать пользователя"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenPasswordModal(user)}
                          className="text-purple-600 hover:text-purple-900"
                          title="Сменить пароль"
                        >
                          <Key className="w-4 h-4" />
                        </button>
                        {!user.isDefault && (
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Удалить пользователя"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                {currentUser?.role === 'administrator' && showPasswordModal.id !== currentUser.id
                  ? `Сброс пароля для ${showPasswordModal.fullName}`
                  : 'Смена пароля'
                }
              </h3>
              <button
                onClick={handleClosePasswordModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {passwordError && (
                <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-lg">
                  <AlertCircle className="w-5 h-5" />
                  <span className="text-sm">{passwordError}</span>
                </div>
              )}

              {/* Текущий пароль (только если пользователь меняет свой пароль или не администратор) */}
              {!(currentUser?.role === 'administrator' && showPasswordModal.id !== currentUser.id) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Текущий пароль
                  </label>
                  <input
                    type="password"
                    value={passwordForm.oldPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, oldPassword: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Введите текущий пароль"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Новый пароль
                </label>
                <input
                  type="password"
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Введите новый пароль (минимум 6 символов)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Подтверждение пароля
                </label>
                <input
                  type="password"
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Повторите новый пароль"
                />
              </div>

              {/* Информация для администратора */}
              {currentUser?.role === 'administrator' && showPasswordModal.id !== currentUser.id && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-sm text-yellow-800">
                    <strong>Режим администратора:</strong> Вы сбрасываете пароль для пользователя {showPasswordModal.fullName}. 
                    Ввод текущего пароля не требуется.
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={handleClosePasswordModal}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handlePasswordChange}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors flex items-center space-x-2"
              >
                <Key className="w-4 h-4" />
                <span>
                  {currentUser?.role === 'administrator' && showPasswordModal.id !== currentUser.id
                    ? 'Сбросить пароль'
                    : 'Сменить пароль'
                  }
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};