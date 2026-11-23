import { fireEvent, render, screen } from '@testing-library/react';
import ResultsPanel from './ResultsPanel';

jest.mock('./services/api', () => ({ api: { get: jest.fn() } }));

test('an editor can open and cancel the subject form', () => {
  render(<ResultsPanel students={[]} canEdit={true} isStudent={false} />);

  fireEvent.click(screen.getByRole('button', { name: /add subject/i }));
  expect(screen.getByLabelText('Subject name')).toBeVisible();

  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(screen.queryByLabelText('Subject name')).not.toBeInTheDocument();
});
