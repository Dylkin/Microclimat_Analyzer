import React, { useState, Suspense, lazy, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Login } from './components/Login';
import { Layout } from './components/Layout';
import { MailSettingsPage } from './components/MailSettingsPage';
import { FinancePage } from './components/FinancePage';
import { TaxSettingsPage } from './components/TaxSettingsPage';
import type { ContractorDirectoryProps, ContractorDirectoryFocusRequest } from './components/ContractorDirectory';
import { canAccessPage, getDefaultPage } from './constants/pageAccess';
import './index.css';

// Lazy load components for code splitting
const MicroclimatAnalyzer = lazy(() => import('./components/MicroclimatAnalyzer'));
const Help = lazy(() => import('./components/Help'));
const UserDirectory = lazy(() => import('./components/admin-panels').then(m => ({ default: m.UserDirectory })));
const StaffDirectory = lazy(() => import('./components/admin-panels').then(m => ({ default: m.StaffDirectory })));
const ContractorDirectory = lazy(() =>
  import('./components/admin-panels').then((m) => ({
    default: m.ContractorDirectory as React.ComponentType<ContractorDirectoryProps>
  }))
);
const ProjectDirectory = lazy(() => import('./components/ProjectDirectory'));
const EquipmentDirectory = lazy(() => import('./components/equipment-management').then(m => ({ default: m.EquipmentDirectory })));
const ProductsPage = lazy(() => import('./components/ProductsPage'));
const ContractNegotiation = lazy(() => import('./components/ContractNegotiation'));
const TestingExecution = lazy(() => import('./components/testing-management').then(m => ({ default: m.TestingExecution })));
const CreatingReport = lazy(() => import('./components/CreatingReport'));
const DocumentsSubmission = lazy(() => import('./components/DocumentsSubmission'));
const NotSuitable = lazy(() => import('./components/NotSuitable'));
const DataAnalysis = lazy(() => import('./components/DataAnalysis'));
const AuditLogs = lazy(() => import('./components/AuditLogs'));
const ResetPassword = lazy(() => import('./components/ResetPassword'));
const TenderSearch = lazy(() => import('./components/TenderSearch'));
const QualificationObjectTypes = lazy(() => import('./components/QualificationObjectTypes'));
const ReleasePage = lazy(() => import('./components/ReleasePage').then(m => ({ default: m.ReleasePage })));
const PersonalProfilePage = lazy(() =>
  import('./components/PersonalProfilePage').then((m) => ({ default: m.PersonalProfilePage }))
);
const QualificationObjectWindow = lazy(() => import('./components/QualificationObjectWindow').then(m => ({ default: m.QualificationObjectWindow })));
const LoggerPlacementPlanEditor = lazy(() =>
  import('./components/LoggerPlacementPlanEditor').then((m) => ({
    default: m.LoggerPlacementPlanEditor
  }))
);

// Loading component
const LoadingSpinner: React.FC = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
  </div>
);

const AppContent: React.FC = () => {
  const { user } = useAuth();
  const [currentPage, setCurrentPage] = useState('projects');
  const [showVisualization, setShowVisualization] = useState(false);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [pageData, setPageData] = useState<any>(null);
  const [contractorFocusRequest, setContractorFocusRequest] =
    useState<ContractorDirectoryFocusRequest | null>(null);

  // Проверяем, находимся ли мы на странице сброса пароля
  useEffect(() => {
    const path = window.location.pathname;
    if (path === '/reset-password') {
      setCurrentPage('reset-password');
      return;
    }
    // Окно просмотра/редактирования объекта квалификации
    if (path === '/qualification-object') {
      setCurrentPage('qualification-object-window');
    }
  }, []);

  // Обработка сообщений из окна объекта квалификации (возврат к списку)
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (!event.data || typeof event.data !== 'object') return;

      if (event.data.type === 'focusQualificationObjectsList') {
        const contractorId = event.data.contractorId as string | undefined;
        const mode = (event.data.mode as 'edit' | 'view' | undefined) || 'edit';
        if (!contractorId) return;
        setCurrentPage('contractors');
        setContractorFocusRequest({ contractorId, mode });
      }
    };

    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
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

  // Страница-окно для просмотра/редактирования объекта квалификации
  if (currentPage === 'qualification-object-window') {
    return (
      <Suspense fallback={<LoadingSpinner />}>
        <QualificationObjectWindow />
      </Suspense>
    );
  }

  if (!user) {
    return <Login />;
  }

  const handlePageChange = (page: string, projectData?: any) => {
    // Защита от перехода на страницы, запрещённые для роли текущего пользователя
    if (!canAccessPage(user.role, page)) {
      setCurrentPage(getDefaultPage(user.role));
      setSelectedProject(null);
      setPageData(null);
      return;
    }

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

      const shouldRefreshProject =
        !!projectToSet?.id &&
        ['contract_negotiation', 'testing_execution', 'creating_report', 'documents_submission'].includes(page);

      if (shouldRefreshProject) {
        const projectId = projectToSet.id;
        import('./utils/projectService')
          .then(({ projectService }) => projectService.getProjectById(projectId))
          .then((fresh) => {
            setSelectedProject(fresh);
          })
          .catch(() => {});
      }
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
        return canAccessPage(user.role, 'analyzer') ? wrapWithSuspense(
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
        return canAccessPage(user.role, 'contract_negotiation') && selectedProject ? wrapWithSuspense(
          <ContractNegotiation 
            project={selectedProject}
            onBack={() => handlePageChange('projects')}
            onPageChange={handlePageChange}
          />
        ) : <div>Доступ запрещен или проект не выбран</div>;
      case 'testing_execution': {
        const testingFocus =
          pageData?.focusQualificationObjectId
            ? {
                qualificationObjectId: pageData.focusQualificationObjectId as string,
                workScheduleStageName: pageData.focusWorkScheduleStageName as string | undefined
              }
            : null;
        return canAccessPage(user.role, 'testing_execution') && selectedProject ? wrapWithSuspense(
          <TestingExecution 
            project={selectedProject}
            onBack={() => handlePageChange('projects')}
            onPageChange={handlePageChange}
            returnFocus={testingFocus}
            onReturnFocusHandled={() => {
              setPageData((prev: any) => {
                if (!prev?.focusQualificationObjectId) return prev;
                const next = { ...prev };
                delete next.focusQualificationObjectId;
                delete next.focusWorkScheduleStageName;
                return next;
              });
            }}
          />
        ) : <div>Доступ запрещен или проект не выбран</div>;
      }
      case 'creating_report':
        return canAccessPage(user.role, 'creating_report') && selectedProject ? wrapWithSuspense(
          <CreatingReport 
            project={selectedProject}
            onBack={() => handlePageChange('projects')}
            onPageChange={handlePageChange}
          />
        ) : <div>Доступ запрещен или проект не выбран</div>;
      case 'documents_submission':
        return canAccessPage(user.role, 'documents_submission') && selectedProject ? wrapWithSuspense(
          <DocumentsSubmission
            project={selectedProject}
            onBack={() => handlePageChange('projects')}
          />
        ) : <div>Доступ запрещен или проект не выбран</div>;
      case 'not_suitable':
        return canAccessPage(user.role, 'not_suitable') && selectedProject ? wrapWithSuspense(
          <NotSuitable
            project={selectedProject}
            onBack={() => handlePageChange('projects')}
          />
        ) : <div>Доступ запрещен или проект не выбран</div>;
      case 'data_analysis':
        // Используем project из pageData, если он есть, иначе selectedProject
        const projectForAnalysis = pageData?.project || selectedProject;
        return canAccessPage(user.role, 'data_analysis') && projectForAnalysis ? wrapWithSuspense(
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
      case 'logger_plan_editor': {
        const projectForEditor = pageData?.project || selectedProject;
        const qualificationObjectId = pageData?.qualificationObjectId;
        const planFileUrl = pageData?.planFileUrl;
        const planFileName = pageData?.planFileName;
        const qualificationObjectName = pageData?.qualificationObjectName;

        return canAccessPage(user.role, 'logger_plan_editor') &&
          projectForEditor &&
          qualificationObjectId
          ? wrapWithSuspense(
              <LoggerPlacementPlanEditor
                project={projectForEditor}
                qualificationObjectId={qualificationObjectId}
                qualificationObjectName={qualificationObjectName}
                planFileUrl={planFileUrl}
                planFileName={planFileName}
                onBack={() =>
                  handlePageChange('testing_execution', {
                    project: projectForEditor,
                    focusQualificationObjectId: qualificationObjectId,
                    focusWorkScheduleStageName: 'Расстановка логгеров'
                  })
                }
              />
            )
          : <div>Доступ запрещен или данные плана не найдены</div>;
      }
      case 'help':
        return canAccessPage(user.role, 'help') ? wrapWithSuspense(<Help />) : <div>Доступ запрещен</div>;
      case 'users':
        return canAccessPage(user.role, 'users') ? wrapWithSuspense(<UserDirectory />) : <div>Доступ запрещен</div>;
      case 'staff-directory':
        return canAccessPage(user.role, 'staff-directory') ? wrapWithSuspense(<StaffDirectory />) : <div>Доступ запрещен</div>;
      case 'audit_logs':
        return canAccessPage(user.role, 'audit_logs') ? wrapWithSuspense(<AuditLogs onBack={() => handlePageChange('projects')} />) : <div>Доступ запрещен</div>;
      case 'contractors':
        return canAccessPage(user.role, 'contractors')
          ? wrapWithSuspense(
              <ContractorDirectory
                focusQualificationObjects={contractorFocusRequest}
                onFocusQualificationObjectsHandled={() => setContractorFocusRequest(null)}
              />
            )
          : <div>Доступ запрещен</div>;
      case 'projects':
        return canAccessPage(user.role, 'projects') ? wrapWithSuspense(<ProjectDirectory onPageChange={handlePageChange} />) : <div>Доступ запрещен</div>;
      case 'equipment':
        return canAccessPage(user.role, 'equipment') ? wrapWithSuspense(<EquipmentDirectory />) : <div>Доступ запрещен</div>;
      case 'products':
        return canAccessPage(user.role, 'products') ? wrapWithSuspense(<ProductsPage />) : <div>Доступ запрещен</div>;
      case 'qualification-objects':
        return canAccessPage(user.role, 'qualification-objects') ? wrapWithSuspense(<QualificationObjectTypes />) : <div>Доступ запрещен</div>;
      case 'tender-search':
        return canAccessPage(user.role, 'tender-search') ? wrapWithSuspense(<TenderSearch />) : <div>Доступ запрещен</div>;
      case 'mail-settings':
        return canAccessPage(user.role, 'mail-settings') ? wrapWithSuspense(<MailSettingsPage />) : <div>Доступ запрещен</div>;
      case 'tax-settings':
        return canAccessPage(user.role, 'tax-settings') ? wrapWithSuspense(<TaxSettingsPage />) : <div>Доступ запрещен</div>;
      case 'finance':
        return canAccessPage(user.role, 'finance') ? wrapWithSuspense(<FinancePage />) : <div>Доступ запрещен</div>;
      case 'profile':
        return wrapWithSuspense(<PersonalProfilePage />);
      case 'release':
        return canAccessPage(user.role, 'release') ? wrapWithSuspense(<ReleasePage />) : <div>Доступ запрещен</div>;
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