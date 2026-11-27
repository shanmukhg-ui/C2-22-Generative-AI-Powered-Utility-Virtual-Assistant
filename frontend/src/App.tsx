import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { CommandPalette } from './components/CommandPalette';
import { LandingPage } from './pages/LandingPage';
import { ChatPage } from './pages/ChatPage';
import { CustomerDashboard } from './pages/CustomerDashboard';
import { EmployeeDashboard } from './pages/EmployeeDashboard';
import { AdminDashboard } from './pages/AdminDashboard';
import { RequestsPage } from './pages/RequestsPage';
import { ComplaintsPage } from './pages/ComplaintsPage';
import { OperationsPage } from './pages/OperationsPage';
import { KnowledgePage } from './pages/KnowledgePage';
import { AuditLogsPage } from './pages/AuditLogsPage';
import { SettingsPage } from './pages/SettingsPage';
import { LoginPage } from './pages/LoginPage';
import { ProfilePage } from './pages/ProfilePage';
import { UsersPage } from './pages/UsersPage';
import { NewRequestModal, IngestDocModal } from './components/Modals';
import { IntroOverlay } from './components/intro/IntroOverlay';
import { DashboardChat } from './components/DashboardChat';
import { useIntroPreference } from './hooks/useIntroPreference';
import { CheckCircle2, Shield, Zap } from 'lucide-react';

const AppContent: React.FC = () => {
  const { user } = useAuth();
  const { shouldShowIntro, markIntroShown, forceReplay } = useIntroPreference();
  // Default to public landing page matching the user's primary design
  const [currentPage, setCurrentPage] = useState<string>('landing');
  const [chatInitialQuery, setChatInitialQuery] = useState<string | undefined>(undefined);
  const [loginInitialPersona, setLoginInitialPersona] = useState<string | undefined>(undefined);

  // Command Palette State
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Modal states
  const [isNewRequestOpen, setIsNewRequestOpen] = useState(false);
  const [isIngestDocOpen, setIsIngestDocOpen] = useState(false);

  // Toast Notification state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Refresh key to trigger reloading tables when a modal creates a record
  const [refreshKey, setRefreshKey] = useState(0);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Global key listener for Ctrl+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // If user role changes, make sure page is accessible
  useEffect(() => {
    if (!user) {
      if (currentPage !== 'landing' && currentPage !== 'login') {
        setCurrentPage('login');
      }
      return;
    }

    if (currentPage === 'login') {
      if (user.role === 'Employee') setCurrentPage('employee-dash');
      else if (user.role === 'Administrator') setCurrentPage('admin-dash');
      else setCurrentPage('customer-dash');
      return;
    }

    if (currentPage === 'customer-dash' && user.role !== 'Customer') {
      setCurrentPage(user.role === 'Employee' ? 'employee-dash' : 'admin-dash');
    } else if (currentPage === 'employee-dash' && user.role !== 'Employee') {
      setCurrentPage(user.role === 'Customer' ? 'customer-dash' : 'admin-dash');
    } else if (currentPage === 'admin-dash' && user.role !== 'Administrator') {
      setCurrentPage(user.role === 'Customer' ? 'customer-dash' : 'employee-dash');
    } else if (currentPage === 'audit' && user.role !== 'Administrator') {
      setCurrentPage('chat');
    } else if (currentPage === 'operations' && user.role === 'Customer') {
      setCurrentPage('chat');
    }
  }, [user, currentPage]);

  const handleModalSuccess = () => {
    setRefreshKey(k => k + 1);
    showToast('Record committed to MongoDB successfully.');
  };

  const handleNavigate = (page: string, prompt?: string) => {
    if (page === 'users') {
      setCurrentPage('users');
    } else if (page === 'settings') {
      setCurrentPage('settings');
    } else if (page === 'profile') {
      setCurrentPage('profile');
    } else {
      if (page === 'chat') {
        setChatInitialQuery(prompt);
      }
      setCurrentPage(page);
    }
  };

  const handleOpenGrievanceChat = () => {
    setChatInitialQuery('I want to lodge a grievance');
    setCurrentPage('chat');
  };

  // If on public landing page, render full width without sidebar
  if (currentPage === 'landing') {
    return (
      <>
        {shouldShowIntro && (
          <IntroOverlay onClose={markIntroShown} />
        )}

        <LandingPage
          onGetStarted={() => {
            setChatInitialQuery(undefined);
            setCurrentPage('chat');
          }}
          onLogin={() => {
            setLoginInitialPersona(undefined);
            setCurrentPage('login');
          }}
          onSelectPersona={(personaId) => {
            setLoginInitialPersona(personaId);
            setCurrentPage('login');
          }}
          onLoginSuccess={() => {
            setLoginInitialPersona(undefined);
            if (user?.role === 'Employee') setCurrentPage('employee-dash');
            else if (user?.role === 'Administrator') setCurrentPage('admin-dash');
            else setCurrentPage('customer-dash');
          }}
          onTryChatWithPrompt={(prompt) => {
            setChatInitialQuery(prompt);
            setCurrentPage('chat');
          }}
          onReplayIntro={forceReplay}
        />

        {/* Global Command Palette */}
        <CommandPalette
          isOpen={isCommandPaletteOpen}
          onClose={() => setIsCommandPaletteOpen(false)}
          onNavigate={handleNavigate}
          onOpenNewRequest={() => setIsNewRequestOpen(true)}
          onOpenNewComplaint={handleOpenGrievanceChat}
          onSelectPrompt={(prompt) => {
            setChatInitialQuery(prompt);
            setCurrentPage('chat');
          }}
        />
      </>
    );
  }

  // If on login page, render full width without sidebar, matching LandingPage design
  if (currentPage === 'login') {
    return (
      <div className="relative min-h-screen bg-slate-900">
        <button
          type="button"
          onClick={() => {
            setLoginInitialPersona(undefined);
            setCurrentPage('landing');
          }}
          className="absolute top-4 left-4 z-20 px-3 py-1.5 text-xs font-bold text-slate-200 bg-slate-800/80 hover:bg-slate-700 border border-slate-600 rounded-xl shadow-md transition flex items-center gap-1.5"
        >
          ← Back to home
        </button>
        <LoginPage
          initialPersonaId={loginInitialPersona}
          onLoginSuccess={() => {
            setLoginInitialPersona(undefined);
            if (user?.role === 'Employee') setCurrentPage('employee-dash');
            else if (user?.role === 'Administrator') setCurrentPage('admin-dash');
            else setCurrentPage('customer-dash');
          }}
        />
      </div>
    );
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'chat':
        return <ChatPage key={`${refreshKey}_${chatInitialQuery || ''}`} initialQuery={chatInitialQuery} />;
      case 'customer-dash':
        return (
          <CustomerDashboard
            key={refreshKey}
            onNavigate={handleNavigate}
            onOpenNewRequest={() => setIsNewRequestOpen(true)}
            onOpenNewComplaint={handleOpenGrievanceChat}
          />
        );
      case 'employee-dash':
        return (
          <EmployeeDashboard
            key={refreshKey}
            onNavigate={handleNavigate}
          />
        );
      case 'admin-dash':
        return (
          <AdminDashboard
            key={refreshKey}
            onNavigate={handleNavigate}
            onOpenUploadDoc={() => setIsIngestDocOpen(true)}
          />
        );
      case 'requests':
        return (
          <RequestsPage
            key={refreshKey}
            onOpenNewRequest={() => setIsNewRequestOpen(true)}
          />
        );
      case 'complaints':
        return (
          <ComplaintsPage
            key={refreshKey}
            onOpenNewComplaint={handleOpenGrievanceChat}
            onNavigate={handleNavigate}
          />
        );
      case 'operations':
        return <OperationsPage key={refreshKey} />;
      case 'knowledge':
        return (
          <KnowledgePage
            key={refreshKey}
            onOpenUploadDoc={() => setIsIngestDocOpen(true)}
          />
        );
      case 'audit':
        return <AuditLogsPage key={refreshKey} />;
      case 'settings':
        return <SettingsPage key={refreshKey} />;
      case 'profile':
        return <ProfilePage key={refreshKey} />;
      case 'users':
        return <UsersPage key={refreshKey} onNavigate={handleNavigate} />;
      case 'login':
        return (
          <LoginPage
            initialPersonaId={loginInitialPersona}
            onLoginSuccess={() => {
              setLoginInitialPersona(undefined);
              if (user?.role === 'Employee') setCurrentPage('employee-dash');
              else if (user?.role === 'Administrator') setCurrentPage('admin-dash');
              else setCurrentPage('customer-dash');
            }}
          />
        );
      default:
        return <ChatPage key={refreshKey} />;
    }
  };

  return (
    <div className="flex h-screen bg-surface-page overflow-hidden font-sans text-content-main">
      {/* Sidebar Navigation (Dark Indigo #171642) */}
      <Sidebar currentPage={currentPage} onNavigate={handleNavigate} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <Navbar
          onNavigateLanding={() => setCurrentPage('landing')}
          onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
          onNavigateProfile={() => setCurrentPage('profile')}
        />

        {/* Dynamic Page Container with Docked Right-Side AI Assistant on Dashboards */}
        {['customer-dash', 'employee-dash', 'admin-dash'].includes(currentPage) ? (
          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0 bg-surface-page">
            {/* Dashboard Content: stays on left, shrinks to fit, own scroll */}
            <main className="flex-1 overflow-y-auto pb-8 min-w-0">
              {renderPage()}
              {/* Mobile/Tablet: AI Assistant moves to a full-width card at the bottom of the dashboard */}
              <div className="block lg:hidden px-4 md:px-6 mt-6 pb-12">
                <div className="h-[520px] rounded-2xl border border-surface-border overflow-hidden shadow-xs">
                  <DashboardChat
                    role={user?.role || 'Customer'}
                    onNavigate={handleNavigate}
                    onOpenNewRequest={() => setIsNewRequestOpen(true)}
                    onOpenNewComplaint={handleOpenGrievanceChat}
                    onOpenUploadDoc={() => setIsIngestDocOpen(true)}
                  />
                </div>
              </div>
            </main>

            {/* Desktop: Docked right-side AI Assistant panel (beside main cards, full height, own scroll) */}
            <div className="hidden lg:flex h-full flex-shrink-0">
              <DashboardChat
                role={user?.role || 'Customer'}
                onNavigate={handleNavigate}
                onOpenNewRequest={() => setIsNewRequestOpen(true)}
                onOpenNewComplaint={handleOpenGrievanceChat}
                onOpenUploadDoc={() => setIsIngestDocOpen(true)}
              />
            </div>
          </div>
        ) : (
          <main className="flex-1 overflow-y-auto bg-surface-page pb-12">
            {renderPage()}
          </main>
        )}
      </div>

      {/* Global Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigate={handleNavigate}
        onOpenNewRequest={() => setIsNewRequestOpen(true)}
        onOpenNewComplaint={handleOpenGrievanceChat}
        onSelectPrompt={(prompt) => {
          setChatInitialQuery(prompt);
          setCurrentPage('chat');
        }}
      />

      {/* Global Modals */}
      <NewRequestModal
        isOpen={isNewRequestOpen}
        onClose={() => setIsNewRequestOpen(false)}
        onSuccess={handleModalSuccess}
      />
      <IngestDocModal
        isOpen={isIngestDocOpen}
        onClose={() => setIsIngestDocOpen(false)}
        onSuccess={handleModalSuccess}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-indigo-deep text-white px-4 py-3 rounded-card shadow-2xl border border-primary/30 flex items-center space-x-2 text-xs font-semibold animate-in slide-in-from-bottom-2 duration-200">
          <CheckCircle2 className="w-4 h-4 text-status-success" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <SettingsProvider>
          <AppContent />
        </SettingsProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
