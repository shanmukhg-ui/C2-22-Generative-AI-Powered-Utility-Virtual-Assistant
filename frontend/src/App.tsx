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
import { NewRequestModal, NewComplaintModal, IngestDocModal } from './components/Modals';
import { IntroOverlay } from './components/intro/IntroOverlay';
import { useIntroPreference } from './hooks/useIntroPreference';
import { CheckCircle2, Shield, Zap } from 'lucide-react';

const AppContent: React.FC = () => {
  const { user } = useAuth();
  const { shouldShowIntro, markIntroShown, forceReplay } = useIntroPreference();
  // Default to public landing page matching the user's primary design
  const [currentPage, setCurrentPage] = useState<string>('landing');
  const [chatInitialQuery, setChatInitialQuery] = useState<string | undefined>(undefined);

  // Command Palette State
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  // Modal states
  const [isNewRequestOpen, setIsNewRequestOpen] = useState(false);
  const [isNewComplaintOpen, setIsNewComplaintOpen] = useState(false);
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

  const handleNavigate = (page: string) => {
    if (page === 'users') {
      setCurrentPage('users');
    } else if (page === 'settings') {
      setCurrentPage('settings');
    } else if (page === 'profile') {
      setCurrentPage('profile');
    } else {
      if (page === 'chat') {
        setChatInitialQuery(undefined);
      }
      setCurrentPage(page);
    }
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
          onLogin={() => setCurrentPage('login')}
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
          onOpenNewComplaint={() => setIsNewComplaintOpen(true)}
          onSelectPrompt={(prompt) => {
            setChatInitialQuery(prompt);
            setCurrentPage('chat');
          }}
        />
      </>
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
            onOpenNewComplaint={() => setIsNewComplaintOpen(true)}
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
            onOpenNewComplaint={() => setIsNewComplaintOpen(true)}
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
            onLoginSuccess={() => {
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

        {/* Dynamic Page Container */}
        <main className="flex-1 overflow-y-auto bg-surface-page pb-12">
          {renderPage()}
        </main>
      </div>

      {/* Global Command Palette */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        onNavigate={handleNavigate}
        onOpenNewRequest={() => setIsNewRequestOpen(true)}
        onOpenNewComplaint={() => setIsNewComplaintOpen(true)}
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
      <NewComplaintModal
        isOpen={isNewComplaintOpen}
        onClose={() => setIsNewComplaintOpen(false)}
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
