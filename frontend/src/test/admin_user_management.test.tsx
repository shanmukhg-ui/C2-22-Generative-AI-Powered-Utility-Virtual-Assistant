import React from 'react';
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { UsersPage } from '../pages/UsersPage';
import { AuthProvider, useAuth } from '../contexts/AuthContext';
import { adminApi, authApi } from '../services/api';

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

const mockUsers = [
  {
    user_id: 'ADM0001',
    firebase_uid: 'fb_adm0001',
    name: 'Amit Kumar',
    email: 'amit.kumar@utilityai.org',
    role: 'Administrator',
    department: 'IT Administration',
    city: 'Central Office',
    is_active: true,
    status: 'Active',
    created_at: '2026-11-20T10:00:00Z'
  },
  {
    user_id: 'EMP0001',
    firebase_uid: 'fb_emp0001',
    name: 'Priya Singh',
    email: 'priya.singh@utilityai.org',
    role: 'Employee',
    department: 'Operations',
    city: 'Green Park',
    is_active: true,
    status: 'Active',
    created_at: '2026-11-20T10:00:00Z'
  },
  {
    user_id: 'CUST0001',
    firebase_uid: 'fb_cust0001',
    name: 'John Doe',
    email: 'john.doe@example.com',
    role: 'Customer',
    department: 'Citizen Services',
    city: 'Riverside',
    is_active: true,
    status: 'Active',
    created_at: '2026-11-20T10:00:00Z'
  },
  {
    user_id: 'EMP0002',
    firebase_uid: 'fb_emp0002',
    name: 'Suresh Patel',
    email: 'suresh.patel@utilityai.org',
    role: 'Employee',
    department: 'Field Maintenance',
    city: 'Visakhapatnam',
    is_active: false,
    status: 'Inactive',
    created_at: '2026-11-20T10:00:00Z'
  }
];

vi.mock('../services/api', () => ({
  adminApi: {
    listUsers: vi.fn(),
    listAuditLogs: vi.fn().mockResolvedValue([]),
    createEmployee: vi.fn(),
    createAdministrator: vi.fn(),
    updateUserStatus: vi.fn(),
  },
  authApi: {
    getMe: vi.fn(),
    updateProfile: vi.fn(),
  }
}));

describe('Admin User Management & Provisioning', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (adminApi.listUsers as any).mockResolvedValue(mockUsers);
    (authApi.getMe as any).mockResolvedValue(mockUsers[0]); // Amit Kumar (Admin)
  });

  it('renders user directory table with role badges, status badges, and search/filter bar', async () => {
    render(
      <AuthProvider>
        <UsersPage />
      </AuthProvider>
    );

    // Header & stats
    expect(screen.getByText(/User Management & Directory/i)).toBeInTheDocument();
    expect(screen.getByText('Add Employee')).toBeInTheDocument();
    expect(screen.getByText('Add Administrator')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Amit Kumar')).toBeInTheDocument();
      expect(screen.getByText('Priya Singh')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Suresh Patel')).toBeInTheDocument();
    });

    // Check status badges
    const activeBadges = screen.getAllByText('Active');
    expect(activeBadges.length).toBeGreaterThanOrEqual(3);
    const inactiveBadges = screen.getAllByText('Inactive');
    expect(inactiveBadges.length).toBeGreaterThanOrEqual(1);
  });

  it('filters users by search input', async () => {
    render(
      <AuthProvider>
        <UsersPage />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Priya Singh')).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText(/Search by name, email, ID, or department/i);
    fireEvent.change(searchInput, { target: { value: 'Priya' } });

    expect(screen.getByText('Priya Singh')).toBeInTheDocument();
    expect(screen.queryByText('John Doe')).not.toBeInTheDocument();
    expect(screen.queryByText('Suresh Patel')).not.toBeInTheDocument();
  });

  it('provisions a new Employee via Add Employee modal with activation link and SMTP notice', async () => {
    (adminApi.createEmployee as any).mockResolvedValue({
      success: true,
      message: 'Employee Vikram Rao (EMP0005) provisioned successfully.',
      user: {
        user_id: 'EMP0005',
        name: 'Vikram Rao',
        email: 'vikram.rao@utilityai.org',
        role: 'Employee',
        department: 'Operations',
        is_active: true,
        status: 'Active'
      },
      activation_link: 'https://auth.utilityai.org/reset?code=TOKEN_EMP_123',
      email_delivery: 'not_configured'
    });

    render(
      <AuthProvider>
        <UsersPage />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Amit Kumar')).toBeInTheDocument();
    });

    // Click Add Employee
    fireEvent.click(screen.getByText('Add Employee'));

    expect(screen.getByText('Provision Operations Staff')).toBeInTheDocument();

    // Fill form
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. Arun Sharma/i), { target: { value: 'Vikram Rao' } });
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. arun\.sharma@utilityai\.org/i), {
      target: { value: 'vikram.rao@utilityai.org' }
    });

    // Submit
    fireEvent.click(screen.getByRole('button', { name: /Provision Employee/i }));

    await waitFor(() => {
      expect(adminApi.createEmployee).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Vikram Rao',
          email: 'vikram.rao@utilityai.org',
        })
      );
    });

    // Verify success banner and activation link
    await waitFor(() => {
      expect(screen.getByText(/Employee Vikram Rao \(EMP0005\) provisioned successfully\./i)).toBeInTheDocument();
      expect(screen.getByDisplayValue('https://auth.utilityai.org/reset?code=TOKEN_EMP_123')).toBeInTheDocument();
      expect(screen.getByText(/External SMTP email delivery is not configured/i)).toBeInTheDocument();
    });
  });

  it('provisions a new Administrator with authorization confirmation requirement', async () => {
    (adminApi.createAdministrator as any).mockResolvedValue({
      success: true,
      message: 'Administrator Divya Nair (ADM0002) provisioned successfully.',
      user: {
        user_id: 'ADM0002',
        name: 'Divya Nair',
        email: 'divya.nair@utilityai.org',
        role: 'Administrator',
        is_active: true,
        status: 'Active'
      },
      activation_link: 'https://auth.utilityai.org/reset?code=TOKEN_ADM_999',
      email_delivery: 'not_configured'
    });

    render(
      <AuthProvider>
        <UsersPage />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Amit Kumar')).toBeInTheDocument();
    });

    // Click Add Administrator
    fireEvent.click(screen.getByText('Add Administrator'));

    expect(screen.getByText('Provision System Administrator')).toBeInTheDocument();
    expect(screen.getByText(/Administrative Access Warning/i)).toBeInTheDocument();

    // Fill form
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. Ramesh Chandra/i), { target: { value: 'Divya Nair' } });
    fireEvent.change(screen.getByPlaceholderText(/e\.g\. ramesh\.chandra@utilityai\.org/i), {
      target: { value: 'divya.nair@utilityai.org' }
    });

    // The submit button must be disabled until the confirmation checkbox is checked
    const submitBtn = screen.getByRole('button', { name: /Provision Administrator/i });
    expect(submitBtn).toBeDisabled();

    // Check confirmation checkbox
    const confirmCheckbox = screen.getByRole('checkbox');
    fireEvent.click(confirmCheckbox);
    expect(submitBtn).not.toBeDisabled();

    // Submit
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(adminApi.createAdministrator).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Divya Nair',
          email: 'divya.nair@utilityai.org',
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByText(/Administrator Divya Nair \(ADM0002\) provisioned successfully\./i)).toBeInTheDocument();
      expect(screen.getByDisplayValue('https://auth.utilityai.org/reset?code=TOKEN_ADM_999')).toBeInTheDocument();
    });
  });

  it('guards against deactivating the active administrator self account', async () => {
    render(
      <AuthProvider>
        <UsersPage />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Amit Kumar')).toBeInTheDocument();
    });

    // Search for Amit Kumar (logged in administrator)
    const searchInput = screen.getByPlaceholderText(/Search by name, email, ID, or department/i);
    fireEvent.change(searchInput, { target: { value: 'Amit Kumar' } });

    // Since Amit Kumar is the active admin, self-account protection is rendered
    expect(screen.getByText('Self Account')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Deactivate$/i })).not.toBeInTheDocument();
  });

  it('deactivates an active user through confirmation modal', async () => {
    (adminApi.updateUserStatus as any).mockResolvedValue({
      success: true,
      message: 'User EMP0001 status updated to Inactive',
      user: { ...mockUsers[1], is_active: false, status: 'Inactive' }
    });

    render(
      <AuthProvider>
        <UsersPage />
      </AuthProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Priya Singh')).toBeInTheDocument();
    });

    // Filter by search for Priya Singh
    const searchInput = screen.getByPlaceholderText(/Search by name, email, ID, or department/i);
    fireEvent.change(searchInput, { target: { value: 'Priya Singh' } });

    // Find Deactivate button for Priya Singh
    const deactivateBtn = screen.getByRole('button', { name: /^Deactivate$/i });
    fireEvent.click(deactivateBtn);

    // Modal opens
    expect(screen.getByText('Deactivate Account')).toBeInTheDocument();

    // Confirm
    const confirmBtn = screen.getByRole('button', { name: /Confirm Deactivation/i });
    fireEvent.click(confirmBtn);

    await waitFor(() => {
      expect(adminApi.updateUserStatus).toHaveBeenCalledWith(
        'EMP0001',
        expect.objectContaining({ is_active: false })
      );
    });
  });
});
