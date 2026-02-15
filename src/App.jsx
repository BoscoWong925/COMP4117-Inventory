import { useState, useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import LoginPage from './pages/LoginPage';
import ApproveRequestsPage from './pages/ApproveRequestsPage';
import BorrowHistoryPage from './pages/BorrowHistoryPage';
import ManageItemsPage from './pages/ManageItemsPage';
import LentOutFilterPage from './pages/LentOutFilterPage';
import AuditLogPage from './pages/AuditLogPage';
import NewBorrowRequestPage from './pages/NewBorrowRequestPage';
import MyBorrowingRecordPage from './pages/MyBorrowingRecordPage';
import SearchAvailableItemsPage from './pages/SearchAvailableItemsPage';
import HandOverToolPage from './pages/HandOverToolPage';
import './index.css';

export default function App() {
  const { user, isAuthenticated, login, logout } = useAuth();
  const [currentPage, setCurrentPage] = useState('home');

  const handleLogin = (username, password) => {
    return login(username, password);
  };

  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  const renderPageContent = () => {
    switch (currentPage) {
      case 'approve-requests':
        return <ApproveRequestsPage />;
      case 'borrow-history':
        return <BorrowHistoryPage />;
      case 'manage-items':
        return <ManageItemsPage />;
      case 'lent-out-filter':
        return <LentOutFilterPage />;
      case 'audit-log':
        return <AuditLogPage />;
      case 'new-borrow-request':
        return <NewBorrowRequestPage />;
      case 'my-borrowing-record':
        return <MyBorrowingRecordPage />;
      case 'search-available':
        return <SearchAvailableItemsPage />;
      case 'hand-over-tool':
        return <HandOverToolPage />;
      default:
        return <HomePage user={user} />;
    }
  };

  return (
    <div className="container-main">
      <header className="header sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold text-gray-800">
              Inventory System <span className="text-sm text-gray-500">COMP Dept</span>
            </h1>
            <div className="text-right">
              <p className="text-sm text-gray-600">Welcome, <strong>{user?.name}</strong></p>
              <p className="text-xs text-gray-500 capitalize">Role: {user?.role}</p>
            </div>
          </div>

          <nav className="flex flex-wrap gap-2 border-t border-gray-200 pt-3">
            <button onClick={() => setCurrentPage('home')} className="nav-link">
              Dashboard
            </button>

            {(user?.role === 'admin' || user?.role === 'operator') && (
              <>
                <button onClick={() => setCurrentPage('approve-requests')} className="nav-link">
                  Approve Requests
                </button>
                <button onClick={() => setCurrentPage('borrow-history')} className="nav-link">
                  Borrow History
                </button>
                <button onClick={() => setCurrentPage('manage-items')} className="nav-link">
                  Manage Items
                </button>
                <button onClick={() => setCurrentPage('lent-out-filter')} className="nav-link">
                  Lent-Out Items
                </button>
                <button onClick={() => setCurrentPage('audit-log')} className="nav-link">
                  Audit Log
                </button>
              </>
            )}

            {user?.role === 'operator' && (
              <button onClick={() => setCurrentPage('hand-over-tool')} className="nav-link">
                Hand-Over Tool
              </button>
            )}

            {user?.role === 'user' && (
              <>
                <button onClick={() => setCurrentPage('new-borrow-request')} className="nav-link">
                  New Request
                </button>
                <button onClick={() => setCurrentPage('my-borrowing-record')} className="nav-link">
                  My Records
                </button>
                <button onClick={() => setCurrentPage('search-available')} className="nav-link">
                  Search Items
                </button>
              </>
            )}

            <button
              onClick={logout}
              className="nav-link ml-auto text-red-600 hover:text-red-800 hover:bg-red-50"
            >
              Logout
            </button>
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full">
        {renderPageContent()}
      </main>

      <footer className="border-t border-gray-200 bg-white py-4 mt-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-gray-600 text-sm">
          <p>University COMP Department Inventory System © 2025</p>
        </div>
      </footer>
    </div>
  );
}

function HomePage({ user }) {
  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl font-bold mb-6">Welcome to the Inventory System</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-xl font-bold mb-3">Your Role: <span className="capitalize">{user?.role}</span></h3>
            <p className="text-gray-700 mb-4">
              {user?.role === 'admin' && 'You have full access to all inventory functions including item management, request approval, and audit logs.'}
              {user?.role === 'operator' && 'You can manage items, approve requests, track items, and use the hand-over tool for status updates.'}
              {user?.role === 'user' && 'You can browse available items, submit borrowing requests, and track your borrowing history.'}
            </p>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-6">
            <h3 className="text-xl font-bold mb-3">Quick Features</h3>
            <ul className="text-gray-700 space-y-2">
              <li>✓ Real-time inventory tracking</li>
              <li>✓ Excel export for all views</li>
              <li>✓ Complete audit trail logging</li>
              <li>✓ Hierarchical borrowing (mothers + components)</li>
              <li>✓ Warranty and purchase tracking</li>
              <li>✓ Role-based access control</li>
            </ul>
          </div>
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
          <h3 className="text-lg font-bold mb-3">Demo Credentials</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="font-medium">Admin</p>
              <p className="text-gray-600">admin / admin123</p>
            </div>
            <div>
              <p className="font-medium">Operator</p>
              <p className="text-gray-600">operator / operator123</p>
            </div>
            <div>
              <p className="font-medium">User</p>
              <p className="text-gray-600">user / user123</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {user?.role !== 'user' && (
            <>
              <DashboardCard 
                title="Approve Requests"
                description="Review and approve/reject borrowing requests from users"
                color="bg-purple-50"
              />
              <DashboardCard 
                title="Manage Items"
                description="Add, edit, or delete inventory items with full details"
                color="bg-blue-50"
              />
              <DashboardCard 
                title="Audit Trail"
                description="View all system actions and changes with timestamps"
                color="bg-indigo-50"
              />
            </>
          )}

          {user?.role === 'user' && (
            <>
              <DashboardCard 
                title="Search Items"
                description="Find available items in the inventory"
                color="bg-green-50"
              />
              <DashboardCard 
                title="New Request"
                description="Request to borrow an available item"
                color="bg-blue-50"
              />
              <DashboardCard 
                title="My Records"
                description="Track your borrowing history and active loans"
                color="bg-purple-50"
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function DashboardCard({ title, description, color }) {
  return (
    <div className={`${color} border border-gray-200 rounded-lg p-4 hover:shadow-md transition`}>
      <h4 className="font-bold text-gray-800 mb-2">{title}</h4>
      <p className="text-sm text-gray-700">{description}</p>
    </div>
  );
}
