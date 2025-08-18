import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ProjectProvider } from './contexts/ProjectContext';
import { Login } from './components/Login';
import { Layout } from './components/Layout';
import { MicroclimatAnalyzer } from './components/MicroclimatAnalyzer';
import { ReferenceBooks } from './components/ReferenceBooks';
import { ProjectManagement } from './components/ProjectManagement';
import { Help } from './components/Help';
import './index.css';

const AppContent: React.FC = () => {
  const { user, hasAccess } = useAuth();
  const [currentPage, setCurrentPage] = useState('analyzer');
  const [showVisualization, setShowVisualization] = useState(false);

  React.useEffect(() => {
    if (!user) return;
    
    if (user.role === 'specialist' && !hasAccess('analyzer')) {
      setCurrentPage('analyzer');
    } else if (user.role === 'manager' && !hasAccess('analyzer')) {
      setCurrentPage('projects');
    } else if (!hasAccess(currentPage as 'analyzer' | 'users')) {
      // Если текущая страница недоступна, переключаемся на доступную
      if (hasAccess('analyzer')) {
        setCurrentPage('analyzer');
      } else if (hasAccess('projects')) {
        setCurrentPage('projects');
      } else if (hasAccess('users')) {
        setCurrentPage('references');
      }
    }
  }, [user, hasAccess, currentPage]);

  if (!user) {
    return <Login />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'analyzer':
        return hasAccess('analyzer') ? (
          <MicroclimatAnalyzer 
            showVisualization={showVisualization}
            onShowVisualization={setShowVisualization}
          />
        ) : <div>Доступ запрещен</div>;
      case 'projects':
        return <ProjectManagement />;
      case 'references':
        return hasAccess('users') ? <ReferenceBooks /> : <div>Доступ запрещен</div>;
      case 'help':
        return hasAccess('help') ? <Help /> : <div>Доступ запрещен</div>;
      default:
        return <MicroclimatAnalyzer 
          showVisualization={showVisualization}
          onShowVisualization={setShowVisualization}
        />;
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
      <ProjectProvider>
        <AppContent />
      </ProjectProvider>
    </AuthProvider>
  );
}

export default App;