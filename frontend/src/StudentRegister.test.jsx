import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import StudentRegister from './StudentRegister';
import { api } from './services/api';

jest.mock('./student-register.css', () => ({}));
jest.mock('./services/api', () => ({ api: { get: jest.fn(), patch: jest.fn(), post: jest.fn() } }));

const person = {
  id: 80, name: 'Ananya Rao', email: 'ananya@example.edu', department: 'Computer Science',
  registrationNumber: null, age: 20, cgpa: 8.5,
};

beforeEach(() => {
  jest.resetAllMocks();
  api.get.mockResolvedValue({ data: { data: [person], total: 1 } });
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
  fireEvent.click(await screen.findByRole('button', { name: 'Next' }));
  await waitFor(() => expect(api.get).toHaveBeenLastCalledWith('/students', expect.objectContaining({ params: { page: 2, limit: 12, search: undefined } })));
  fireEvent.change(screen.getByRole('searchbox'), { target: { value: ' CS-024 ' } });
  await waitFor(() => expect(api.get).toHaveBeenLastCalledWith('/students', expect.objectContaining({ params: { page: 1, limit: 12, search: 'CS-024' } })));
});
