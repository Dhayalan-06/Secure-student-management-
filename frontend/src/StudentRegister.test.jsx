import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import StudentRegister from './StudentRegister';
import { api } from './services/api';

jest.mock('./student-register.css', () => ({}));
jest.mock('./services/api', () => ({ api: { get: jest.fn(), patch: jest.fn(), post: jest.fn(), delete: jest.fn() } }));

const person = {
  id: 80, name: 'Ananya Rao', email: 'ananya@example.edu', department: 'Computer Science',
  registrationNumber: null, age: 20, cgpa: 8.5,
};

function listResponse(total, page = 1, limit = 12) {
  const start = (page - 1) * limit;
  const records = [];
  for (let i = start; i < Math.min(start + limit, total); i++) {
    records.push({ ...person, id: i + 1, name: `Student ${i + 1}` });
  }
  return { data: { data: records, total, page, limit, totalPages: Math.ceil(total / limit) } };
}
beforeEach(() => {
  jest.resetAllMocks();
  api.get.mockResolvedValue({ data: { data: [person], total: 1 } });
  window.confirm = jest.fn(() => true);
});

it('saves a registration number with the edited record and notifies the dashboard', async () => {
  const refresh = jest.fn();
  api.patch.mockResolvedValue({});
  render(<StudentRegister role="ADMIN" onRecordsChanged={refresh} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Edit Ananya Rao' }));
  fireEvent.change(screen.getByLabelText('Registration number (optional)'), { target: { value: 'cs/24-178' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save record' }));

  await waitFor(() => expect(api.patch).toHaveBeenCalledWith('/students/80', expect.objectContaining({ registrationNumber: 'CS/24-178' })));
  expect(refresh).toHaveBeenCalledTimes(1);
});

it('keeps identifiers read-only for staff and excludes them from updates', async () => {
  api.patch.mockResolvedValue({});
  render(<StudentRegister role="STAFF" onRecordsChanged={jest.fn()} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Edit Ananya Rao' }));
  expect(screen.getByLabelText('Registration number (optional)')).toHaveAttribute('readonly');
  expect(screen.getByLabelText('Email address')).toHaveAttribute('readonly');
  fireEvent.click(screen.getByRole('button', { name: 'Save record' }));
  await waitFor(() => expect(api.patch).toHaveBeenCalled());
  expect(api.patch.mock.calls[0][1]).not.toHaveProperty('registrationNumber');
  expect(api.patch.mock.calls[0][1]).not.toHaveProperty('email');
});

it('shows the registration number on the personal record without edit controls', async () => {
  api.get.mockResolvedValue({ data: { data: [{ ...person, registrationNumber: 'CS-024' }], total: 1 } });
  render(<StudentRegister role="STUDENT" onRecordsChanged={jest.fn()} />);
  expect(await screen.findByText('CS-024')).toBeVisible();
  expect(screen.queryByRole('button', { name: /Edit|Delete|Add student/ })).not.toBeInTheDocument();
});

it('requests the next server page and resets to page one when searching', async () => {
  api.get.mockResolvedValue({ data: { data: [person], total: 13 } });
  render(<StudentRegister role="ADMIN" onRecordsChanged={jest.fn()} />);
  fireEvent.click(await screen.findByRole('button', { name: 'Next page' }));
  await waitFor(() => expect(api.get).toHaveBeenLastCalledWith('/students', expect.objectContaining({ params: { page: 2, limit: 12, search: undefined } })));
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: ' CS-024 ' } });
  await waitFor(() => expect(api.get).toHaveBeenLastCalledWith('/students', expect.objectContaining({ params: { page: 1, limit: 12, search: 'CS-024' } })));
});

// --- New pagination tests ---

it('changes page size from 12 to 10 and sends limit=10', async () => {
  api.get.mockResolvedValue(listResponse(66, 1, 10));
  render(<StudentRegister role="ADMIN" onRecordsChanged={jest.fn()} />);

  const input = screen.getByLabelText('Rows per page');
  fireEvent.change(input, { target: { value: '10' } });
  fireEvent.blur(input);
  await waitFor(() => expect(api.get).toHaveBeenLastCalledWith('/students', expect.objectContaining({ params: { page: 1, limit: 10, search: undefined } })));
});

it('calculates page count from the API total and renders numbered navigation', async () => {
  api.get.mockResolvedValue(listResponse(126, 1, 10));
  render(<StudentRegister role="ADMIN" onRecordsChanged={jest.fn()} />);

  const input = screen.getByLabelText('Rows per page');
  fireEvent.change(input, { target: { value: '10' } });
  fireEvent.blur(input);
  await waitFor(() => expect(api.get).toHaveBeenLastCalledWith('/students', expect.objectContaining({ params: { page: 1, limit: 10 } })));

  await waitFor(() => expect(screen.getByRole('button', { name: 'Page 3' })).toBeInTheDocument());
  expect(screen.getByRole('button', { name: 'Page 1' })).toHaveAttribute('aria-current', 'page');
  expect(screen.getByRole('button', { name: 'Page 13' })).toBeInTheDocument();
  expect(screen.getByText('…')).toBeInTheDocument();
  // First and last always reachable.
  expect(screen.getByRole('button', { name: 'Page 1' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Page 13' })).toBeInTheDocument();
});

it('disables Previous on the first page and Next on the last page', async () => {
  api.get.mockResolvedValue(listResponse(26, 1, 10));
  render(<StudentRegister role="ADMIN" onRecordsChanged={jest.fn()} />);

  await waitFor(() => expect(screen.getByRole('button', { name: 'Next page' })).toBeInTheDocument());
  expect(screen.getByRole('button', { name: 'Previous page' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Next page' })).not.toBeDisabled();

  fireEvent.click(await screen.findByRole('button', { name: 'Page 3' }));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Page 3' })).toHaveAttribute('aria-current', 'page'));
  expect(screen.getByRole('button', { name: 'Previous page' })).not.toBeDisabled();
  expect(screen.getByRole('button', { name: 'Next page' })).toBeDisabled();
});

it('reaches a later page including records beyond the first 100', async () => {
  api.get.mockResolvedValue(listResponse(150, 8, 20));
  render(<StudentRegister role="ADMIN" onRecordsChanged={jest.fn()} />);

  const input = screen.getByLabelText('Rows per page');
  fireEvent.change(input, { target: { value: '20' } });
  fireEvent.blur(input);
  await waitFor(() => expect(api.get).toHaveBeenLastCalledWith('/students', expect.objectContaining({ params: { page: 1, limit: 20 } })));

  fireEvent.click(await screen.findByRole('button', { name: 'Page 8' }));
  await waitFor(() => expect(api.get).toHaveBeenLastCalledWith('/students', expect.objectContaining({ params: { page: 8, limit: 20 } })));
  expect(screen.getByRole('button', { name: 'Page 8' })).toHaveAttribute('aria-current', 'page');
  expect(screen.getByText('Student 141')).toBeInTheDocument();
});

it('search resets to page 1 while retaining the chosen page size', async () => {
  api.get.mockResolvedValue(listResponse(66, 1, 10));
  render(<StudentRegister role="ADMIN" onRecordsChanged={jest.fn()} />);

  const input = screen.getByLabelText('Rows per page');
  fireEvent.change(input, { target: { value: '10' } });
  fireEvent.blur(input);
  await waitFor(() => expect(api.get).toHaveBeenLastCalledWith('/students', expect.objectContaining({ params: { page: 1, limit: 10 } })));

  fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'CS-024' } });
  await waitFor(() => expect(api.get).toHaveBeenLastCalledWith('/students', expect.objectContaining({ params: { page: 1, limit: 10, search: 'CS-024' } })));
});

it('does not request limit 0 for a temporarily empty input', async () => {
  api.get.mockResolvedValue(listResponse(1));
  render(<StudentRegister role="ADMIN" onRecordsChanged={jest.fn()} />);

  const input = screen.getByLabelText('Rows per page');
  fireEvent.change(input, { target: { value: '' } });
  fireEvent.blur(input);
  await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('whole number'));
  // No new fetch with limit 0; still 12 from initial load.
  expect(api.get).toHaveBeenLastCalledWith('/students', expect.objectContaining({ params: expect.objectContaining({ page: 1, limit: 12 }) }));
});

it('rejects decimal, negative, and greater-than-100 values with a clear message', async () => {
  api.get.mockResolvedValue({ data: { data: [person], total: 1, page: 1, limit: 12, totalPages: 1 } });
  render(<StudentRegister role="ADMIN" onRecordsChanged={jest.fn()} />);

  const input = screen.getByLabelText('Rows per page');
  fireEvent.change(input, { target: { value: '10.5' } });
  fireEvent.blur(input);
  await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('whole number'));
  expect(api.get).toHaveBeenLastCalledWith('/students', expect.objectContaining({ params: expect.objectContaining({ limit: 12 }) }));

  fireEvent.change(input, { target: { value: '-3' } });
  fireEvent.blur(input);
  await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('whole number'));

  fireEvent.change(input, { target: { value: '101' } });
  fireEvent.blur(input);
  await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('whole number'));
});

it('commits a valid page size on Enter', async () => {
  api.get.mockResolvedValue(listResponse(66, 1, 8));
  render(<StudentRegister role="ADMIN" onRecordsChanged={jest.fn()} />);

  const input = screen.getByLabelText('Rows per page');
  fireEvent.change(input, { target: { value: '8' } });
  fireEvent.keyDown(input, { key: 'Enter' });
  await waitFor(() => expect(api.get).toHaveBeenLastCalledWith('/students', expect.objectContaining({ params: { page: 1, limit: 8 } })));
});

it('omits numbered navigation when there is only one page', async () => {
  api.get.mockResolvedValue(listResponse(1, 1, 12));
  render(<StudentRegister role="ADMIN" onRecordsChanged={jest.fn()} />);

  expect(screen.queryByRole('navigation', { name: 'Student register pagination' })).not.toBeInTheDocument();
});

it('prevents a stale response from replacing newer results', async () => {
  const firstPage = listResponse(66, 1, 12);
  api.get.mockResolvedValue(firstPage);

  render(<StudentRegister role="ADMIN" onRecordsChanged={jest.fn()} />);
  await waitFor(() => expect(screen.getByText('Student 1')).toBeInTheDocument());
  expect(screen.getByRole('button', { name: 'Page 1' })).toHaveAttribute('aria-current', 'page');

  fireEvent.click(await screen.findByRole('button', { name: 'Next page' }));
  // Resolve the page-2 request with stale page-1 data; the page/revision guard must reject it.
  api.get.mockResolvedValueOnce(firstPage);
  await waitFor(() => expect(api.get).toHaveBeenLastCalledWith('/students', expect.objectContaining({ params: expect.objectContaining({ page: 2 }) })));
  // Stale page-1 data rejected: results are cleared rather than replaced with stale records.
  expect(screen.queryByText('Student 13')).not.toBeInTheDocument();
});

it('moves to the new last page when deleting from the final page that no longer exists', async () => {
  // 25 records, limit 12: page 3 holds only record 25.
  let total = 25;
  api.get.mockImplementation((url, config) => Promise.resolve(listResponse(total, config?.params?.page ?? 1, config?.params?.limit ?? 12)));
  api.delete.mockImplementation(() => { total = 24; return Promise.resolve({}); });
  render(<StudentRegister role="ADMIN" onRecordsChanged={jest.fn()} />);

  await waitFor(() => expect(screen.getByRole('button', { name: 'Page 3' })).toBeInTheDocument());
  fireEvent.click(await screen.findByRole('button', { name: 'Next page' }));
  await waitFor(() => expect(api.get).toHaveBeenLastCalledWith('/students', expect.objectContaining({ params: expect.objectContaining({ page: 2 }) })));
  fireEvent.click(await screen.findByRole('button', { name: 'Next page' }));
  await waitFor(() => expect(api.get).toHaveBeenLastCalledWith('/students', expect.objectContaining({ params: expect.objectContaining({ page: 3 }) })));

  // Deleting the only record on page 3 leaves 24 records -> last page becomes 2, so page 3 no longer exists.
  fireEvent.click(await screen.findByRole('button', { name: /Delete Student 25/ }));
  await waitFor(() => expect(api.delete).toHaveBeenCalledWith('/students/25'));
  await waitFor(() => expect(api.get).toHaveBeenLastCalledWith('/students', expect.objectContaining({ params: expect.objectContaining({ page: 2 }) })));
});
