import { render, screen } from '@testing-library/react';
import App from './App';

test('renders login screen', () => {
  render(<App />);
  expect(screen.getByRole('heading', { name: /iniciar sesion/i })).toBeInTheDocument();
  expect(screen.getByLabelText(/usuario/i)).toBeInTheDocument();
});
