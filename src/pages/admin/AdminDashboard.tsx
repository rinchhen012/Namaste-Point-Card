import React, { useState, useEffect } from 'react';
import { getRecentOrders, getActiveUsersCount, getStatsData } from '../../firebase/adminServices';

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalRewards: number;
  totalRedemptions: number;
  pointsIssued: number;
  pointsRedeemed: number;
}

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalRewards: 0,
    totalRedemptions: 0,
    pointsIssued: 0,
    pointsRedeemed: 0
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        
        // In development mode, use mock data
        if (import.meta.env.DEV && import.meta.env.VITE_USE_MOCK_AUTH === 'true') {
          // Mock data for development
          setStats({
            totalUsers: 124,
            activeUsers: 45,
            totalRewards: 5,
            totalRedemptions: 67,
            pointsIssued: 289,
            pointsRedeemed: 152
          });
          
          setRecentOrders([
            {
              id: 'order1',
              userName: 'Tanaka Yuki',
              type: 'delivery_order',
              code: 'DEL-12345',
              timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000)
            },
            {
              id: 'order2',
              userName: 'Suzuki Keita',
              type: 'in_store_visit',
              timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000)
            },
            {
              id: 'order3',
              userName: 'John Smith',
              type: 'delivery_order',
              code: 'DEL-54321',
              timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000)
            }
          ]);
          
          setLoading(false);
          return;
        }
        
        // For production, fetch real data
        const statsData = await getStatsData();
        setStats(statsData as DashboardStats);
        
        const orders = await getRecentOrders();
        setRecentOrders(orders);
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, []);

  // Format date for display
  const formatDate = (date: Date) => {
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <>
      <h2 className="text-2xl font-semibold mb-6">Dashboard</h2>
      
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-600 border-t-transparent"></div>
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-medium text-gray-500 mb-2">Total Users</h3>
              <p className="text-3xl font-bold">{stats.totalUsers}</p>
              <p className="text-sm text-gray-500 mt-2">{stats.activeUsers} active in last 30 days</p>
            </div>
            
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-medium text-gray-500 mb-2">Points</h3>
              <p className="text-3xl font-bold">{stats.pointsIssued}</p>
              <p className="text-sm text-gray-500 mt-2">{stats.pointsRedeemed} redeemed</p>
            </div>
            
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-medium text-gray-500 mb-2">Redemptions</h3>
              <p className="text-3xl font-bold">{stats.totalRedemptions}</p>
              <p className="text-sm text-gray-500 mt-2">From {stats.totalRewards} rewards</p>
            </div>
          </div>
          
          {/* Recent Activity */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-medium mb-4">Recent Activity</h3>
            
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Code
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Time
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recentOrders.map((order) => (
                    <tr key={order.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{order.userName}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          order.type === 'delivery_order' 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-green-100 text-green-800'
                        }`}>
                          {order.type === 'delivery_order' ? 'Delivery Order' : 'In-Store Visit'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {order.code || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(order.timestamp)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default AdminDashboard; 