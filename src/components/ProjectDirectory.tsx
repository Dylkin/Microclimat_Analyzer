import React, { useState } from 'react';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { Login } from './Login';
import { Layout } from './Layout';
import { MicroclimatAnalyzer } from './MicroclimatAnalyzer';
import { Help } from './Help';
import { DatabaseTest } from './DatabaseTest';
import { UserDirectory } from './UserDirectory';
import { ContractorDirectory } from './ContractorDirectory';
import { ContractNegotiation } from './ContractNegotiation';
import '../index.css';

const AppContent: React.FC = () => {
  const { user, hasAccess } = useAuth();
  const [currentPage, setCurrentPage] = useState('projects');
  const [showVisualization, setShowVisualization] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);

  React.useEffect(() => {
    if (!user) return;
  }, [user]);

  if (!user) {
    return <Login />;
  }

  const handlePageChange = (page: string, projectData?: any) => {
    setCurrentPage(page);
    if (projectData) {
      setSelectedProject(projectData);
    } else {
      setSelectedProject(null);
    }
  };
  const renderPage = () => {
    switch (currentPage) {
      case 'analyzer':
        return hasAccess('analyzer') ? (
          <MicroclimatAnalyzer 
            showVisualization={showVisualization}
            onShowVisualization={setShowVisualization}
            selectedProject={selectedProject}
          />
        ) : <div>Доступ запрещен</div>;
      case 'help':
        return hasAccess('help') ? <Help /> : <div>Доступ запрещен</div>;
      case 'users':
        return hasAccess('users') ? <UserDirectory /> : <div>Доступ запрещен</div>;
      case 'contractors':
        return hasAccess('analyzer') ? <ContractorDirectory /> : <div>Доступ запрещен</div>;
      case 'projects':
        return hasAccess('analyzer') ? <ProjectDirectory onPageChange={handlePageChange} /> : <div>Доступ запрещен</div>;
      case 'contract_negotiation':
        return hasAccess('analyzer') ? <ContractNegotiation selectedProject={selectedProject} onPageChange={handlePageChange} /> : <div>Доступ запрещен</div>;
      case 'database':
        return hasAccess('database') ? <DatabaseTest /> : <div>Доступ запрещен</div>;
      default:
        return <MicroclimatAnalyzer 
          showVisualization={showVisualization}
          onShowVisualization={setShowVisualization}
          selectedProject={selectedProject}
        />;
    }
  };

  return (
    <Layout currentPage={currentPage} onPageChange={handlePageChange}>
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