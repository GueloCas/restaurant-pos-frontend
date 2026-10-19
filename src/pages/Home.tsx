import { Link } from 'react-router-dom';
import { useAuth } from '../context/auth-context';

export const Home = () => {
  const { session } = useAuth();

  return (
    <div style={{ padding: '40px', textAlign: 'center' }}>
      <h1>Sistema de Pedidos Gastronómicos</h1>
      <p>Gestión de mesas, comandas e impresión en tiempo real.</p>

      <div style={{ marginTop: '24px' }}>
        {session ? (
          <Link to="/dashboard">Ir al Dashboard</Link>
        ) : (
          <Link to="/login" style={{ fontSize: '18px', fontWeight: 'bold' }}>
            Iniciar sesión
          </Link>
        )}
      </div>
    </div>
  );
};
