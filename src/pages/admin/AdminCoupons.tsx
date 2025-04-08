import React, { useState, useEffect } from 'react';
import { getCoupons, createCoupon, deactivateCoupon } from '../../firebase/adminServices';
import PrintableCodes from '../../components/Admin/PrintableCodes';
import { formatDate, formatDateTime, isDateExpired } from '../../utils/dateUtils';

interface Coupon {
  id: string;
  code: string;
  used: boolean;
  createdAt: Date;
  expiresAt: Date;
  usedBy?: string;
  usedAt?: Date;
}

const AdminCoupons: React.FC = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    codePrefix: 'DEL',
    codeCount: 10,
    expiryDays: 60,
    generateRandomCodes: true
  });
  const [newlyGeneratedCodes, setNewlyGeneratedCodes] = useState<Array<{code: string, expiresAt: Date}>>([]);
  const [showPrintableView, setShowPrintableView] = useState<boolean>(false);

  // Load coupons
  useEffect(() => {
    const loadCoupons = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // In development mode, use mock data
        if (import.meta.env.DEV && import.meta.env.VITE_USE_MOCK_AUTH === 'true') {
          const mockCoupons = [
            {
              id: 'coupon-1',
              code: 'DEL-12345',
              used: false,
              createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
              expiresAt: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000)
            },
            {
              id: 'coupon-2',
              code: 'DEL-54321',
              used: true,
              createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
              expiresAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
              usedBy: 'Tanaka Yuki',
              usedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
            },
            {
              id: 'coupon-3',
              code: 'DEL-ABCDE',
              used: false,
              createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
              expiresAt: new Date(Date.now() + 29 * 24 * 60 * 60 * 1000)
            }
          ];
          
          setCoupons(mockCoupons as Coupon[]);
          setLoading(false);
          return;
        }
        
        // For production, fetch real data
        const couponsData = await getCoupons();
        setCoupons(couponsData as Coupon[]);
        setLoading(false);
      } catch (err) {
        console.error('Error loading coupons:', err);
        setError('Could not load coupons. Please try again.');
        setLoading(false);
      }
    };
    
    loadCoupons();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleCreateCoupons = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // In development mode, mock the creation
      if (import.meta.env.DEV && import.meta.env.VITE_USE_MOCK_AUTH === 'true') {
        const newCoupons: Coupon[] = [];
        const generatedCodes: Array<{code: string, expiresAt: Date}> = [];
        
        for (let i = 0; i < formData.codeCount; i++) {
          // Generate a random code if enabled
          const randomString = formData.generateRandomCodes 
            ? Math.random().toString(36).substring(2, 7).toUpperCase()
            : (i + 1).toString().padStart(5, '0');
            
          const code = `${formData.codePrefix}-${randomString}`;
          const expiresAt = new Date(Date.now() + parseInt(formData.expiryDays.toString()) * 24 * 60 * 60 * 1000);
          
          const coupon = {
            id: `coupon-new-${Date.now()}-${i}`,
            code,
            used: false,
            createdAt: new Date(),
            expiresAt
          };
          
          newCoupons.push(coupon as Coupon);
          generatedCodes.push({ code, expiresAt });
        }
        
        setCoupons([...newCoupons, ...coupons]);
        setNewlyGeneratedCodes(generatedCodes);
        setShowPrintableView(true);
        setShowCreateForm(false);
        setLoading(false);
        return;
      }
      
      // For production, create real coupons
      const result = await createCoupon(
        formData.codePrefix,
        parseInt(formData.codeCount.toString()), 
        parseInt(formData.expiryDays.toString()), 
        formData.generateRandomCodes
      );
      
      // Create the list of codes with expiration dates
      if (result && result.codes) {
        const expiryDate = new Date(Date.now() + parseInt(formData.expiryDays.toString()) * 24 * 60 * 60 * 1000);
        const generatedCodes = result.codes.map(code => ({
          code,
          expiresAt: expiryDate
        }));
        setNewlyGeneratedCodes(generatedCodes);
        setShowPrintableView(true);
      }
      
      // Reload coupons to get the newly created ones
      const couponsData = await getCoupons();
      setCoupons(couponsData as Coupon[]);
      setShowCreateForm(false);
      setLoading(false);
    } catch (err) {
      console.error('Error creating coupons:', err);
      setError('Could not create coupons. Please try again.');
      setLoading(false);
    }
  };

  const handleDeactivateCoupon = async (couponId: string) => {
    try {
      setLoading(true);
      
      // In development mode, mock the deactivation
      if (import.meta.env.DEV && import.meta.env.VITE_USE_MOCK_AUTH === 'true') {
        setCoupons(
          coupons.map(coupon => 
            coupon.id === couponId 
              ? { ...coupon, expiresAt: new Date(Date.now() - 1000) } 
              : coupon
          )
        );
        setLoading(false);
        return;
      }
      
      // For production, deactivate the real coupon
      await deactivateCoupon(couponId);
      
      // Reload coupons
      const couponsData = await getCoupons();
      setCoupons(couponsData as Coupon[]);
      
      setLoading(false);
    } catch (err) {
      console.error('Error deactivating coupon:', err);
      setError('Could not deactivate coupon. Please try again.');
      setLoading(false);
    }
  };

  return (
    <>
      <h2 className="text-2xl font-semibold mb-6">Delivery Coupons</h2>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <div className="mb-6 flex justify-between items-center">
        <div>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="bg-orange-600 text-white py-2 px-4 rounded-md hover:bg-orange-700"
          >
            {showCreateForm ? 'Cancel' : 'Create New Coupons'}
          </button>
        </div>
        <div className="text-gray-500">
          {coupons.filter(c => !c.used && !isDateExpired(c.expiresAt)).length} active coupons
        </div>
      </div>
      
      {/* Print newly generated codes */}
      {showPrintableView && newlyGeneratedCodes.length > 0 && (
        <div className="bg-green-50 border border-green-200 p-4 rounded-md mb-6">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-medium text-green-800">
              {newlyGeneratedCodes.length} new coupons generated!
            </h3>
            <button 
              onClick={() => setShowPrintableView(false)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Dismiss
            </button>
          </div>
          <p className="text-sm text-green-700 mb-4">
            These codes expire on {formatDate(newlyGeneratedCodes[0].expiresAt)} (2 months from creation).
            Print them now to distribute to customers.
          </p>
          <PrintableCodes codes={newlyGeneratedCodes} title="Namaste Delivery Codes" />
        </div>
      )}

      {/* Create Coupon Form */}
      {showCreateForm && (
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h3 className="text-lg font-medium mb-4">Create New Coupons</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-gray-700 mb-2">Coupon Prefix</label>
              <input
                type="text"
                name="codePrefix"
                value={formData.codePrefix}
                onChange={handleInputChange}
                className="w-full p-2 border rounded-md"
                placeholder="DEL"
              />
              <p className="text-gray-500 text-xs mt-1">
                Prefix for the coupon code (e.g. DEL for delivery)
              </p>
            </div>
            
            <div>
              <label className="block text-gray-700 mb-2">Number of Coupons</label>
              <input
                type="number"
                name="codeCount"
                value={formData.codeCount}
                onChange={handleInputChange}
                min="1"
                max="100"
                className="w-full p-2 border rounded-md"
              />
              <p className="text-gray-500 text-xs mt-1">
                How many coupons to generate (max 100)
              </p>
            </div>
            
            <div>
              <label className="block text-gray-700 mb-2">Expiry (days)</label>
              <input
                type="number"
                name="expiryDays"
                value={formData.expiryDays}
                onChange={handleInputChange}
                min="1"
                className="w-full p-2 border rounded-md"
              />
              <p className="text-gray-500 text-xs mt-1">
                Number of days until the coupons expire
              </p>
            </div>
            
            <div className="flex items-center">
              <input
                type="checkbox"
                name="generateRandomCodes"
                checked={formData.generateRandomCodes}
                onChange={handleInputChange}
                id="generateRandomCodes"
                className="mr-2"
              />
              <label htmlFor="generateRandomCodes" className="text-gray-700">
                Generate random codes
              </label>
            </div>
          </div>
          
          <div className="mt-6">
            <button
              onClick={handleCreateCoupons}
              disabled={loading}
              className="bg-orange-600 text-white py-2 px-4 rounded-md hover:bg-orange-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Coupons'}
            </button>
          </div>
        </div>
      )}
      
      {/* Coupons Table */}
      {loading && !showCreateForm ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-600 border-t-transparent"></div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Expires
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Used By
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {coupons.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                      No coupons found. Create some using the button above.
                    </td>
                  </tr>
                ) : (
                  coupons.map((coupon) => (
                    <tr key={coupon.id}>
                      <td className="px-6 py-4 whitespace-nowrap font-mono text-sm">
                        {coupon.code}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          coupon.used 
                            ? 'bg-gray-100 text-gray-800' 
                            : isDateExpired(coupon.expiresAt)
                              ? 'bg-red-100 text-red-800'
                              : 'bg-green-100 text-green-800'
                        }`}>
                          {coupon.used 
                            ? 'Used' 
                            : isDateExpired(coupon.expiresAt)
                              ? 'Expired'
                              : 'Active'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDateTime(coupon.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(coupon.expiresAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {coupon.usedBy || '-'}
                        {coupon.usedAt && ` (${formatDateTime(coupon.usedAt)})`}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {!coupon.used && !isDateExpired(coupon.expiresAt) && (
                          <button
                            onClick={() => handleDeactivateCoupon(coupon.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Deactivate
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
};

export default AdminCoupons; 