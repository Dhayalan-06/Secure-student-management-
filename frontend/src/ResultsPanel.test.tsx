import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ResultsPanel from './ResultsPanel';
import { api } from './services/api';

jest.mock('./services/api', () => ({
  api: {
    get: jest.fn(() => Promise.resolve({ data: [] })),
    post: jest.fn(() => Promise.reject(new Error('Network error'))),
  },
}));

describe('ResultsPanel Password Gate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders dedicated password form and keeps results locked initially without triggering data requests', () => {
    render(<ResultsPanel students={[{ id: 1, name: 'Alice' }]} canEdit={true} isStudent={false} />);

    // Labeled password field
    expect(screen.getByLabelText(/Semester Results Password/i)).toBeInTheDocument();
    // View results button
    expect(screen.getByRole('button', { name: /view results/i })).toBeInTheDocument();
    // Heading
    expect(screen.getByRole('heading', { name: /semester results/i })).toBeInTheDocument();

    // Data requests must NOT be triggered while locked
    expect(api.get).not.toHaveBeenCalled();
    // Results subjects/mark controls must not be present
    expect(screen.queryByRole('button', { name: /add subject/i })).not.toBeInTheDocument();
  });

  test('shows "Results access hasn’t been configured yet." when verification fails or is unavailable', async () => {
    render(<ResultsPanel students={[{ id: 1, name: 'Alice' }]} canEdit={true} isStudent={false} />);

    const input = screen.getByLabelText(/Semester Results Password/i);
    fireEvent.change(input, { target: { value: 'SecretPass123' } });

    fireEvent.click(screen.getByRole('button', { name: /view results/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Results access hasn’t been configured yet.',
    );
    expect(api.get).not.toHaveBeenCalled();
  });

  test('when unlocked, an editor can open and cancel the subject form', async () => {
    render(
      <ResultsPanel
        students={[{ id: 1, name: 'Alice' }]}
        canEdit={true}
        isStudent={false}
        initialUnlocked={true}
      />,
    );

    // When unlocked, data requests are made
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/results/subjects', expect.anything());
    });

    fireEvent.click(screen.getByRole('button', { name: /add subject/i }));
    expect(screen.getByLabelText('Subject name')).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(screen.queryByLabelText('Subject name')).not.toBeInTheDocument();
  });
});
