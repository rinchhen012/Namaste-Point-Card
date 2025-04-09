import React, { useState, useEffect } from 'react';
import { getUsersList, setUserAsAdmin, adjustUserPoints } from '../../firebase/adminServices';
import { UserProfile } from '../../types';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { formatDate } from '../../utils/dateUtils';

const AdminUsers: React.FC = () => {
  const { currentAdminUser } = useAdminAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [lastUser, setLastUser] = useState<UserProfile | undefined>(undefined);
  const [pointsModalOpen, setPointsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [pointsAmount, setPointsAmount] = useState<number>(0);
  const [adjustmentMode, setAdjustmentMode] = useState<'add' | 'subtract'>('add');
  const [pointsNote, setPointsNote] = useState<string>('');
  const [adjustingPoints, setAdjustingPoints] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async (startAfter?: UserProfile) => {
    try {
      setLoading(true);
      setError(null);

      const result = await getUsersList(20, startAfter);

      if (startAfter) {
        setUsers(prev => [...prev, ...result.users]);
      } else {
        setUsers(result.users);
      }

      setHasMore(result.hasMore);
      if (result.users.length > 0) {
        setLastUser(result.users[result.users.length - 1]);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = () => {
    if (hasMore && lastUser) {
      loadUsers(lastUser);
    }
  };

  const handleToggleAdmin = async (userId: string, currentRole: string) => {
    try {
      const isCurrentlyAdmin = currentRole === 'admin';
      await setUserAsAdmin(userId, !isCurrentlyAdmin);

      // Update local state
      setUsers(prev =>
        prev.map(user =>
          user.uid === userId
            ? { ...user, role: isCurrentlyAdmin ? 'user' : 'admin' }
            : user
        )
      );
    } catch (err) {
      console.error('Error updating user role:', err);
      setError('Failed to update user role. Please try again.');
    }
  };

  const openPointsModal = (user: UserProfile) => {
    setSelectedUser(user);
    setPointsAmount(0);
    setAdjustmentMode('add');
    setPointsNote('');
    setPointsModalOpen(true);
  };

  const closePointsModal = () => {
    setPointsModalOpen(false);
    setSelectedUser(null);
  };

  const handleAdjustPoints = async () => {
    if (!selectedUser || !selectedUser.uid) {
      setError('Invalid user selected');
      return;
    }

    if (!currentAdminUser || !currentAdminUser.uid) {
      setError('Admin authentication issue. Please try logging in again.');
      return;
    }

    if (!pointsNote.trim()) {
      setError('Please provide a reason for adjustment');
      return;
    }

    // Calculate the actual points adjustment value based on mode
    const adjustmentValue = adjustmentMode === 'add' ? pointsAmount : -pointsAmount;

    try {
      setAdjustingPoints(true);
      console.log('Adjusting points for user:', selectedUser.uid, 'by admin:', currentAdminUser.uid);

      await adjustUserPoints(
        selectedUser.uid,
        adjustmentValue,
        currentAdminUser.uid,
        pointsNote.trim()
      );

      // Update local state
      setUsers(prev =>
        prev.map(user =>
          user.uid === selectedUser.uid
            ? { ...user, points: (user.points || 0) + adjustmentValue }
            : user
        )
      );

      closePointsModal();
    } catch (err) {
      console.error('Error adjusting points:', err);
      setError(`Failed to adjust points: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setAdjustingPoints(false);
    }
  };

  // Add a helper function for quick preset values
  const applyPresetValue = (value: number) => {
    setPointsAmount(value);
  };

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold text-gray-800">User Management</h1>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="bg-white shadow-md rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Points
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Joined
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {users.map((user, index) => (
              <tr key={`user-${user.uid || index}`}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {user.displayName || 'No Name'}
                      </div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{user.points || 0}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    user.role === 'admin'
                      ? 'bg-purple-100 text-purple-800'
                      : 'bg-green-100 text-green-800'
                  }`}>
                    {user.role || 'user'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(user.createdAt)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    onClick={() => handleToggleAdmin(user.uid, user.role || 'user')}
                    className={`text-indigo-600 hover:text-indigo-900 mr-3 ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    disabled={loading}
                  >
                    {user.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
                  </button>
                  <button
                    onClick={() => openPointsModal(user)}
                    className="text-orange-500 hover:text-orange-700"
                    disabled={loading}
                  >
                    Adjust Points
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {loading && (
          <div className="flex justify-center items-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-2 border-orange-500 border-t-transparent"></div>
          </div>
        )}

        {hasMore && !loading && (
          <div className="flex justify-center py-4">
            <button
              onClick={handleLoadMore}
              className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600"
            >
              Load More
            </button>
          </div>
        )}

        {!loading && users.length === 0 && (
          <div className="text-center py-4 text-gray-500">
            No users found
          </div>
        )}
      </div>

      {/* Points Adjustment Modal */}
      {pointsModalOpen && selectedUser && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="absolute inset-0 bg-black opacity-50" onClick={closePointsModal}></div>
          <div className="bg-white rounded-lg p-6 z-10 max-w-md w-full">
            <h2 className="text-xl font-semibold mb-2">Adjust Points for {selectedUser.displayName}</h2>
            <p className="mb-4">Current Points: <span className="font-semibold">{selectedUser.points || 0}</span></p>

            {/* Tab selector for Add/Subtract */}
            <div className="flex border-b mb-4">
              <button
                className={`py-2 px-4 ${adjustmentMode === 'add'
                  ? 'border-b-2 border-orange-500 text-orange-600 font-medium'
                  : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => setAdjustmentMode('add')}
              >
                Add Points
              </button>
              <button
                className={`py-2 px-4 ${adjustmentMode === 'subtract'
                  ? 'border-b-2 border-red-500 text-red-600 font-medium'
                  : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => setAdjustmentMode('subtract')}
              >
                Subtract Points
              </button>
            </div>

            {/* Points adjustment UI */}
            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                {adjustmentMode === 'add' ? 'Points to Add' : 'Points to Subtract'}
              </label>

              {/* Numeric input with increment/decrement buttons */}
              <div className="flex mb-2">
                <button
                  onClick={() => setPointsAmount(Math.max(0, pointsAmount - 1))}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-2 px-4 rounded-l"
                >
                  –
                </button>
                <input
                  type="number"
                  min="0"
                  value={pointsAmount}
                  onChange={(e) => setPointsAmount(Math.max(0, parseInt(e.target.value) || 0))}
                  className="shadow-inner border-t border-b w-full py-2 px-3 text-gray-700 text-center leading-tight focus:outline-none"
                />
                <button
                  onClick={() => setPointsAmount(pointsAmount + 1)}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-2 px-4 rounded-r"
                >
                  +
                </button>
              </div>

              {/* Quick preset values */}
              <div className="grid grid-cols-4 gap-2 mb-3">
                {[1, 5, 10, 25].map(value => (
                  <button
                    key={value}
                    onClick={() => applyPresetValue(value)}
                    className={`py-1 px-2 rounded ${
                      pointsAmount === value
                        ? (adjustmentMode === 'add' ? 'bg-orange-500 text-white' : 'bg-red-500 text-white')
                        : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                    }`}
                  >
                    {value}
                  </button>
                ))}
              </div>

              {/* Slider */}
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={pointsAmount}
                onChange={(e) => setPointsAmount(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />

              {/* Preview of new point total */}
              <div className="mt-3 text-sm">
                <span className="text-gray-700">New point total will be: </span>
                <span className="font-bold">
                  {adjustmentMode === 'add'
                    ? (selectedUser.points || 0) + pointsAmount
                    : Math.max(0, (selectedUser.points || 0) - pointsAmount)}
                </span>
              </div>
            </div>

            {/* Reason note */}
            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-bold mb-2">
                Reason for {adjustmentMode === 'add' ? 'Adding' : 'Subtracting'} Points
              </label>
              <textarea
                value={pointsNote}
                onChange={(e) => setPointsNote(e.target.value)}
                placeholder={adjustmentMode === 'add'
                  ? "Example: Bonus points for customer loyalty"
                  : "Example: Correction of incorrectly awarded points"}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                rows={3}
              />
            </div>

            {/* Action buttons */}
            <div className="flex justify-end space-x-2">
              <button
                onClick={closePointsModal}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handleAdjustPoints}
                disabled={adjustingPoints || !pointsNote || pointsAmount === 0}
                className={`${
                  adjustmentMode === 'add'
                    ? 'bg-orange-500 hover:bg-orange-700'
                    : 'bg-red-500 hover:bg-red-700'
                } text-white font-bold py-2 px-4 rounded ${
                  (adjustingPoints || !pointsNote || pointsAmount === 0) ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {adjustingPoints
                  ? 'Processing...'
                  : `${adjustmentMode === 'add' ? 'Add' : 'Subtract'} ${pointsAmount} Points`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
