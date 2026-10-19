import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const Dashboard = () => {
  const { profile, user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div style={{ padding: '30px' }}>
      <h2>Panel Principal</h2>
      <p style={{ fontSize: '18px' }}>
        Iniciaste sesión como: <strong>{profile?.full_name || user?.email}</strong>
      </p>
      {profile && (
        <p className="text-muted">
          Rol: {profile.role} | ID Local: {profile.tenant_id}
        </p>
      )}

      <button onClick={handleSignOut} style={{ marginTop: '16px', padding: '8px 16px' }}>
        Cerrar sesión
      </button>
    </div>
  );
};
