import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import ResultsPanel from './ResultsPanel';
import { api } from './services/api';

jest.mock('./services/api', () => ({ api: { get: jest.fn(), post: jest.fn() } }));
const post = api.post as jest.Mock;
const get = api.get as jest.Mock;
const student = { id: 14, name: 'Test Student', registrationNumber: 'REG-014' };
const subjects = [
  { id: 1, code: 'M101', name: 'Mathematics', semester: 1, maxInternal: 20, maxSemester: 80 },
  { id: 2, code: 'E201', name: 'Electronics', semester: 2, maxInternal: 25, maxSemester: 75 },
];
const marks = [{
  studentId: 14, subjectId: 2, subjectCode: 'E201', subjectName: 'Electronics', semester: 2,
  internalMark: 0, semesterMark: 68, total: 68, grade: 'B+', percentage: 68, maxInternal: 25, maxSemester: 75,
}];

function lookUp() {
  fireEvent.change(screen.getByLabelText('Hall ticket / registration number'), { target: { value: '  REG-014  ' } });
  fireEvent.click(screen.getByRole('button', { name: 'View results' }));
}

beforeEach(() => {
  post.mockReset();
  get.mockReset();
  get.mockResolvedValue({ data: subjects });
});

test('asks for an independent, masked registration number before loading results', () => {
  render(<ResultsPanel canEdit={false} />);
  expect(screen.getByLabelText('Hall ticket / registration number')).toHaveAttribute('type', 'password');
  expect(post).not.toHaveBeenCalled();
  expect(get).not.toHaveBeenCalled();
  expect(screen.queryByRole('table')).not.toBeInTheDocument();
});

test('keeps the record closed after a mismatched number', async () => {
  post.mockRejectedValueOnce({ response: { status: 404 } });
  render(<ResultsPanel canEdit={false} />);
  lookUp();
  expect(await screen.findByRole('alert')).toHaveTextContent('No matching record');
  expect(get).not.toHaveBeenCalled();
  expect(screen.queryByRole('table')).not.toBeInTheDocument();
});

test('shows the verified marksheet, switches semesters, and closes it without storing the number', async () => {
  post.mockResolvedValue({ data: { student, marks } });
  render(<ResultsPanel canEdit={false} />);
  lookUp();
  expect(post).toHaveBeenCalledWith('/results/lookup', { registrationNumber: 'REG-014' }, expect.anything());
  const table = await screen.findByRole('table', { name: 'Semester 2 marks for Test Student' });
  expect(within(table).getByText('0 / 25')).toBeInTheDocument();
  expect(within(table).getByText('B+')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Add subject' })).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText('Semester'), { target: { value: '1' } });
  expect(await screen.findByText('Pending')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Close marksheet' }));
  expect(screen.getByLabelText('Hall ticket / registration number')).toHaveValue('');
  expect(screen.queryByRole('table')).not.toBeInTheDocument();
});

test('lets an authorized editor enter a zero and save marks only for the verified student', async () => {
  post.mockResolvedValueOnce({ data: { student, marks: [] } });
  render(<ResultsPanel canEdit />);
  lookUp();
  // Wait for subject catalog to load (Add subject button becomes enabled - no disabled attribute)
  await screen.findByRole('button', { name: 'Add subject' });
  await waitFor(() => expect(screen.getByRole('button', { name: 'Add subject' })).not.toBeDisabled());
  fireEvent.click(screen.getByRole('button', { name: 'Add subject' }));
  expect(screen.getByLabelText('Subject name')).toBeVisible();
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  fireEvent.click(await screen.findByRole('button', { name: 'Edit marks for Mathematics' }));
  fireEvent.change(screen.getByLabelText('Internal mark (out of 20)'), { target: { value: '0' } });
  fireEvent.change(screen.getByLabelText('Exam mark (out of 80)'), { target: { value: '42' } });
  post.mockResolvedValueOnce({ data: { ...marks[0], subjectId: 1, semester: 1, internalMark: 0, semesterMark: 42, total: 42, maxInternal: 20, maxSemester: 80, grade: 'C' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save' }));
  await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('Marks saved.'));
  expect(post).toHaveBeenLastCalledWith('/results/marks', { studentId: 14, subjectId: 1, internalMark: 0, semesterMark: 42 });
  expect(screen.getByText('0 / 20')).toBeVisible();
});
