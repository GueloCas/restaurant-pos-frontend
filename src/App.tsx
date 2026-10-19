import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './context/AuthProvider';
import { PageRouter } from './routes/PageRouter.tsx';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <PageRouter />
      </BrowserRouter>
    </AuthProvider>
  );
}
