import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Login } from './components/Login';
import { Layout } from './components/Layout';
import { MicroclimatAnalyzer } from './components/MicroclimatAnalyzer';
import { Help } from './components/Help';
import { DatabaseTest } from './components/DatabaseTest';
import { UserDirectory } from './components/UserDirectory';
import { ContractorDirectory } from './components/ContractorDirectory';
import { ProjectDirectory } from './components/ProjectDirectory';
import './index.css';

const AppContent: React.FC = () => {
  const { user, hasAccess } = useAuth();
  const [currentPage, setCurrentPage] = useState('analyzer');
  const [showVisualization, setShowVisualization] = useState(false);

  React.useEffect(() => {
    if (!user) return;
  }, [user]);

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
      case 'help':
        return hasAccess('help') ? <Help /> : <div>Доступ запрещен</div>;
      case 'users':
        return hasAccess('users') ? <UserDirectory /> : <div>Доступ запрещен</div>;
      case 'contractors':
        return hasAccess('analyzer') ? <ContractorDirectory /> : <div>Доступ запрещен</div>;
      case 'projects':
        return hasAccess('analyzer') ? <ProjectDirectory onPageChange={setCurrentPage} /> : <div>Доступ запрещен</div>;
      case 'database':
        return hasAccess('database') ? <DatabaseTest /> : <div>Доступ запрещен</div>;
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
        <AppContent />
    </AuthProvider>
  );
}

export default App;