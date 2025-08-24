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
import { ContractNegotiation } from './components/ContractNegotiation';
import { ProtocolPreparation } from './components/ProtocolPreparation';
import { TestingStart } from './components/TestingStart';
import { MeasurementEquipmentDirectory } from './components/MeasurementEquipmentDirectory';
import { DataExport } from './components/DataExport';
import './index.css';

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
      case 'contract-negotiation':
        return hasAccess('analyzer') && selectedProject ? (
          <ContractNegotiation 
            project={selectedProject}
            onBack={() => handlePageChange('projects')}
          />
        ) : <div>Доступ запрещен или проект не выбран</div>;
      case 'protocol-preparation':
        return hasAccess('analyzer') && selectedProject ? (
          <ProtocolPreparation 
            project={selectedProject}
            onBack={() => handlePageChange('projects')}
          />
        ) : <div>Доступ запрещен или проект не выбран</div>;
      case 'testing-start':
        return hasAccess('analyzer') && selectedProject ? (
          <TestingStart 
            project={selectedProject}
            onBack={() => handlePageChange('projects')}
          />
        ) : <div>Доступ запрещен или проект не выбран</div>;
      case 'data-export':
        return hasAccess('analyzer') && selectedProject ? (
          <DataExport 
            project={selectedProject}
            onBack={() => handlePageChange('projects')}
          />
        ) : <div>Доступ запрещен или проект не выбран</div>;
      case 'help':
        return hasAccess('help') ? <Help /> : <div>Доступ запрещен</div>;
      case 'users':
        return hasAccess('users') ? <UserDirectory /> : <div>Доступ запрещен</div>;
      case 'contractors':
        return hasAccess('analyzer') ? <ContractorDirectory /> : <div>Доступ запрещен</div>;
      case 'projects':
        return hasAccess('analyzer') ? <ProjectDirectory onPageChange={handlePageChange} /> : <div>Доступ запрещен</div>;
      case 'measurement-equipment':
        return hasAccess('analyzer') ? <MeasurementEquipmentDirectory /> : <div>Доступ запрещен</div>;
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