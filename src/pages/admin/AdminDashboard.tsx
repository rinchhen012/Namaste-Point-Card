import React, { useState, useEffect } from 'react';
import { getRecentOrders, getActiveUsersCount, getStatsData, debugAdminStatus, getExtendedStats } from '../../firebase/adminServices';

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalRewards: number;
  totalRedemptions: number;
  pointsIssued: number;
  pointsRedeemed: number;
}

interface ExtendedStats {
  retentionRate: number;
  avgPointsPerUser: number;
  monthlyPointsAwarded: number[];
  monthlyPointsRedeemed: number[];
  popularRewards: { name: string; count: number }[];
  newUsers: number[];
  months: string[];
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
  const [extendedStats, setExtendedStats] = useState<ExtendedStats>({
    retentionRate: 0,
    avgPointsPerUser: 0,
    monthlyPointsAwarded: [],
    monthlyPointsRedeemed: [],
    popularRewards: [],
    newUsers: [],
    months: []
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        // First run the debug function to check admin status
        await debugAdminStatus();

        if (import.meta.env.DEV && import.meta.env.VITE_USE_MOCK_AUTH === 'true') {
          setStats({
            totalUsers: 124,
            activeUsers: 45,
            totalRewards: 5,
            totalRedemptions: 67,
            pointsIssued: 289,
            pointsRedeemed: 152
          });

          setExtendedStats({
            retentionRate: 76,
            avgPointsPerUser: 42,
            monthlyPointsAwarded: [45, 68, 72, 89, 105, 93],
            monthlyPointsRedeemed: [23, 35, 42, 57, 63, 48],
            popularRewards: [
              { name: 'Free Curry', count: 34 },
              { name: 'Free Naan', count: 28 },
              { name: 'Discount Coupon', count: 19 }
            ],
            newUsers: [8, 12, 15, 10, 18, 14],
            months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
          });

          setRecentOrders([
            {
              id: 'order1',
              userName: 'Tanaka Yuki',
              type: 'delivery_order',
              code: 'DEL-12345',
              timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000)
            },
            {
              id: 'order2',
              userName: 'Smith John',
              type: 'in_store_visit',
              timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000)
            }
          ]);

          setLoading(false);
          return;
        }

        // Fetch dashboard stats
        const statsData = await getStatsData();
        setStats(statsData);

        // Fetch extended stats
        const extendedStatsData = await getExtendedStats();
        setExtendedStats(extendedStatsData);

        // Fetch recent orders
        const ordersData = await getRecentOrders(5);
        setRecentOrders(ordersData);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
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

            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-medium text-gray-500 mb-2">Retention Rate</h3>
              <p className="text-3xl font-bold">{extendedStats.retentionRate}%</p>
              <p className="text-sm text-gray-500 mt-2">Monthly user retention</p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-medium text-gray-500 mb-2">Avg. Points per User</h3>
              <p className="text-3xl font-bold">{extendedStats.avgPointsPerUser}</p>
              <p className="text-sm text-gray-500 mt-2">For active users</p>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-medium text-gray-500 mb-2">User Growth</h3>
              <p className="text-3xl font-bold">{extendedStats.newUsers.length > 0 ? extendedStats.newUsers[extendedStats.newUsers.length - 1] : 0}</p>
              <p className="text-sm text-gray-500 mt-2">New users this month</p>
            </div>
          </div>

          {/* Popular Rewards */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h3 className="text-lg font-medium mb-4">Most Popular Rewards</h3>

            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reward Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Redemptions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {extendedStats.popularRewards.map((reward, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{reward.name}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{reward.count}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Monthly Metrics Chart */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h3 className="text-lg font-medium mb-4">Monthly Statistics</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-3">Points Activity</h4>
                <div className="h-64 relative">
                  {extendedStats.months.length > 0 && (
                    <>
                      {/* Y-axis labels */}
                      <div className="absolute top-0 bottom-8 left-0 w-8 flex flex-col justify-between text-xs text-gray-500">
                        <span>{Math.max(...extendedStats.monthlyPointsAwarded, 1)}</span>
                        <span>{Math.floor(Math.max(...extendedStats.monthlyPointsAwarded, 1) / 2)}</span>
                        <span>0</span>
                      </div>

                      {/* Chart axes */}
                      <div className="absolute bottom-0 left-8 right-0 border-t border-gray-200"></div>
                      <div className="absolute top-0 bottom-0 left-8 border-l border-gray-200"></div>

                      {/* Bars */}
                      <div className="absolute top-2 right-2 bottom-8 left-12 flex items-end">
                        {extendedStats.months.map((month, i) => {
                          const maxPoints = Math.max(...extendedStats.monthlyPointsAwarded, 1);
                          const awardedHeight = (extendedStats.monthlyPointsAwarded[i] / maxPoints) * 100;
                          const redeemedHeight = (extendedStats.monthlyPointsRedeemed[i] / maxPoints) * 100;

                          return (
                            <div key={i} className="flex-1 flex flex-col items-center" style={{ height: '100%' }}>
                              <div className="w-full flex justify-center items-end h-full px-1 relative group">
                                <div className="w-full max-w-[20px] flex flex-col items-center space-y-1">
                                  <div
                                    className="w-full bg-blue-500 rounded-t group-hover:bg-blue-600 transition-colors"
                                    style={{
                                      height: `${awardedHeight}%`,
                                      minHeight: extendedStats.monthlyPointsAwarded[i] > 0 ? '4px' : '0'
                                    }}
                                  >
                                    {/* Tooltip on hover */}
                                    <div className="opacity-0 group-hover:opacity-100 absolute bottom-full mb-1 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs rounded py-1 px-2 pointer-events-none transition-opacity whitespace-nowrap">
                                      Awarded: {extendedStats.monthlyPointsAwarded[i]}
                                    </div>
                                  </div>
                                  <div
                                    className="w-full bg-green-500 rounded-t group-hover:bg-green-600 transition-colors"
                                    style={{
                                      height: `${redeemedHeight}%`,
                                      minHeight: extendedStats.monthlyPointsRedeemed[i] > 0 ? '4px' : '0'
                                    }}
                                  >
                                    {/* Tooltip on hover */}
                                    <div className="opacity-0 group-hover:opacity-100 absolute bottom-full mb-1 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs rounded py-1 px-2 pointer-events-none transition-opacity whitespace-nowrap">
                                      Redeemed: {extendedStats.monthlyPointsRedeemed[i]}
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="text-xs text-gray-500 mt-2">{month}</div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
                <div className="flex justify-center mt-4 space-x-4">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-blue-500 mr-2"></div>
                    <span className="text-xs text-gray-500">Points Awarded</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-500 mr-2"></div>
                    <span className="text-xs text-gray-500">Points Redeemed</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-3">User Growth</h4>
                <div className="h-64 relative">
                  {extendedStats.months.length > 0 && (
                    <>
                      {/* Y-axis labels */}
                      <div className="absolute top-0 bottom-8 left-0 w-8 flex flex-col justify-between text-xs text-gray-500">
                        <span>{Math.max(...extendedStats.newUsers, 1)}</span>
                        <span>{Math.floor(Math.max(...extendedStats.newUsers, 1) / 2)}</span>
                        <span>0</span>
                      </div>

                      {/* Chart axes */}
                      <div className="absolute bottom-0 left-8 right-0 border-t border-gray-200"></div>
                      <div className="absolute top-0 bottom-0 left-8 border-l border-gray-200"></div>

                      {/* Bars */}
                      <div className="absolute top-2 right-2 bottom-8 left-12 flex items-end">
                        {extendedStats.months.map((month, i) => {
                          const maxUsers = Math.max(...extendedStats.newUsers, 1);
                          const barHeight = (extendedStats.newUsers[i] / maxUsers) * 100;

                          return (
                            <div key={i} className="flex-1 flex flex-col items-center" style={{ height: '100%' }}>
                              <div className="w-full flex justify-center items-end h-full px-1 relative group">
                                <div
                                  className="w-full max-w-[24px] bg-orange-500 rounded-t group-hover:bg-orange-600 transition-colors"
                                  style={{
                                    height: `${barHeight}%`,
                                    minHeight: extendedStats.newUsers[i] > 0 ? '4px' : '0'
                                  }}
                                >
                                  {/* Tooltip on hover */}
                                  <div className="opacity-0 group-hover:opacity-100 absolute bottom-full mb-1 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs rounded py-1 px-2 pointer-events-none transition-opacity whitespace-nowrap">
                                    New users: {extendedStats.newUsers[i]}
                                  </div>
                                </div>
                              </div>
                              <div className="text-xs text-gray-500 mt-2">{month}</div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              </div>
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
