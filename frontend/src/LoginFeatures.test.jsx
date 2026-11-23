import { act, fireEvent, render, screen } from '@testing-library/react';
import LoginFeatures from './LoginFeatures';

function control(name) {
  return screen.getByRole('button', { name });
}

function advance(milliseconds) {
  act(() => { jest.advanceTimersByTime(milliseconds); });
}

const matchMedia = window.matchMedia;

beforeEach(() => { jest.useFakeTimers(); });

afterEach(() => {
  window.matchMedia = matchMedia;
  jest.useRealTimers();
});

it('honors rapid file changes, pauses on selection and resumes from the selected file', () => {
  render(<LoginFeatures />);
  expect(control('Show Student ID')).toHaveAttribute('aria-current', 'true');
  fireEvent.click(control('Show Profile details'));
  fireEvent.click(control('Show Fee status'));
  fireEvent.click(control('Show Semester results'));
  expect(screen.getByRole('button', { current: true })).toHaveAccessibleName('Show Semester results');

  advance(6000);
  expect(control('Show Semester results')).toHaveAttribute('aria-current', 'true');
  fireEvent.click(control('Play slideshow'));
  advance(5000);
  expect(control('Show Student ID')).toHaveAttribute('aria-current', 'true');
});

it('starts paused with reduced motion and lets the reader select a file', () => {
  window.matchMedia = (query) => ({
    ...matchMedia(query),
    matches: query === '(prefers-reduced-motion: reduce)',
  });
  render(<LoginFeatures />);
  expect(control('Play slideshow')).toBeInTheDocument();
  advance(6000);
  expect(control('Show Student ID')).toHaveAttribute('aria-current', 'true');
  fireEvent.click(control('Show Fee status'));
  expect(control('Show Fee status')).toHaveAttribute('aria-current', 'true');
});
