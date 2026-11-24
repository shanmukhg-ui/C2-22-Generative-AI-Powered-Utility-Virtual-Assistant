import React from 'react';
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LoginPage } from '../pages/LoginPage';
import { LandingPage } from '../pages/LandingPage';
import App from '../App';
import { AuthProvider } from '../contexts/AuthContext';
import { signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';

// Mock Firebase Auth module
vi.mock('../config/firebase', () => ({
  auth: {
    currentUser: null,
  },
  googleProvider: {},
  isFirebaseConfigured: () => true,
}));

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(),
  GoogleAuthProvider: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signInWithPopup: vi.fn(),
  signOut: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  sendEmailVerification: vi.fn(),
  updateProfile: vi.fn(),
  onIdTokenChanged: vi.fn((_auth, callback) => {
    callback(null);
    return () => {};
  }),
}));

vi.mock('../services/api', () => ({
  authApi: {
    getMe: vi.fn().mockResolvedValue({
      user_id: 'CUST0001',
      firebase_uid: 'firebase_cust0001',
      name: 'John Doe',
      email: 'john.doe@example.com',
      role: 'Customer',
      email_verified: true,
    }),
    updateProfile: vi.fn(),
  },
}));

describe('Firebase Authentication UI & Flows', () => {
  const onLoginSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders application branding, 3 demo persona buttons, Google Sign-In, and Sign In form', () => {
    render(
      <AuthProvider>
        <LoginPage onLoginSuccess={onLoginSuccess} />
      </AuthProvider>
    );

    // Header branding
    expect(screen.getByText('TechBharat C2-22')).toBeInTheDocument();
    expect(screen.getByText(/Generative AI-Powered Utility Virtual Assistant/i)).toBeInTheDocument();

    // 3 Preserved Demo Personas (Requirement 1)
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Priya Singh')).toBeInTheDocument();
    expect(screen.getByText('Amit Kumar')).toBeInTheDocument();

    // Persona IDs and Badges
    expect(screen.getByText(/ID: CUST0001/i)).toBeInTheDocument();
    expect(screen.getByText(/ID: EMP0001/i)).toBeInTheDocument();
    expect(screen.getByText(/ID: ADM0001/i)).toBeInTheDocument();

    // Google Sign-In button (Requirement 3)
    expect(screen.getByText('Continue with Google')).toBeInTheDocument();

    // Sign In form elements (Requirement 2)
    expect(screen.getByPlaceholderText('user@example.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••••••')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /^Sign In$/i }).length).toBe(2);
    expect(screen.getByText('Forgot password?')).toBeInTheDocument();
  });

  it('switches between Sign In and Create Account modes with full field validation', () => {
    render(
      <AuthProvider>
        <LoginPage onLoginSuccess={onLoginSuccess} />
      </AuthProvider>
    );

    // Switch to Create Account (Requirement 4)
    const createAccountTab = screen.getByRole('button', { name: /Create Account/i });
    fireEvent.click(createAccountTab);

    // Registration fields appear
    expect(screen.getByPlaceholderText('Rajesh Sharma')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('rajesh.sharma@example.com')).toBeInTheDocument();
    expect(screen.getByText(/Confirm Password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Create Citizen Account/i })).toBeInTheDocument();

    // Policy note indicates backend role assignment
    expect(screen.getByText(/Newly registered public citizens are securely assigned the/i)).toBeInTheDocument();
  });

  it('validates password mismatch on registration', async () => {
    render(
      <AuthProvider>
        <LoginPage onLoginSuccess={onLoginSuccess} />
      </AuthProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: /Create Account/i }));

    fireEvent.change(screen.getByPlaceholderText('Rajesh Sharma'), { target: { value: 'Test User' } });
    fireEvent.change(screen.getByPlaceholderText('rajesh.sharma@example.com'), { target: { value: 'test@example.com' } });
    
    const passwordInputs = screen.getAllByPlaceholderText('••••••••••••');
    fireEvent.change(passwordInputs[0], { target: { value: 'Password123' } });
    fireEvent.change(passwordInputs[1], { target: { value: 'PasswordMismatch' } });

    fireEvent.click(screen.getByRole('button', { name: /Create Citizen Account/i }));

    await waitFor(() => {
      expect(screen.getByText(/Passwords do not match/i)).toBeInTheDocument();
    });
  });

  it('opens Forgot Password mode and renders reset form', () => {
    render(
      <AuthProvider>
        <LoginPage onLoginSuccess={onLoginSuccess} />
      </AuthProvider>
    );

    fireEvent.click(screen.getByText('Forgot password?'));

    expect(screen.getByText('Reset Password')).toBeInTheDocument();
    expect(screen.getByText(/Firebase will send you a password reset link/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Send Reset Link/i })).toBeInTheDocument();
  });

  it('clicking a demo persona requires password and does not bypass Firebase (Requirements 6 & 7)', async () => {
    render(
      <AuthProvider>
        <LoginPage onLoginSuccess={onLoginSuccess} />
      </AuthProvider>
    );

    // Click John Doe persona card
    const johnDoeButton = screen.getByText('John Doe').closest('button');
    expect(johnDoeButton).toBeInTheDocument();
    fireEvent.click(johnDoeButton!);

    // Persona password modal opens immediately
    expect(screen.getByText('Authenticate Demo Persona')).toBeInTheDocument();
    expect(screen.getByText(/Authenticating as/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter password...')).toBeInTheDocument();

    // Enter password and submit
    vi.mocked(signInWithEmailAndPassword).mockResolvedValueOnce({} as any);

    fireEvent.change(screen.getByPlaceholderText('Enter password...'), {
      target: { value: 'DemoPass123' },
    });

    const modalSignInButton = screen.getAllByRole('button', { name: /^Sign In$/i });
    // The modal submit button
    fireEvent.click(modalSignInButton[modalSignInButton.length - 1]);

    await waitFor(() => {
      expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
        expect.anything(),
        'john.doe@example.com',
        'DemoPass123'
      );
      expect(onLoginSuccess).toHaveBeenCalled();
    });
  });

  it('Google Sign-In button calls Firebase signInWithPopup (Requirement 3)', async () => {
    render(
      <AuthProvider>
        <LoginPage onLoginSuccess={onLoginSuccess} />
      </AuthProvider>
    );

    vi.mocked(signInWithPopup).mockResolvedValueOnce({} as any);

    const googleBtn = screen.getByText('Continue with Google');
    fireEvent.click(googleBtn);

    await waitFor(() => {
      expect(signInWithPopup).toHaveBeenCalled();
      expect(onLoginSuccess).toHaveBeenCalled();
    });
  });

  it('LandingPage login modal renders the complete authentication interface (All Requirements)', async () => {
    const onGetStarted = vi.fn();
    const onLogin = vi.fn();

    render(
      <AuthProvider>
        <LandingPage onGetStarted={onGetStarted} onLogin={onLogin} />
      </AuthProvider>
    );

    // Click header Login button
    const loginHeaderBtn = screen.getByRole('button', { name: /^Login$/i });
    fireEvent.click(loginHeaderBtn);

    // Modal appears with complete Auth UI
    expect(screen.getByText('Welcome to UtilityAI')).toBeInTheDocument();
    expect(screen.getByText('Sign in to access your authorized utility services')).toBeInTheDocument();

    // 3 Demo Personas in modal
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Priya Singh')).toBeInTheDocument();
    expect(screen.getByText('Amit Kumar')).toBeInTheDocument();

    // Standard Email & Password inputs in modal
    expect(screen.getByPlaceholderText('user@example.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••••••')).toBeInTheDocument();

    // Google Sign-In in modal
    expect(screen.getByText('Continue with Google')).toBeInTheDocument();

    // Register / Create Account tab in modal
    expect(screen.getByRole('button', { name: /Create Account/i })).toBeInTheDocument();

    // Forgot password in modal
    expect(screen.getByText('Forgot password?')).toBeInTheDocument();
  });

  it('displays appropriate Firebase authentication errors to user (Requirement 10)', async () => {
    render(
      <AuthProvider>
        <LoginPage onLoginSuccess={onLoginSuccess} />
      </AuthProvider>
    );

    // Mock invalid credential error
    vi.mocked(signInWithEmailAndPassword).mockRejectedValueOnce({
      code: 'auth/invalid-credential',
      message: 'Firebase: Error (auth/invalid-credential).',
    });

    fireEvent.change(screen.getByPlaceholderText('user@example.com'), {
      target: { value: 'wrong@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••••••'), {
      target: { value: 'WrongPass' },
    });

    const signInBtns = screen.getAllByRole('button', { name: /^Sign In$/i });
    fireEvent.click(signInBtns[signInBtns.length - 1]);

    await waitFor(() => {
      expect(
        screen.getByText('Invalid email or password. Please verify your credentials.')
      ).toBeInTheDocument();
    });

    // Mock popup closed by user for Google sign in
    vi.mocked(signInWithPopup).mockRejectedValueOnce({
      code: 'auth/popup-closed-by-user',
      message: 'Popup closed',
    });

    fireEvent.click(screen.getByText('Continue with Google'));

    await waitFor(() => {
      expect(
        screen.getByText('Google Sign-In was closed before completing.')
      ).toBeInTheDocument();
    });
  });

  it('LoginPage opens persona password prompt directly when initialPersonaId is provided', () => {
    render(
      <AuthProvider>
        <LoginPage onLoginSuccess={onLoginSuccess} initialPersonaId="EMP0001" />
      </AuthProvider>
    );

    expect(screen.getByText('Authenticate Demo Persona')).toBeInTheDocument();
    expect(screen.getAllByText(/Priya Singh/i).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByPlaceholderText('Enter password...')).toBeInTheDocument();
  });

  it('LandingPage calls onSelectPersona when persona preview item is clicked', () => {
    const onGetStarted = vi.fn();
    const onLogin = vi.fn();
    const onSelectPersona = vi.fn();

    render(
      <AuthProvider>
        <LandingPage
          onGetStarted={onGetStarted}
          onLogin={onLogin}
          onSelectPersona={onSelectPersona}
        />
      </AuthProvider>
    );

    const operationsItem = screen.getByText('Operations');
    fireEvent.click(operationsItem);

    expect(onSelectPersona).toHaveBeenCalledWith('EMP0001');
  });

  it('LandingPage calls onLogin when header Login button is clicked', () => {
    const onGetStarted = vi.fn();
    const onLogin = vi.fn();

    render(
      <AuthProvider>
        <LandingPage onGetStarted={onGetStarted} onLogin={onLogin} />
      </AuthProvider>
    );

    const loginHeaderBtn = screen.getByRole('button', { name: /^Login$/i });
    fireEvent.click(loginHeaderBtn);

    expect(onLogin).toHaveBeenCalled();
  });

  it('LandingPage interactive demo renders all 4 grounded scenarios without regression', () => {
    const onGetStarted = vi.fn();
    const onLogin = vi.fn();

    render(
      <AuthProvider>
        <LandingPage onGetStarted={onGetStarted} onLogin={onLogin} />
      </AuthProvider>
    );

    // Scenario 1: Check service request
    fireEvent.click(screen.getByText('Check service request'));
    expect(screen.getByText(/Found service request 'SR000365'/i)).toBeInTheDocument();
    expect(screen.getByText('MongoDB Ownership Verified')).toBeInTheDocument();
    expect(screen.getByText('Service Requests Database [SR000365]')).toBeInTheDocument();

    // Reset demo
    fireEvent.click(screen.getByText('Reset'));

    // Scenario 2: Track complaint
    fireEvent.click(screen.getByText('Track complaint'));
    expect(screen.getByText(/Found grievance 'CMP000251'/i)).toBeInTheDocument();
    expect(screen.getByText('Consumer Protection SLA Active')).toBeInTheDocument();
    expect(screen.getByText('Complaints Registry [CMP000251]')).toBeInTheDocument();

    // Reset demo
    fireEvent.click(screen.getByText('Reset'));

    // Scenario 3: Utility procedures
    fireEvent.click(screen.getByText('Utility procedures'));
    expect(screen.getByText(/Mandatory documents for new electricity connection/i)).toBeInTheDocument();
    expect(screen.getByText('Grounded RAG Verified')).toBeInTheDocument();
    expect(screen.getByText('Electricity Connection SOP.pdf (Page 4)')).toBeInTheDocument();

    // Reset demo
    fireEvent.click(screen.getByText('Reset'));

    // Scenario 4: Operational summary
    fireEvent.click(screen.getByText('Operational summary'));
    expect(screen.getByText(/Daily Operational Summary: 6 active outages/i)).toBeInTheDocument();
    expect(screen.getByText('Operational Dispatch Copilot')).toBeInTheDocument();
    expect(screen.getByText('Daily Incident Telemetry (24 Jan 2025)')).toBeInTheDocument();
  });

  it('App navigates from LandingPage to full-screen LoginPage and back to LandingPage', async () => {
    render(<App />);

    // Landing page is displayed initially
    expect(screen.getByText('Your Utility Services.')).toBeInTheDocument();

    // Click Login button in LandingPage header
    const loginBtn = screen.getByRole('button', { name: /^Login$/i });
    fireEvent.click(loginBtn);

    // Transitions to full-screen LoginPage
    expect(screen.getByText('← Back to home')).toBeInTheDocument();
    expect(screen.getByText('TechBharat C2-22')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('user@example.com')).toBeInTheDocument();

    // Click "← Back to home"
    const backBtn = screen.getByRole('button', { name: /← Back to home/i });
    fireEvent.click(backBtn);

    // Transitions back to LandingPage
    expect(screen.getByText('Your Utility Services.')).toBeInTheDocument();
    expect(screen.queryByText('← Back to home')).not.toBeInTheDocument();
  });

  it('App navigates to LoginPage with persona modal pre-opened when persona preview is clicked on LandingPage', async () => {
    render(<App />);

    // Click Operations persona link in LandingPage demo preview
    const operationsItem = screen.getByText('Operations');
    fireEvent.click(operationsItem);

    // Transitions to full-screen LoginPage with Priya Singh password prompt open
    expect(screen.getByText('← Back to home')).toBeInTheDocument();
    expect(screen.getByText('Authenticate Demo Persona')).toBeInTheDocument();
    expect(screen.getAllByText(/Priya Singh/i).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByPlaceholderText('Enter password...')).toBeInTheDocument();

    // Close demo modal with Cancel button
    const cancelBtns = screen.getAllByRole('button', { name: /Cancel/i });
    fireEvent.click(cancelBtns[cancelBtns.length - 1]);

    // Persona dialog is closed, but still on LoginPage AuthCard
    expect(screen.queryByText('Authenticate Demo Persona')).not.toBeInTheDocument();
    expect(screen.getByText('TechBharat C2-22')).toBeInTheDocument();

    // Click "← Back to home"
    const backBtn = screen.getByRole('button', { name: /← Back to home/i });
    fireEvent.click(backBtn);

    // Returns to LandingPage
    expect(screen.getByText('Your Utility Services.')).toBeInTheDocument();
  });
});
