import React from 'react';
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LoginPage } from '../pages/LoginPage';
import { LandingPage } from '../pages/LandingPage';
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
        <LoginPage onLoginSuccess={onLoginSuccess} initialStep="direct" />
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
        <LoginPage onLoginSuccess={onLoginSuccess} initialStep="direct" />
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
        <LoginPage onLoginSuccess={onLoginSuccess} initialStep="direct" />
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
        <LoginPage onLoginSuccess={onLoginSuccess} initialStep="direct" />
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
        <LoginPage onLoginSuccess={onLoginSuccess} initialStep="direct" />
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
        <LoginPage onLoginSuccess={onLoginSuccess} initialStep="direct" />
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
        <LoginPage onLoginSuccess={onLoginSuccess} initialStep="direct" />
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
});
