import React from 'react';
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LoginPage } from '../pages/LoginPage';
import { AuthProvider, useAuth } from '../contexts/AuthContext';

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

  it('renders application branding, 4 demo persona buttons, and Sign In form', () => {
    render(
      <AuthProvider>
        <LoginPage onLoginSuccess={onLoginSuccess} />
      </AuthProvider>
    );

    // Header branding
    expect(screen.getByText('TechBharat C2-22')).toBeInTheDocument();
    expect(screen.getByText(/Generative AI-Powered Utility Virtual Assistant/i)).toBeInTheDocument();

    // 4 Preserved Demo Personas
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('Priya Singh')).toBeInTheDocument();
    expect(screen.getByText('Amit Kumar')).toBeInTheDocument();
    expect(screen.getByText('Priya Patel')).toBeInTheDocument();

    // Persona IDs and Badges
    expect(screen.getByText(/ID: CUST0001/i)).toBeInTheDocument();
    expect(screen.getByText(/ID: EMP0001/i)).toBeInTheDocument();
    expect(screen.getByText(/ID: ADM0001/i)).toBeInTheDocument();
    expect(screen.getByText(/ID: CUST0010/i)).toBeInTheDocument();

    // Google Sign-In button
    expect(screen.getByText('Continue with Google')).toBeInTheDocument();

    // Sign In form elements
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

    // Switch to Create Account
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
});
