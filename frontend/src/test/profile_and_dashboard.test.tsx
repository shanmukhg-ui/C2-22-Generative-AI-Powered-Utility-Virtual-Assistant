import React from 'react';
import '@testing-library/jest-dom/vitest';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProfilePage } from '../pages/ProfilePage';
import { CustomerDashboard } from '../pages/CustomerDashboard';
import { AccountSettings } from '../pages/settings/Account';
import { useAuth } from '../contexts/AuthContext';
import { SettingsProvider } from '../contexts/SettingsContext';
import { requestsApi, complaintsApi, authApi } from '../services/api';
import { User } from '../types';

vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
  AuthProvider: ({ children }: any) => <>{children}</>,
}));

vi.mock('../services/api', () => ({
  authApi: {
    getMe: vi.fn(),
    updateProfile: vi.fn().mockResolvedValue({ success: true, user: {}, message: 'Profile updated' }),
  },
  requestsApi: {
    listRequests: vi.fn(),
  },
  complaintsApi: {
    listComplaints: vi.fn(),
  },
}));

describe('Customer Profile, Dashboard & Settings Isolation Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  const renderWithAuth = (ui: React.ReactNode, user: Partial<User> | null, updateUserProfile = vi.fn()) => {
    vi.mocked(useAuth).mockReturnValue({
      user: user as User,
      firebaseUser: user ? ({ uid: user.firebase_uid, email: user.email } as any) : null,
      loading: false,
      isEmailVerified: true,
      loginWithEmail: vi.fn(),
      registerWithEmail: vi.fn(),
      loginWithGoogle: vi.fn(),
      resetPassword: vi.fn(),
      sendVerificationEmail: vi.fn(),
      switchPersona: vi.fn(),
      updateUserProfile,
      refreshUser: vi.fn(),
      logout: vi.fn(),
    });

    return render(
      <SettingsProvider>
        {ui}
      </SettingsProvider>
    );
  };

  // -------------------------------------------------------------
  // Test A & B: Profile Initialization and Form Behavior
  // -------------------------------------------------------------
  describe('Test A & B: New Customer Profile Form & Defaults', () => {
    const newCustomerUser: Partial<User> = {
      user_id: 'CUST0101',
      firebase_uid: 'firebase_new_uid_123',
      name: 'victor_2',
      email: 'victorkomal.2@gmail.com',
      role: 'Customer',
      department: 'Citizen',
      city: 'Vizag',
      phone: null as any,
      dob: null as any,
      gender: null as any,
      address: null as any,
      meter_number: null as any,
      emergency_contact: null as any,
      email_verified: true,
    };

    it('initializes new customer profile with clean empty fields and neutral placeholders', () => {
      renderWithAuth(<ProfilePage />, newCustomerUser);

      // Full Name & Email are preserved from registration
      const nameInput = screen.getByDisplayValue('victor_2');
      expect(nameInput).toBeInTheDocument();
      const emailInput = screen.getByDisplayValue('victorkomal.2@gmail.com');
      expect(emailInput).toBeInTheDocument();

      // Phone Number: empty value, neutral placeholder
      const phoneInput = screen.getByPlaceholderText('Enter your mobile number') as HTMLInputElement;
      expect(phoneInput).toBeInTheDocument();
      expect(phoneInput.value).toBe('');
      expect(phoneInput).not.toHaveAttribute('required');

      // Emergency Contact: empty value, neutral placeholder
      const emergencyInput = screen.getByPlaceholderText('Enter emergency contact number') as HTMLInputElement;
      expect(emergencyInput).toBeInTheDocument();
      expect(emergencyInput.value).toBe('');

      // Utility Department: unselected empty placeholder, NOT automatically "Electricity Distribution Corporation"
      const deptSelect = screen.getByDisplayValue('Select Primary Utility Department') as HTMLSelectElement;
      expect(deptSelect).toBeInTheDocument();
      expect(deptSelect.value).toBe('');

      // Gender: unselected empty placeholder
      const genderSelect = screen.getByDisplayValue('Select Gender') as HTMLSelectElement;
      expect(genderSelect).toBeInTheDocument();
      expect(genderSelect.value).toBe('');

      // Service Address: empty and not required
      const addressInput = screen.getByPlaceholderText('Plot number, Street, Ward, Landmark') as HTMLInputElement;
      expect(addressInput.value).toBe('');
      expect(addressInput).not.toHaveAttribute('required');

      // Verification that fabricated demo values do NOT appear
      expect(screen.queryByDisplayValue('+91 98765 43210')).not.toBeInTheDocument();
      expect(screen.queryByPlaceholderText('+91 98765 43210')).not.toBeInTheDocument();
      expect(screen.queryByPlaceholderText('+91 98765 12345 (Family Member)')).not.toBeInTheDocument();
    });

    it('preserves an existing valid utility selection for a returning user', () => {
      const existingUser: Partial<User> = {
        ...newCustomerUser,
        department: 'Water Supply & Sewerage Board',
        phone: '+91 91234 56789',
        gender: 'Female',
      };

      renderWithAuth(<ProfilePage />, existingUser);

      // Utility selection is preserved
      expect(screen.getByDisplayValue('Water Supply & Sewerage Board')).toBeInTheDocument();
      // Phone is preserved
      expect(screen.getByDisplayValue('+91 91234 56789')).toBeInTheDocument();
      // Gender is preserved
      expect(screen.getByDisplayValue('Female')).toBeInTheDocument();
    });

    it('allows partial profile update without requiring optional fields', async () => {
      const mockUpdate = vi.fn().mockResolvedValue({});
      renderWithAuth(<ProfilePage />, newCustomerUser, mockUpdate);

      // User enters only a phone number and leaves DOB and Address empty
      const phoneInput = screen.getByPlaceholderText('Enter your mobile number');
      fireEvent.change(phoneInput, { target: { value: '+91 99887 76655' } });

      const saveBtn = screen.getByRole('button', { name: /Save Profile Changes/i });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(mockUpdate).toHaveBeenCalledTimes(1);
      });

      const sentData = mockUpdate.mock.calls[0][0];
      expect(sentData.phone).toBe('+91 99887 76655');
      expect(sentData.name).toBe('victor_2');
      expect(sentData.email).toBe('victorkomal.2@gmail.com');
      // Department was left on placeholder, so it was not saved as a utility department
      expect(sentData.department).toBeUndefined();
    });
  });

  // -------------------------------------------------------------
  // Test C: Customer Dashboard Empty State
  // -------------------------------------------------------------
  describe('Test C: Customer Dashboard Empty State for Newly Registered Users', () => {
    it('displays 0 counts and empty state messages with NO dummy ticket IDs when customer has 0 records', async () => {
      vi.mocked(requestsApi.listRequests).mockResolvedValue({ records: [], requests: [], total: 0, total_pages: 0, limit: 8, offset: 0 });
      vi.mocked(complaintsApi.listComplaints).mockResolvedValue({ records: [], complaints: [], total: 0, total_pages: 0, limit: 8, offset: 0 });

      const customer: User = {
        user_id: 'CUST0101',
        firebase_uid: 'firebase_new_uid_123',
        name: 'victor_2',
        email: 'victorkomal.2@gmail.com',
        role: 'Customer',
      };

      renderWithAuth(
        <CustomerDashboard
          onNavigate={vi.fn()}
          onOpenNewRequest={vi.fn()}
          onOpenNewComplaint={vi.fn()}
        />,
        customer
      );

      // Wait for data load
      await waitFor(() => {
        expect(requestsApi.listRequests).toHaveBeenCalledWith({ customer_id: 'CUST0101', limit: 8 });
      });

      // Verify KPI counts are all 0
      const totalReqCard = screen.getByText('Total Requests').closest('.rounded-2xl');
      expect(totalReqCard).toHaveTextContent('0');

      const activeReqCard = screen.getByText('Active Requests').closest('.rounded-2xl');
      expect(activeReqCard).toHaveTextContent('0');

      const resolvedReqCard = screen.getByText('Resolved Requests').closest('.rounded-2xl');
      expect(resolvedReqCard).toHaveTextContent('0');

      const openComplaintsCard = screen.getByText('Open Complaints').closest('.rounded-2xl');
      expect(openComplaintsCard).toHaveTextContent('0');

      // Verify Empty State messages are rendered
      expect(screen.getByText('No service requests yet')).toBeInTheDocument();
      expect(screen.getByText('No complaints logged')).toBeInTheDocument();

      // Verify that NO dummy ticket IDs appear in the DOM
      expect(screen.queryByText('SR10245')).not.toBeInTheDocument();
      expect(screen.queryByText('SR10218')).not.toBeInTheDocument();
      expect(screen.queryByText('SR10197')).not.toBeInTheDocument();
      expect(screen.queryByText('CP9056')).not.toBeInTheDocument();
      expect(screen.queryByText('CP9042')).not.toBeInTheDocument();

      // Verify GPS Telemetry banner with dummy ticket is not rendered
      expect(screen.queryByText(/Technician Rajesh Kumar is 1.8 km away/i)).not.toBeInTheDocument();
    });
  });

  // -------------------------------------------------------------
  // Test D: Customer Dashboard with Actual Records
  // -------------------------------------------------------------
  describe('Test D: Customer Dashboard with Real Customer Records', () => {
    it('displays real requests, real complaints, and accurate KPI counts', async () => {
      const realRequests = [
        {
          request_id: 'SR500101',
          customer_id: 'CUST0101',
          request_type: 'Solar Rooftop Grid Sync',
          status: 'In Progress',
          utility: 'Electricity',
          department: 'Electricity Department',
          priority: 'High',
          created_at: '2026-11-21',
        },
        {
          request_id: 'SR500102',
          customer_id: 'CUST0101',
          request_type: 'Meter Calibration',
          status: 'Completed',
          utility: 'Electricity',
          department: 'Electricity Department',
          priority: 'Low',
          created_at: '2026-11-20',
        },
      ];

      const realComplaints = [
        {
          complaint_id: 'CP700101',
          customer_id: 'CUST0101',
          category: 'Meter Reading Error',
          status: 'Open',
          utility: 'Electricity',
          department: 'Electricity Department',
          priority: 'Medium',
          created_at: '2026-11-21',
        },
      ];

      vi.mocked(requestsApi.listRequests).mockResolvedValue({
        records: realRequests,
        requests: realRequests,
        total: 2,
        total_pages: 1,
        limit: 8,
        offset: 0,
      });

      vi.mocked(complaintsApi.listComplaints).mockResolvedValue({
        records: realComplaints,
        complaints: realComplaints,
        total: 1,
        total_pages: 1,
        limit: 8,
        offset: 0,
      });

      const customer: User = {
        user_id: 'CUST0101',
        firebase_uid: 'firebase_new_uid_123',
        name: 'victor_2',
        email: 'victorkomal.2@gmail.com',
        role: 'Customer',
      };

      renderWithAuth(
        <CustomerDashboard
          onNavigate={vi.fn()}
          onOpenNewRequest={vi.fn()}
          onOpenNewComplaint={vi.fn()}
        />,
        customer
      );

      await waitFor(() => {
        expect(screen.getByText('SR500101')).toBeInTheDocument();
      });

      // Verify real records render
      expect(screen.getByText('Solar Rooftop Grid Sync')).toBeInTheDocument();
      expect(screen.getByText('SR500102')).toBeInTheDocument();
      expect(screen.getByText('Meter Calibration')).toBeInTheDocument();
      expect(screen.getByText('CP700101')).toBeInTheDocument();
      expect(screen.getByText('Meter Reading Error')).toBeInTheDocument();

      // Verify accurate counts
      const totalReqCard = screen.getByText('Total Requests').closest('.rounded-2xl');
      expect(totalReqCard).toHaveTextContent('2');

      const activeReqCard = screen.getByText('Active Requests').closest('.rounded-2xl');
      expect(activeReqCard).toHaveTextContent('1');

      const resolvedReqCard = screen.getByText('Resolved Requests').closest('.rounded-2xl');
      expect(resolvedReqCard).toHaveTextContent('1');

      const openCompCard = screen.getByText('Open Complaints').closest('.rounded-2xl');
      expect(openCompCard).toHaveTextContent('1');
    });
  });

  // -------------------------------------------------------------
  // Test E: Settings & Account Defaults
  // -------------------------------------------------------------
  describe('Test E: Account Settings Clean Phone Default', () => {
    it('initializes contact phone as empty string without fabricating a phone number', () => {
      const userWithoutPhone: User = {
        user_id: 'CUST0101',
        firebase_uid: 'firebase_new_uid_123',
        name: 'victor_2',
        email: 'victorkomal.2@gmail.com',
        role: 'Customer',
      };

      renderWithAuth(<AccountSettings />, userWithoutPhone);

      const phoneInput = screen.getByPlaceholderText('Enter your mobile number') as HTMLInputElement;
      expect(phoneInput.value).toBe('');
      expect(screen.queryByDisplayValue('+91 98765 43210')).not.toBeInTheDocument();
    });

    it('preserves an existing saved phone number in account settings', () => {
      const userWithPhone: User = {
        user_id: 'CUST0101',
        firebase_uid: 'firebase_new_uid_123',
        name: 'victor_2',
        email: 'victorkomal.2@gmail.com',
        role: 'Customer',
        phone: '+91 98765 99999',
      };

      renderWithAuth(<AccountSettings />, userWithPhone);

      const phoneInput = screen.getByDisplayValue('+91 98765 99999');
      expect(phoneInput).toBeInTheDocument();
    });
  });
});
