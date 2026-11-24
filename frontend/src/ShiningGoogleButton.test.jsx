import { fireEvent, render, screen } from '@testing-library/react';
import ShiningGoogleButton from './ShiningGoogleButton';

it('renders the Google mark and activates the supplied handler', () => {
  const onClick = jest.fn();
  render(<ShiningGoogleButton onClick={onClick} className="extra" />);
  const button = screen.getByRole('button', { name: 'Continue with Google' });
  expect(button).toHaveClass('google-chase-btn', 'extra');
  expect(button).toHaveAttribute('type', 'button');
  expect(button.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  fireEvent.click(button);
  expect(onClick).toHaveBeenCalledTimes(1);
});

it('supports a custom label and blocks clicks when disabled', () => {
  const onClick = jest.fn();
  render(<ShiningGoogleButton label="Sign in with Google" disabled onClick={onClick} />);
  const button = screen.getByRole('button', { name: 'Sign in with Google' });
  expect(button).toBeDisabled();
  fireEvent.click(button);
  expect(onClick).not.toHaveBeenCalled();
});
