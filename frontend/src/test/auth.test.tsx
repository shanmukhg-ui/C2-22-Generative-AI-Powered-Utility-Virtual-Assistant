import React from 'react';
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { AuthCard } from '../components/AuthCard';
import { LandingPage } from '../pages/LandingPage';
import App from '../App';

describe('Direct Persona Access & RBAC (Zero-Authentication Mode)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('initializes default persona as John Doe (Customer) with zero passwords', () => {
    const TestComponent: React.FC = () => {
      const { user } = useAuth();
      return (
        <div>
          <span data-testid="user-name">{user?.name}</span>
          <span data-testid="user-role">{user?.role}</span>
        </div>
      );
    };

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByTestId('user-name')).toHaveTextContent('John Doe');
    expect(screen.getByTestId('user-role')).toHaveTextContent('Customer');
  });

  it('switches persona instantly on 1-click without requiring passwords or Firebase', async () => {
    const TestComponent: React.FC = () => {
      const { user, switchPersona } = useAuth();
      return (
        <div>
          <span data-testid="user-name">{user?.name}</span>
          <span data-testid="user-role">{user?.role}</span>
          <button onClick={() => switchPersona('EMP0001')}>Switch to Priya</button>
          <button onClick={() => switchPersona('ADM0001')}>Switch to Amit</button>
        </div>
      );
    };

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByTestId('user-role')).toHaveTextContent('Customer');

    // 1-Click switch to Priya Singh (Operations)
    fireEvent.click(screen.getByText('Switch to Priya'));
    await waitFor(() => {
      expect(screen.getByTestId('user-name')).toHaveTextContent('Priya Singh');
      expect(screen.getByTestId('user-role')).toHaveTextContent('Employee');
    });

    // 1-Click switch to Amit Kumar (Administrator)
    fireEvent.click(screen.getByText('Switch to Amit'));
    await waitFor(() => {
      expect(screen.getByTestId('user-name')).toHaveTextContent('Amit Kumar');
      expect(screen.getByTestId('user-role')).toHaveTextContent('Administrator');
    });
  });

  it('AuthCard renders 3 persona buttons with instant one-click entry', async () => {
    const onSuccess = vi.fn();

    render(
      <AuthProvider>
        <AuthCard onSuccess={onSuccess} />
      </AuthProvider>
    );

    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Priya Singh')).toBeInTheDocument();
    expect(screen.getByText('Amit Kumar')).toBeInTheDocument();
    expect(screen.getByText('Instant One-Click Entry')).toBeInTheDocument();

    // Clicking Priya Singh calls switchPersona and onSuccess
    fireEvent.click(screen.getByText('Priya Singh'));
    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it('LandingPage interactive demo renders dynamic query prompts', () => {
    const onGetStarted = vi.fn();
    const onLogin = vi.fn();

    render(
      <AuthProvider>
        <LandingPage onGetStarted={onGetStarted} onLogin={onLogin} />
      </AuthProvider>
    );

    fireEvent.click(screen.getByText('• Please list all complaints'));
    expect(screen.getByText(/Found 250 record\(s\) in Citizen Grievances & Complaints registry/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText('Reset'));

    fireEvent.click(screen.getByText('• List all successfully resolved cases'));
    expect(screen.getByText(/Found 112 record\(s\) with Status: Resolved/i)).toBeInTheDocument();
  });

  it('LandingPage Login button opens direct persona access or enters app without login modals', () => {
    const onLogin = vi.fn();
    const onGetStarted = vi.fn();

    render(
      <AuthProvider>
        <LandingPage onGetStarted={onGetStarted} onLogin={onLogin} />
      </AuthProvider>
    );

    fireEvent.click(screen.getByText('Login'));
    expect(onLogin).toHaveBeenCalled();
    // Modal is removed, no password prompt exists
    expect(screen.queryByPlaceholderText(/enter password/i)).not.toBeInTheDocument();
  });

  it('App navigates directly between landing and persona dashboards', async () => {
    render(<App />);

    // Renders landing page
    expect(screen.getByText(/Your Utility Services\./i)).toBeInTheDocument();

    // Clicking Try AI Assistant enters app immediately without login modal
    fireEvent.click(screen.getByText('Try AI Assistant'));
    await waitFor(() => {
      expect(screen.getByText('AI Utility Assistant')).toBeInTheDocument();
    });
  });
});
