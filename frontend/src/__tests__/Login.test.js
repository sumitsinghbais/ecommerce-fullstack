import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Login from '../pages/Login';
import { ShopContext } from '../context/ShopContext';

// Mock context functions
const mockSetToken = jest.fn();
const mockSetUser = jest.fn();
const mockNavigate = jest.fn();

const mockContext = {
  setToken: mockSetToken,
  setUser: mockSetUser,
  navigate: mockNavigate,
  backendUrl: 'http://localhost:5000'
};

const renderLogin = () => {
  return render(
    <ShopContext.Provider value={mockContext}>
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    </ShopContext.Provider>
  );
};

// Mock axios
jest.mock('axios', () => ({
  post: jest.fn(() => Promise.resolve({ data: { success: true, token: 'fake-token', user: { name: 'Test User' } } })),
}));

// Mock GoogleLogin
jest.mock('@react-oauth/google', () => ({
  GoogleLogin: () => <div data-testid="google-login">Google Login</div>,
}));

describe('Login Page', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  test('matches snapshot', () => {
    const { asFragment } = renderLogin();
    expect(asFragment()).toMatchSnapshot();
  });

  test('renders login form correctly', () => {
    renderLogin();
    expect(screen.getByText(/Welcome back/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Email/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Password/i)).toBeInTheDocument();
  });

  test('updates input values on change', () => {
    renderLogin();
    const emailInput = screen.getByPlaceholderText(/Email/i);
    const passwordInput = screen.getByPlaceholderText(/Password/i);

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    expect(emailInput.value).toBe('test@example.com');
    expect(passwordInput.value).toBe('password123');
  });

  test('switches between Login and Sign Up state', () => {
    renderLogin();
    expect(screen.getByText(/Welcome back/i)).toBeInTheDocument();

    const signUpLink = screen.getByText(/Create one/i);
    fireEvent.click(signUpLink);

    expect(screen.getByText(/Create Account/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Name/i)).toBeInTheDocument();
  });
});
