import { Navigate } from 'react-router-dom';
// Messages feature has been removed. Redirect to dashboard.
export default function MessagesPage() {
  return <Navigate to="/dashboard" replace />;
}
