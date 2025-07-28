import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Login } from './components/Login';
import { Layout } from './components/Layout';
import { MicroclimatAnalyzer } from './components/MicroclimatAnalyzer';
import { UserManagement } from './components/UserManagement';
import './index.css';

const AppContent: React.FC = () => {
  const { user, hasAccess } = useAuth();
  const [currentPage, setCurrentPage] = useState('analyzer');

  if (!user) {
    return <Login />;
  }

  // Определяем стартовую страницу на основе роли
  React.useEffect(() => {
    if (user.role === 'specialist' && !hasAccess('analyzer')) {
      setCurrentPage('analyzer');
    } else if (user.role === 'manager' && !hasAccess('analyzer')) {
      setCurrentPage('users');
    } else if (!hasAccess(currentPage as 'analyzer' | 'users')) {
      // Если текущая страница недоступна, переключаемся на доступную
      if (hasAccess('analyzer')) {
        setCurrentPage('analyzer');
      } else if (hasAccess('users')) {
        setCurrentPage('users');
      }
    }
  }, [user, hasAccess, currentPage]);

  const renderPage = () => {
    switch (currentPage) {
      case 'analyzer':
        return hasAccess('analyzer') ? <MicroclimatAnalyzer /> : <div>Доступ запрещен</div>;
      case 'users':
        return hasAccess('users') ? <UserManagement /> : <div>Доступ запрещен</div>;
      default:
        return <MicroclimatAnalyzer />;
    }
  };

  return (
    <Layout currentPage={currentPage} onPageChange={setCurrentPage}>
      {renderPage()}
    </Layout>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;