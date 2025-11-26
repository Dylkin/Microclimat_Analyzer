import React, { useState, Suspense, lazy, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Login } from './components/Login';
import { Layout } from './components/Layout';
import './index.css';

// Lazy load components for code splitting
const MicroclimatAnalyzer = lazy(() => import('./components/MicroclimatAnalyzer'));
const Help = lazy(() => import('./components/Help'));
const UserDirectory = lazy(() => import('./components/admin-panels').then(m => ({ default: m.UserDirectory })));
const ContractorDirectory = lazy(() => import('./components/admin-panels').then(m => ({ default: m.ContractorDirectory })));
const ProjectDirectory = lazy(() => import('./components/ProjectDirectory'));
const EquipmentDirectory = lazy(() => import('./components/equipment-management').then(m => ({ default: m.EquipmentDirectory })));
const ContractNegotiation = lazy(() => import('./components/ContractNegotiation'));
const TestingExecution = lazy(() => import('./components/testing-management').then(m => ({ default: m.TestingExecution })));
const CreatingReport = lazy(() => import('./components/CreatingReport'));
const DataAnalysis = lazy(() => import('./components/DataAnalysis'));
const AuditLogs = lazy(() => import('./components/AuditLogs'));
const ResetPassword = lazy(() => import('./components/ResetPassword'));
const TenderSearch = lazy(() => import('./components/TenderSearch'));
const QualificationObjectTypes = lazy(() => import('./components/QualificationObjectTypes'));

// Loading component
const LoadingSpinner: React.FC = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
  </div>
);

const AppContent: React.FC = () => {
  const { user, hasAccess } = useAuth();
  const [currentPage, setCurrentPage] = useState('projects');
  const [showVisualization, setShowVisualization] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [pageData, setPageData] = useState<any>(null);

  // Проверяем, находимся ли мы на странице сброса пароля
  useEffect(() => {
    const path = window.location.pathname;
    if (path === '/reset-password') {
      setCurrentPage('reset-password');
    }
  }, []);

  React.useEffect(() => {
    if (!user) return;
  }, [user]);

  // Если находимся на странице сброса пароля, показываем её независимо от авторизации
  if (currentPage === 'reset-password') {
    return (
      <Suspense fallback={<LoadingSpinner />}>
        <ResetPassword />
      </Suspense>
    );
  }

  if (!user) {
    return <Login />;
  }

  const handlePageChange = (page: string, projectData?: any) => {
    console.log('App: handlePageChange вызван:', {
      page,
      projectData: projectData ? {
        id: projectData.id || projectData.project?.id,
        name: projectData.name || projectData.project?.name,
        contractNumber: projectData.contractNumber || projectData.project?.contractNumber,
        contractDate: projectData.contractDate || projectData.project?.contractDate,
        fullProject: projectData.project || projectData  // Используем project из данных, если есть
      } : null
    });
    
    setCurrentPage(page);
    if (projectData) {
      // Если в projectData есть вложенный объект project, используем его
      const projectToSet = projectData.project || projectData;
      setSelectedProject(projectToSet);
      setPageData(projectData); // Сохраняем полные данные для доступа к analysisData
    } else {
      setSelectedProject(null);
      setPageData(null);
    }
  };
  const renderPage = () => {
    const wrapWithSuspense = (component: React.ReactNode) => (
      <Suspense fallback={<LoadingSpinner />}>
        {component}
      </Suspense>
    );

    switch (currentPage) {
      case 'analyzer':
        return hasAccess('analyzer') ? wrapWithSuspense(
          <MicroclimatAnalyzer 
            showVisualization={showVisualization}
            onShowVisualization={setShowVisualization}
            selectedProject={selectedProject}
          />
        ) : <div>Доступ запрещен</div>;
      case 'contract_negotiation':
        console.log('App: Рендеринг contract_negotiation с проектом:', {
          selectedProject: selectedProject ? {
            id: selectedProject.id,
            name: selectedProject.name,
            contractNumber: selectedProject.contractNumber,
            contractDate: selectedProject.contractDate,
            fullProject: selectedProject  // Добавляем полный объект для диагностики
          } : null
        });
        return hasAccess('analyzer') && selectedProject ? wrapWithSuspense(
          <ContractNegotiation 
            project={selectedProject}
            onBack={() => handlePageChange('projects')}
            onPageChange={handlePageChange}
          />
        ) : <div>Доступ запрещен или проект не выбран</div>;
      case 'testing_execution':
        return hasAccess('analyzer') && selectedProject ? wrapWithSuspense(
          <TestingExecution 
            project={selectedProject}
            onBack={() => handlePageChange('projects')}
            onPageChange={handlePageChange}
          />
        ) : <div>Доступ запрещен или проект не выбран</div>;
      case 'creating_report':
        return hasAccess('analyzer') && selectedProject ? wrapWithSuspense(
          <CreatingReport 
            project={selectedProject}
            onBack={() => handlePageChange('projects')}
            onPageChange={handlePageChange}
          />
        ) : <div>Доступ запрещен или проект не выбран</div>;
      case 'data_analysis':
        // Используем project из pageData, если он есть, иначе selectedProject
        const projectForAnalysis = pageData?.project || selectedProject;
        return hasAccess('analyzer') && projectForAnalysis ? wrapWithSuspense(
          <DataAnalysis 
            project={projectForAnalysis}
            analysisData={pageData}
            onBack={() => {
              // Если в pageData есть полный объект проекта, используем его
              const projectToReturn = pageData?.project || selectedProject;
              handlePageChange('creating_report', projectToReturn);
            }}
          />
        ) : <div>Доступ запрещен или проект не выбран</div>;
      case 'help':
        return hasAccess('help') ? wrapWithSuspense(<Help />) : <div>Доступ запрещен</div>;
      case 'users':
        return hasAccess('users') ? wrapWithSuspense(<UserDirectory />) : <div>Доступ запрещен</div>;
      case 'audit_logs':
        return hasAccess('admin') ? wrapWithSuspense(<AuditLogs onBack={() => handlePageChange('projects')} />) : <div>Доступ запрещен</div>;
      case 'contractors':
        return hasAccess('analyzer') ? wrapWithSuspense(<ContractorDirectory />) : <div>Доступ запрещен</div>;
      case 'projects':
        return hasAccess('analyzer') ? wrapWithSuspense(<ProjectDirectory onPageChange={handlePageChange} />) : <div>Доступ запрещен</div>;
      case 'equipment':
        return hasAccess('analyzer') ? wrapWithSuspense(<EquipmentDirectory />) : <div>Доступ запрещен</div>;
      case 'qualification-objects':
        return hasAccess('analyzer') ? wrapWithSuspense(<QualificationObjectTypes />) : <div>Доступ запрещен</div>;
      case 'tender-search':
        return hasAccess('analyzer') ? wrapWithSuspense(<TenderSearch />) : <div>Доступ запрещен</div>;
      default:
        return wrapWithSuspense(
          <MicroclimatAnalyzer 
            showVisualization={showVisualization}
            onShowVisualization={setShowVisualization}
            selectedProject={selectedProject}
          />
        );
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