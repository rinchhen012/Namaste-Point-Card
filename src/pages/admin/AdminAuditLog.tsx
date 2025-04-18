import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, getDocs, where } from 'firebase/firestore';
import { db } from '../../firebase/config';

interface AuditLogEntry {
  id: string;
  adminId: string;
  action: string;
  targetId?: string;
  details?: Record<string, unknown>;
  timestamp?: { seconds: number; nanoseconds: number };
}

const AdminAuditLog: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterAction, setFilterAction] = useState('');
  const [filterAdminId, setFilterAdminId] = useState('');

  useEffect(() => {
    const fetchLogs = async () => {
      setLoading(true);
      setError(null);
      try {
        let q = query(
          collection(db, 'admin_audit_log'),
          orderBy('timestamp', 'desc'),
          limit(100)
        );
        // Filtering (client-side for simplicity)
        const snapshot = await getDocs(q);
        let entries = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as AuditLogEntry[];
        if (filterAction) {
          entries = entries.filter(log => log.action === filterAction);
        }
        if (filterAdminId) {
          entries = entries.filter(log => log.adminId === filterAdminId);
        }
        setLogs(entries);
      } catch (err) {
        setError('Failed to load audit logs.');
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, [filterAction, filterAdminId]);

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-semibold mb-4">Admin Audit Log</h1>
      <div className="mb-4 flex gap-4">
        <input
          type="text"
          placeholder="Filter by action"
          value={filterAction}
          onChange={e => setFilterAction(e.target.value)}
          className="border px-2 py-1 rounded"
        />
        <input
          type="text"
          placeholder="Filter by adminId"
          value={filterAdminId}
          onChange={e => setFilterAdminId(e.target.value)}
          className="border px-2 py-1 rounded"
        />
      </div>
      {loading ? (
        <div>Loading...</div>
      ) : error ? (
        <div className="text-red-600">{error}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="px-3 py-2 border">Timestamp</th>
                <th className="px-3 py-2 border">Admin ID</th>
                <th className="px-3 py-2 border">Action</th>
                <th className="px-3 py-2 border">Target ID</th>
                <th className="px-3 py-2 border">Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(log => (
                <tr key={log.id} className="border-b hover:bg-gray-50">
                  <td className="px-3 py-2 border">
                    {log.timestamp &&
                      new Date(log.timestamp.seconds * 1000).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 border">{log.adminId}</td>
                  <td className="px-3 py-2 border">{log.action}</td>
                  <td className="px-3 py-2 border">{log.targetId || '-'}</td>
                  <td className="px-3 py-2 border whitespace-pre-wrap text-xs">
                    {log.details ? JSON.stringify(log.details, null, 2) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AdminAuditLog;
