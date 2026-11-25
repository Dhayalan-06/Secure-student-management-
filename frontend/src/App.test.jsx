import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import { api } from './services/api';

jest.mock('./services/api', () => ({ api: { get: jest.fn(), post: jest.fn(), patch: jest.fn(), delete: jest.fn() } }));

const TOTAL_PAGES = 7;
const LIMIT = 100;
const TOTAL_STUDENTS = TOTAL_PAGES * LIMIT; // 700

function studentPage(page) {
  const start = (page - 1) * LIMIT + 1;
  const end = Math.min(start + LIMIT - 1, TOTAL_STUDENTS);
  const records = [];
  for (let id = start; id <= end; id++) {
    records.push({ id, name: `Student ${id}`, email: `s${id}@example.edu`, department: 'Computer Science', age: 20 });
  }
  return { data: { data: records, page, limit: LIMIT, total: TOTAL_STUDENTS, totalPages: TOTAL_PAGES } };
}

function renderAppAsAdmin() {
  localStorage.setItem('accessToken', 'token');
  api.get.mockResolvedValue({ data: { user: { id: 1, name: 'Admin', email: 'admin@example.edu', role: 'ADMIN' } } });
  return render(<BrowserRouter><App /></BrowserRouter>);
}

beforeEach(() => {
  jest.resetAllMocks();
  localStorage.removeItem('accessToken');
});

afterEach(() => {
  localStorage.removeItem('accessToken');
});

it('loads all paginated student pages for the Add Fee dropdown and matches the API total', async () => {
  renderAppAsAdmin();
  await waitFor(() => expect(screen.getByText('Campus Registry')).toBeInTheDocument());

  // Open the Fees workspace page, then Add Fee.
  fireEvent.click(screen.getByRole('link', { name: /Fee ledger/i }));
  const addFee = await screen.findByRole('button', { name: /\+ Add Fee/ });
  fireEvent.click(addFee);

  await waitFor(() => expect(screen.getByText('Loading students…')).toBeInTheDocument());
  await waitFor(() => expect(screen.queryByText('Loading students…')).not.toBeInTheDocument());
  // Last-page student must be selectable.
  await waitFor(() => expect(screen.getByRole('option', { name: /Student 700 \(#700\)/ })).toBeInTheDocument());

  // All 7 pages requested; the dashboard also fetches page 1 once, so page 1 appears twice.
  const studentCalls = api.get.mock.calls.filter(([url]) => url === '/students');
  const pages = studentCalls.map(([, cfg]) => cfg.params.page);
  expect(pages.filter((p) => p !== 1).sort((a, b) => a - b)).toEqual([2, 3, 4, 5, 6, 7]);
  expect(pages.filter((p) => p === 1).length).toBeGreaterThanOrEqual(1);
  expect(studentCalls.every(([, cfg]) => cfg.params.limit === LIMIT)).toBe(true);

  // Unique selectable student IDs equal the API total (700), excluding the placeholder.
  const options = screen.getAllByRole('option');
  const selectable = options.filter((o) => !o.disabled && o.value !== '');
  expect(selectable.length).toBe(TOTAL_STUDENTS);

  // Select a student from the last page and submit; POST carries that student's ID.
  fireEvent.change(screen.getByLabelText('Student'), { target: { value: '700' } });
  fireEvent.change(screen.getByLabelText('Fee Description'), { target: { value: 'Semester fee' } });
  fireEvent.change(screen.getByLabelText('Amount (₹)'), { target: { value: '500' } });
  fireEvent.change(screen.getByLabelText('Due Date'), { target: { value: '2026-12-01' } });
  api.post.mockResolvedValue({});
  fireEvent.click(screen.getByRole('button', { name: /Create Pending Fee/ }));
  await waitFor(() => expect(api.post).toHaveBeenCalledWith('/fees', expect.objectContaining({ studentId: 700 })));
});

it('shows an error with retry when a page fails instead of a partial list', async () => {
  renderAppAsAdmin();
  await waitFor(() => expect(screen.getByText('Campus Registry')).toBeInTheDocument());
  fireEvent.click(screen.getByRole('link', { name: /Fee ledger/i }));
  const addFee = await screen.findByRole('button', { name: /\+ Add Fee/ });
  fireEvent.click(addFee);

  api.get.mockResolvedValueOnce(studentPage(1)).mockRejectedValueOnce(new Error('boom'));

  await waitFor(() => expect(screen.getByText('Loading students…')).toBeInTheDocument());
  await waitFor(() => expect(screen.getByText('Failed to load students')).toBeInTheDocument());
  expect(screen.getByRole('option', { disabled: true, name: /Failed to load students/ })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Retry/ })).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: /Retry/ }));
  api.get.mockResolvedValue(studentPage(1));
  await waitFor(() => expect(screen.queryByText('Failed to load students')).not.toBeInTheDocument());
  await waitFor(() => expect(screen.queryByText('Loading students…')).not.toBeInTheDocument());
});
