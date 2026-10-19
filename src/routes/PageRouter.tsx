import { Routes, Route, Navigate } from 'react-router-dom';
import { lazy } from 'react';
import { ProtectedRoute } from '../components/ProtectedRoute';
import { Home } from '../pages/Home';
import { Login } from '../pages/Login';
import { Dashboard } from '../pages/Dashboard';
import { POSLayout } from '../layouts/POSLayout';
import { AcceptInvitation } from '../pages/AcceptInvitation';
const StaffPage = lazy(() => import('../features/staff/StaffPage').then(module => ({ default: module.StaffPage })));
const SalesPage = lazy(() => import('../features/sales/SalesPage').then(module => ({ default: module.SalesPage })));
const CatalogPage = lazy(() => import('../features/catalog/CatalogPage').then(module => ({ default: module.CatalogPage })));
const TablesPage = lazy(() => import('../features/tables/TablesPage').then(module => ({ default: module.TablesPage })));
const TableDetailPage = lazy(() => import('../features/tables/TableDetailPage').then(module => ({ default: module.TableDetailPage })));
const CashierPage = lazy(() => import('../features/payments/CashierPage').then(module => ({ default: module.CashierPage })));
const ModifiersPage = lazy(() => import('../features/modifiers/ModifiersPage').then(module => ({ default: module.ModifiersPage })));

export const PageRouter = () => (
  <Routes>
    <Route path="/" element={<Home />} />
    <Route path="/login" element={<Login />} />
    <Route path="/aceptar-invitacion" element={<AcceptInvitation />} />
    <Route element={<ProtectedRoute><POSLayout /></ProtectedRoute>}>
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/ventas" element={<ProtectedRoute permission="viewSalesHistory"><SalesPage /></ProtectedRoute>} />
      <Route path="/empleados" element={<ProtectedRoute permission="manageStaff"><StaffPage /></ProtectedRoute>} />
      <Route path="/mesas" element={<ProtectedRoute permission="viewTables"><TablesPage /></ProtectedRoute>} />
      <Route path="/mesas/:tableId" element={<ProtectedRoute permission="viewTables"><TableDetailPage /></ProtectedRoute>} />
      <Route path="/catalogo" element={<ProtectedRoute permission="viewCatalog"><CatalogPage /></ProtectedRoute>} />
      <Route path="/catalogo/opciones" element={<ProtectedRoute permission="viewCatalog"><ModifiersPage /></ProtectedRoute>} />
      <Route path="/caja" element={<ProtectedRoute permission="collectPayments"><CashierPage /></ProtectedRoute>} />
    </Route>
    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
);
