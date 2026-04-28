import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

test('renders login screen on /admin/login', () => {
  render(
    <MemoryRouter initialEntries={['/admin/login']}>
      <App />
    </MemoryRouter>
  );
  expect(screen.getByRole('heading', { name: /iniciar sesi[oó]n/i })).toBeInTheDocument();
  expect(screen.getByLabelText(/usuario/i)).toBeInTheDocument();
});
