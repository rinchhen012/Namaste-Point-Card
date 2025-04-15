import React, { useState, useEffect, useMemo, useRef } from 'react';
import { getCoupons, createCoupon, deactivateCoupon } from '../../firebase/adminServices';
import PrintableCodes from '../../components/Admin/PrintableCodes';
import { formatDate, formatDateTime, isDateExpired } from '../../utils/dateUtils';
import ConfirmationModal from '../../components/Admin/ConfirmationModal';

interface Coupon {
  id: string;
  code: string;
  used: boolean;
  createdAt: Date;
  expiresAt: Date;
  usedBy?: string;
  usedAt?: Date;
}

// Define sort configuration type
type SortDirection = 'ascending' | 'descending';
interface SortConfig {
  key: keyof Coupon | 'status' | null; // Allow sorting by status text too
  direction: SortDirection;
}

const AdminCoupons: React.FC = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    codePrefix: 'D',
    codeCount: 30,
    expiryDays: 60,
  });
  const [selectedCouponIds, setSelectedCouponIds] = useState<Set<string>>(new Set());
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'createdAt', direction: 'descending' });
  const [newlyGeneratedCodes, setNewlyGeneratedCodes] = useState<Array<{code: string, expiresAt: Date}>>([]);
  const [showPrintableView, setShowPrintableView] = useState<boolean>(false);
  const [dismissTimer, setDismissTimer] = useState<number | null>(null); // State for countdown timer
  const intervalRef = useRef<NodeJS.Timeout | null>(null); // Ref to store interval ID

  // Effect to handle the auto-dismiss timer
  useEffect(() => {
    if (showPrintableView) {
      setDismissTimer(10); // Start timer at 10 seconds
      intervalRef.current = setInterval(() => {
        setDismissTimer((prevTimer) => {
          if (prevTimer === null || prevTimer <= 1) {
            clearInterval(intervalRef.current!); // Stop timer
            setShowPrintableView(false); // Hide the box
            return null; // Reset timer state
          }
          return prevTimer - 1; // Decrement timer
        });
      }, 1000); // Run every second
    } else {
      // If the view is hidden (manually or by timer), clear interval and reset timer
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setDismissTimer(null);
    }

    // Cleanup function to clear interval on component unmount or when showPrintableView changes
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [showPrintableView]); // Dependency array ensures effect runs when showPrintableView changes

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

      // Call the createCoupon function which now uses a Cloud Function
      const result = await createCoupon(
        formData.codePrefix,
        parseInt(formData.codeCount.toString()),
        parseInt(formData.expiryDays.toString())
      );

      if (result && result.codes) {
        // Setup the data for the printable view
        const expiryDate = new Date(Date.now() + parseInt(formData.expiryDays.toString()) * 24 * 60 * 60 * 1000);
        const generatedDataForPrint = result.codes.map((code: string) => ({
          code,
          expiresAt: expiryDate
        }));

        setNewlyGeneratedCodes(generatedDataForPrint);
        setShowPrintableView(true);
      }

      // Reload coupons to get the newly created ones
      const couponsData = await getCoupons();
      setCoupons(couponsData as Coupon[]);
      setShowCreateForm(false);
      setLoading(false);
    } catch (err) {
      setError('Could not create coupons. Please try again.');
      setLoading(false);
    }
  };

  const deactivateSingleCoupon = async (couponId: string) => {
    try {
      setLoading(true);
      setError(null);

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

      // Update state locally to avoid full reload if preferred, or reload all
      // Option 1: Update locally (faster UI, less consistent if error occurs mid-batch)
      setCoupons(prevCoupons => prevCoupons.filter(c => c.id !== couponId));
      // Option 2: Reload all (ensures consistency)
      // const couponsData = await getCoupons();
      // setCoupons(couponsData as Coupon[]);

      setLoading(false);
    } catch (err) {
      console.error('Error deactivating coupon:', couponId, err);
      setError(`Could not deactivate coupon ${couponId}. Please try again.`);
      setLoading(false); // Ensure loading stops even on error
      throw err; // Re-throw error to stop batch processing if needed
    }
  };

  // Select/Deselect a single coupon (Renamed from handleSelectCoupon)
  const handleSelectCouponChange = (couponId: string, isSelected: boolean) => {
    setSelectedCouponIds(prevSelected => {
      const newSelected = new Set(prevSelected);
      if (isSelected) {
        newSelected.add(couponId);
      } else {
        newSelected.delete(couponId);
      }
      return newSelected;
    });
  };

  // Combined filter and sort logic
  const processedCoupons = useMemo(() => {
    let sortableItems = [...coupons];

    // 1. Filter by Status
    if (filterStatus !== 'All') {
      sortableItems = sortableItems.filter(coupon => {
        const expired = isDateExpired(coupon.expiresAt);
        const status = coupon.used ? 'Used' : expired ? 'Expired' : 'Active';
        return status === filterStatus;
      });
    }

    // 2. Sort based on sortConfig
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        let aValue: unknown;
        let bValue: unknown;

        // Handle sorting by calculated 'status'
        if (sortConfig.key === 'status') {
          const getStatus = (coupon: Coupon) => {
            const expired = isDateExpired(coupon.expiresAt);
            return coupon.used ? 'Used' : expired ? 'Expired' : 'Active';
          };
          aValue = getStatus(a);
          bValue = getStatus(b);
        } else {
          // Handle sorting by date or other direct properties
          aValue = a[sortConfig.key as keyof Coupon];
          bValue = b[sortConfig.key as keyof Coupon];
        }

        // Comparison logic with type checks
        if (aValue instanceof Date && bValue instanceof Date) {
          // Date comparison
          if (aValue < bValue) {
            return sortConfig.direction === 'ascending' ? -1 : 1;
          }
          if (aValue > bValue) {
            return sortConfig.direction === 'ascending' ? 1 : -1;
          }
          return 0;
        } else if (typeof aValue === 'string' && typeof bValue === 'string') {
            // String comparison using localeCompare
            return sortConfig.direction === 'ascending' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
        } else if (typeof aValue === 'boolean' && typeof bValue === 'boolean') {
            // Boolean comparison (treat true > false)
            const aNum = aValue ? 1 : 0;
            const bNum = bValue ? 1 : 0;
            return sortConfig.direction === 'ascending' ? aNum - bNum : bNum - aNum;
        } else {
            // Fallback for other types or mismatch - treat as equal
            return 0;
        }
      });
    }

    return sortableItems;
  }, [coupons, filterStatus, sortConfig]); // Recalculate when data, filter, or sort changes

  // Calculate if all *processed* coupons are selected
  const areAllProcessedSelected = processedCoupons.length > 0 && selectedCouponIds.size >= processedCoupons.length &&
                                  processedCoupons.every(c => selectedCouponIds.has(c.id));

  // Select/Deselect all *processed* coupons
  const handleSelectAllProcessedCoupons = (isSelected: boolean) => {
    if (isSelected) {
      const processedIds = new Set(processedCoupons.map(c => c.id));
      setSelectedCouponIds(processedIds);
    } else {
      setSelectedCouponIds(prevSelected => {
        const newSelected = new Set(prevSelected);
        processedCoupons.forEach(c => newSelected.delete(c.id));
        return newSelected;
      });
    }
  };

  // Handle the bulk delete action
  const handleDeleteSelectedCoupons = async () => {
    if (selectedCouponIds.size === 0) return;

    setLoading(true);
    setError(null);
    const idsToDelete = Array.from(selectedCouponIds);
    let successCount = 0;
    let failCount = 0;

    try {
      for (const id of idsToDelete) {
        try {
          await deactivateSingleCoupon(id); // Use the refactored function
          successCount++;
        } catch {
          failCount++;
        }
      }

      // Remove the explicit reload to rely on local filtering by deactivateSingleCoupon
      // if (!(import.meta.env.DEV && import.meta.env.VITE_USE_MOCK_AUTH === 'true')) {
      //   const couponsData = await getCoupons();
      //   setCoupons(couponsData as Coupon[]);
      // }

      setSelectedCouponIds(new Set()); // Clear selection
      setIsDeleteModalOpen(false); // Close modal
      setLoading(false);

      if (failCount > 0) {
        setError(`Successfully deactivated ${successCount} coupons, but failed to deactivate ${failCount}.`);
      } else {
        // Optionally show a success message/toast here
      }

    } catch (err) {
      // This catch block might be redundant if deactivateSingleCoupon handles errors,
      // but kept for safety in case of unexpected issues during iteration.
      console.error('Error during bulk deactivation:', err);
      setError('An unexpected error occurred during bulk deactivation.');
      setLoading(false);
      setIsDeleteModalOpen(false);
    }
  };

  // Handle filter/sort column header clicks
  const handleHeaderClick = (key: SortConfig['key']) => {
    if (!key) return;

    // Clear selection when changing filter/sort
    setSelectedCouponIds(new Set());

    // Status filter cycling
    if (key === 'status') {
      setSortConfig({ key: null, direction: 'ascending' }); // Reset sort when filtering status
      setFilterStatus(currentStatus => {
        if (currentStatus === 'All') return 'Active';
        if (currentStatus === 'Active') return 'Used';
        if (currentStatus === 'Used') return 'Expired';
        return 'All'; // Cycle back to All from Expired
      });
      return;
    }

    // Sort logic
    let direction: SortDirection = 'descending'; // Default: newest/latest first
    // If clicking the same key, toggle direction
    if (sortConfig.key === key && sortConfig.direction === 'descending') {
      direction = 'ascending';
    }
    // For expiresAt, default to ascending (soonest first)
    if (key === 'expiresAt' && !(sortConfig.key === key && sortConfig.direction === 'ascending')) {
        direction = 'ascending';
    }

    setFilterStatus('All'); // Reset status filter when sorting by date
    setSortConfig({ key, direction });
  };

  // Helper to get sorting indicator for headers
  const getSortIndicator = (key: SortConfig['key']) => {
    if (!key || sortConfig.key !== key) {
      return <span className="ml-1 text-gray-400">↕</span>; // Default indicator
    }
    return sortConfig.direction === 'ascending' ?
      <span className="ml-1">▲</span> :
      <span className="ml-1">▼</span>;
  };

  // Helper to get status filter indicator
  const getStatusFilterIndicator = () => {
      if (filterStatus === 'All') return null;
      return <span className="ml-1 text-orange-600 font-bold">({filterStatus})</span>;
  };

  // Calculate data for selected coupons
  const selectedCouponsData = useMemo(() => {
    return coupons
      .filter(coupon => selectedCouponIds.has(coupon.id))
      .map(coupon => ({ code: coupon.code, expiresAt: coupon.expiresAt }));
  }, [coupons, selectedCouponIds]);

  // Function to handle manual dismissal
  const handleManualDismiss = () => {
      if (intervalRef.current) {
          clearInterval(intervalRef.current); // Clear timer if running
          intervalRef.current = null;
      }
      setShowPrintableView(false); // Hide the box
  };

  return (
    <>
      <h2 className="text-2xl font-semibold mb-6">Delivery Coupons</h2>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="mb-6 flex flex-wrap justify-between items-center gap-4">
        <div className="flex gap-4">
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="bg-orange-600 text-white py-2 px-4 rounded-md hover:bg-orange-700 transition duration-150 ease-in-out"
          >
            {showCreateForm ? 'Cancel' : 'Create New Coupons'}
          </button>
          {selectedCouponIds.size > 0 && (
            <PrintableCodes codes={selectedCouponsData} title="Selected Delivery Codes" />
          )}
          {selectedCouponIds.size > 0 && (
             <button
               onClick={() => setIsDeleteModalOpen(true)}
               className="bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition duration-150 ease-in-out"
               disabled={loading}
             >
               Delete Selected ({selectedCouponIds.size})
             </button>
           )}
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <div className="text-gray-500">
            Total: {coupons.filter(c => !c.used && !isDateExpired(c.expiresAt)).length} active coupons
          </div>
        </div>
      </div>

      {showPrintableView && newlyGeneratedCodes.length > 0 && (
        <div className="bg-green-50 border border-green-200 p-4 rounded-md mb-6">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-lg font-medium text-green-800">
              {newlyGeneratedCodes.length} new coupons generated!
            </h3>
            <button
              onClick={handleManualDismiss}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Dismiss {dismissTimer !== null ? `(${dismissTimer}s)` : ''}
            </button>
          </div>
          <p className="text-sm text-green-700 mb-4">
            These codes expire on {formatDate(newlyGeneratedCodes[0].expiresAt)} (2 months from creation).
            You can print the newly generated batch using the button below or select coupons from the table to print.
          </p>
          <PrintableCodes codes={newlyGeneratedCodes} title="Newly Generated Delivery Codes" buttonText="Print New Batch" />
        </div>
      )}

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
                placeholder="D"
              />
              <p className="text-gray-500 text-xs mt-1">
                Prefix for the coupon code (e.g. DEL for delivery)
              </p>
            </div>

            <div>
              <label htmlFor="codeCount" className="block text-gray-700 mb-2">
                Number of Coupons
                <span className="text-xs text-gray-500 font-normal">(30 per A4)</span>
              </label>
              <input
                type="number"
                id="codeCount"
                name="codeCount"
                value={formData.codeCount}
                onChange={handleInputChange}
                min="1"
                max="300"
                placeholder="30"
                className="w-full p-2 border rounded-md"
              />
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

      {loading && !showCreateForm && coupons.length === 0 && (
         <div className="text-center py-10">Loading coupons...</div>
      )}
      {!loading && coupons.length === 0 && !showCreateForm && (
        <div className="text-center py-10 text-gray-500">No coupons found.</div>
      )}

      {coupons.length > 0 && (
        <div className="bg-white rounded-lg shadow-md overflow-x-auto">
          <table className="w-full table-auto">
            <thead>
              <tr className="bg-gray-100 text-left text-sm font-semibold text-gray-600">
                <th className="px-4 py-3 w-12">
                  <input
                    type="checkbox"
                    className="form-checkbox h-4 w-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                    checked={areAllProcessedSelected}
                    onChange={(e) => handleSelectAllProcessedCoupons(e.target.checked)}
                    aria-label="Select all visible coupons"
                  />
                </th>
                <th className="px-4 py-3 cursor-pointer hover:bg-gray-200" onClick={() => handleHeaderClick('code')}>
                    Code {getSortIndicator('code')}
                </th>
                <th className="px-4 py-3 cursor-pointer hover:bg-gray-200" onClick={() => handleHeaderClick('status')}>
                    Status {getStatusFilterIndicator()}{getSortIndicator('status')}
                </th>
                <th className="px-4 py-3 cursor-pointer hover:bg-gray-200" onClick={() => handleHeaderClick('createdAt')}>
                    Created {getSortIndicator('createdAt')}
                </th>
                <th className="px-4 py-3 cursor-pointer hover:bg-gray-200" onClick={() => handleHeaderClick('expiresAt')}>
                    Expires {getSortIndicator('expiresAt')}
                </th>
                <th className="px-4 py-3 cursor-pointer hover:bg-gray-200" onClick={() => handleHeaderClick('usedBy')}>
                    Used By {getSortIndicator('usedBy')}
                </th>
                <th className="px-4 py-3 cursor-pointer hover:bg-gray-200" onClick={() => handleHeaderClick('usedAt')}>
                    Used At {getSortIndicator('usedAt')}
                </th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="text-gray-700">
              {processedCoupons.map((coupon) => {
                const expired = isDateExpired(coupon.expiresAt);
                const status = coupon.used ? 'Used' : expired ? 'Expired' : 'Active';
                const statusColor = coupon.used
                  ? 'bg-blue-100 text-blue-800'
                  : expired
                  ? 'bg-red-100 text-red-800'
                  : 'bg-green-100 text-green-800';

                return (
                  <tr key={coupon.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        className="form-checkbox h-4 w-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
                        checked={selectedCouponIds.has(coupon.id)}
                        onChange={(e) => handleSelectCouponChange(coupon.id, e.target.checked)}
                        aria-label={`Select coupon ${coupon.code}`}
                      />
                    </td>
                    <td className="px-4 py-3 font-mono">{coupon.code}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusColor}`}>
                        {status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">{formatDateTime(coupon.createdAt)}</td>
                    <td className="px-4 py-3 text-sm">{formatDate(coupon.expiresAt)}</td>
                    <td className="px-4 py-3 text-sm">{coupon.usedBy || 'N/A'}</td>
                    <td className="px-4 py-3 text-sm">{coupon.usedAt ? formatDateTime(coupon.usedAt) : 'N/A'}</td>
                    <td className="px-4 py-3 text-sm">
                      {!coupon.used && !expired && (
                        <button
                          onClick={() => deactivateSingleCoupon(coupon.id)}
                          className="text-red-600 hover:text-red-800 disabled:opacity-50 disabled:cursor-not-allowed"
                          disabled={loading}
                        >
                          Deactivate
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        title="Confirm Deactivation"
        message={`Are you sure you want to deactivate the selected ${selectedCouponIds.size} coupon(s)? This action cannot be undone.`}
        onConfirm={handleDeleteSelectedCoupons}
        onClose={() => setIsDeleteModalOpen(false)}
        confirmButtonText="Deactivate"
        confirmButtonColor='red'
        isLoading={loading}
      />
    </>
  );
};

export default AdminCoupons;
