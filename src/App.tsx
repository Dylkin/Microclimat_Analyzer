import React, { useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Login } from './components/Login';
import { Layout } from './components/Layout';
import { Help } from './components/Help';
import { UserDirectory } from './components/UserDirectory';
import { DatabaseTest } from './components/DatabaseTest';
import { ContractorDirectory } from './components/ContractorDirectory';
import { ProjectDirectory } from './components/ProjectDirectory';
import { EquipmentDirectory } from './components/EquipmentDirectory';
import { ContractNegotiation } from './components/ContractNegotiation';
import { ProtocolPreparation } from './components/ProtocolPreparation';
import { TestingExecution } from './components/TestingExecution';
import { ReportPreparation } from './components/ReportPreparation';
import { ReportWork } from './components/ReportWork';
import { TimeSeriesAnalyzer } from './components/TimeSeriesAnalyzer';
import './index.css';

interface AppContentProps {}

const AppContent: React.FC<AppContentProps> = () => {
  const { user } = useAuth();
  const [currentPage, setCurrentPage] = useState('analyzer');
  const [projectData, setProjectData] = useState<any>(null);

  const handlePageChange = (page: string, data?: any) => {
    setCurrentPage(page);
    setProjectData(data || null);
  };

  if (!user) {
    return <Login />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'analyzer':
        return <TimeSeriesAnalyzer files={[]} />;
      case 'help':
        return <Help />;
      case 'users':
        return <UserDirectory />;
      case 'database':
        return <DatabaseTest />;
      case 'contractors':
        return <ContractorDirectory />;
      case 'projects':
        return <ProjectDirectory onPageChange={handlePageChange} />;
      case 'equipment':
        return <EquipmentDirectory />;
      case 'contract_negotiation':
        return (
          <ContractNegotiation 
            project={projectData} 
            onBack={() => setCurrentPage('projects')} 
          />
        );
      case 'protocol_preparation':
        return (
          <ProtocolPreparation 
            project={projectData} 
            onBack={() => setCurrentPage('projects')} 
          />
        );
      case 'testing_execution':
        return (
          <TestingExecution 
            project={projectData} 
            onBack={() => setCurrentPage('projects')} 
          />
        );
      case 'report_preparation':
        return (
          <ReportPreparation 
            project={projectData} 
            onBack={() => setCurrentPage('projects')}
            onPageChange={handlePageChange}
          />
        );
      case 'report_work':
        return (
          <ReportWork 
            project={projectData?.project}
            files={projectData?.files || []}
            onBack={() => setCurrentPage('report_preparation')}
          />
        );
      default:
        return <TimeSeriesAnalyzer files={[]} />;
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