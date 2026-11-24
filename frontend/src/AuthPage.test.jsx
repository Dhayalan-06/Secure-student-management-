import { useState } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import AuthPage from './AuthPage';

// Mock Google OAuth
jest.mock('@react-oauth/google', () => ({
  GoogleLogin: () => <button type="button">Mock Google Login</button>,
}));

describe('AuthPage component', () => {
  const defaultProps = {
    mode: 'login',
    email: '',
    setEmail: jest.fn(),
    password: '',
    setPassword: jest.fn(),
    registrationProfile: { name: '', department: '', age: '', cgpa: '' },
    setRegistrationProfile: jest.fn(),
    rememberMe: false,
    setRememberMe: jest.fn(),
    busy: false,
    error: '',
    message: '',
    setError: jest.fn(),
    setMessage: jest.fn(),
    onSubmit: jest.fn((e) => e.preventDefault()),
    onSubmitGoogleCredential: jest.fn(),
    isDark: false,
  };

  it('renders login view matching the design specifications', () => {
    render(
      <BrowserRouter>
        <AuthPage {...defaultProps} />
      </BrowserRouter>
    );

    // Verify header and subheader
    expect(screen.getByRole('heading', { level: 1, name: 'Login' })).toBeInTheDocument();
    expect(screen.getByText('Access your student records.')).toBeInTheDocument();

    // Verify fields
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();

    // Verify remember me
    expect(screen.getByText('Remember me')).toBeInTheDocument();

    // Verify login button
    expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument();

    expect(screen.getByRole('heading', { name: 'Find your student ID.' })).toBeInTheDocument();
    expect(screen.getByText('#1042')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Show Fee status' }));
    expect(screen.getByRole('heading', { name: 'Check your fees.' })).toBeInTheDocument();
    expect(screen.getByText('₹18,000 · Pending')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Play slideshow' })).toBeInTheDocument();
  });

  it('switches the campus between day and night while keeping the typed email', () => {
    function LoginWithTheme() {
      const [email, setEmail] = useState('');
      const [isDark, setIsDark] = useState(false);
      return <AuthPage {...defaultProps} email={email} setEmail={setEmail} isDark={isDark}
        onToggleTheme={() => setIsDark((current) => !current)} />;
    }

    render(<BrowserRouter><LoginWithTheme /></BrowserRouter>);
    const email = screen.getByLabelText('Email');
    fireEvent.change(email, { target: { value: 'student@example.edu' } });
    const themeSwitch = screen.getByRole('switch', { name: 'Dark mode' });
    expect(screen.getByRole('main')).toHaveAttribute('data-campus-lighting', 'day');
    fireEvent.click(themeSwitch);
    expect(screen.getByRole('main')).toHaveAttribute('data-campus-lighting', 'night');
    expect(screen.getByLabelText('Email')).toHaveValue('student@example.edu');
    fireEvent.click(themeSwitch);
    expect(screen.getByRole('main')).toHaveAttribute('data-campus-lighting', 'day');
    expect(screen.getByLabelText('Email')).toBe(email);
  });

  it('toggles password visibility when the eye button is clicked', () => {
    render(
      <BrowserRouter>
        <AuthPage {...defaultProps} password="secretPassword123" />
      </BrowserRouter>
    );

    const passwordInput = screen.getByPlaceholderText('••••••••');
    expect(passwordInput).toHaveAttribute('type', 'password');

    const toggleButton = screen.getByLabelText('Show password');
    fireEvent.click(toggleButton);

    expect(passwordInput).toHaveAttribute('type', 'text');
    expect(screen.getByLabelText('Hide password')).toBeInTheDocument();
  });

  it('renders registration fields in register mode', () => {
    render(
      <BrowserRouter>
        <AuthPage {...defaultProps} mode="register" />
      </BrowserRouter>
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Create an account' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('John Doe')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Computer Science')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('20')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('8.50')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create Account' })).toBeInTheDocument();
  });
});
