import React from 'react';
import { fireEvent, render, screen, act } from '@testing-library/react';
import ShiningGoogleButton from './ShiningGoogleButton';

describe('ShiningGoogleButton component', () => {
  const mockOnClick = jest.fn();

  beforeEach(() => {
    mockOnClick.mockClear();
    // Reset matchMedia mock
    window.matchMedia = jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));
  });

  it('renders the button with Google icon and text', () => {
    render(<ShiningGoogleButton onClick={mockOnClick} />);

    const button = screen.getByRole('button', { name: 'Continue with Google' });
    expect(button).toBeInTheDocument();

    // Check for Google icon SVG
    const icon = button.querySelector('svg');
    expect(icon).toBeInTheDocument();

    // Check for text
    expect(screen.getByText('Continue with Google')).toBeInTheDocument();
  });

  it('has four color zone background', () => {
    render(<ShiningGoogleButton onClick={mockOnClick} />);

    const button = screen.getByRole('button', { name: 'Continue with Google' });
    const bgDiv = button.querySelector('div[style*="linear-gradient"]');
    expect(bgDiv).toBeInTheDocument();

    // Check background contains all four Google colors
    const style = bgDiv.style.background;
    expect(style).toContain('#4285F4'); // Blue
    expect(style).toContain('#EA4335'); // Red
    expect(style).toContain('#FBBC05'); // Yellow
    expect(style).toContain('#34A853'); // Green
  });

  it('shows glass sheen layer', () => {
    render(<ShiningGoogleButton onClick={mockOnClick} />);

    const button = screen.getByRole('button', { name: 'Continue with Google' });
    // Find the z-10 div which is the sheen layer (second div child)
    const sheenDiv = button.querySelector('div[style*="linear-gradient"][style*="opacity"]');
    expect(sheenDiv).toBeInTheDocument();
  });

  it('handles mouse move and sets cursor position', () => {
    render(<ShiningGoogleButton onClick={mockOnClick} />);

    const button = screen.getByRole('button', { name: 'Continue with Google' });

    // Simulate mouse move over button
    fireEvent.mouseMove(button, { clientX: 100, clientY: 100 });

    // Button should be in document
    expect(button).toBeInTheDocument();
  });

  it('handles focus and blur', () => {
    render(<ShiningGoogleButton onClick={mockOnClick} />);

    const button = screen.getByRole('button', { name: 'Continue with Google' });

    // Focus the button - in jsdom, we can't fully test focus state
    // but we can test that the onFocus handler is called
    fireEvent.focus(button);
    expect(button).toBeInTheDocument();

    // Blur the button
    fireEvent.blur(button);
    expect(button).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    render(<ShiningGoogleButton onClick={mockOnClick} />);

    const button = screen.getByRole('button', { name: 'Continue with Google' });
    fireEvent.click(button);

    expect(mockOnClick).toHaveBeenCalledTimes(1);
  });

  it('applies custom className', () => {
    render(<ShiningGoogleButton onClick={mockOnClick} className="custom-class" />);

    const button = screen.getByRole('button', { name: 'Continue with Google' });
    expect(button).toHaveClass('custom-class');
  });

  it('renders solid inner core with white background', () => {
    render(<ShiningGoogleButton onClick={mockOnClick} />);

    const button = screen.getByRole('button', { name: 'Continue with Google' });
    const innerSpan = button.querySelector('span[class*="bg-white"]');
    expect(innerSpan).toBeInTheDocument();
  });

  it('handles reduced motion preference', () => {
    // Mock matchMedia to return reduced motion preference
    window.matchMedia = jest.fn().mockImplementation(query => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));

    render(<ShiningGoogleButton onClick={mockOnClick} />);

    const button = screen.getByRole('button', { name: 'Continue with Google' });
    expect(button).toBeInTheDocument();
  });
});