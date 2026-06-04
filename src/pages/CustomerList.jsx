import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Search, Filter, ChevronUp, ChevronDown, Users, X
} from 'lucide-react';
import { getCustomers } from '../services/firebase/firestore';
import StatusBadge from '../components/StatusBadge';

const STATUSES = ['All', 'New', 'Verified', 'Match Suggested', 'Match Sent', 'Interested', 'Meeting Scheduled', 'In Discussion', 'Closed'];
const GENDERS = ['All', 'Male', 'Female'];

export default function CustomerList() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('filter') || 'All');
  const [genderFilter, setGenderFilter] = useState('All');
  const [sortField, setSortField] = useState('firstName');
  const [sortDir, setSortDir] = useState('asc');

  useEffect(() => {
    getCustomers()
      .then(setCustomers)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const toggleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const filtered = useMemo(() => {
    let list = [...customers];
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(c =>
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(s) ||
        c.city?.toLowerCase().includes(s) ||
        c.designation?.toLowerCase().includes(s) ||
        c.company?.toLowerCase().includes(s)
      );
    }
    if (statusFilter !== 'All') list = list.filter(c => c.status === statusFilter);
    if (genderFilter !== 'All') list = list.filter(c => c.gender === genderFilter);
    list.sort((a, b) => {
      let va = a[sortField] ?? '';
      let vb = b[sortField] ?? '';
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      return sortDir === 'asc' ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
    });
    return list;
  }, [customers, search, statusFilter, genderFilter, sortField, sortDir]);

  const SortIcon = ({ field }) => {
    if (sortField !== field) return null;
    return sortDir === 'asc' ? <ChevronUp size={13} /> : <ChevronDown size={13} />;
  };

  const th = 'px-5 py-3.5 text-left text-xs font-semibold uppercase tracking-wider select-none';

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-start justify-between mb-6"
      >
        <div>
          <h1 className="page-title">Customers</h1>
          <p className="page-subtitle">
            {loading ? 'Loading...' : `${filtered.length} of ${customers.length} profiles`}
          </p>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="card rounded-xl p-4 mb-5"
      >
        <div className="flex flex-wrap gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-64">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, city, company..."
              className="input-field pl-9 py-2 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={14} />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <select
            className="input-field py-2 text-sm"
            style={{ width: 'auto', minWidth: '160px' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            {STATUSES.map(s => <option key={s}>{s}</option>)}
          </select>

          {/* Gender Filter */}
          <div className="flex rounded-lg overflow-hidden" style={{ border: '1.5px solid #e4cfa8' }}>
            {GENDERS.map(g => (
              <button
                key={g}
                onClick={() => setGenderFilter(g)}
                className="px-4 py-2 text-sm font-medium transition-all"
                style={
                  genderFilter === g
                    ? { background: 'linear-gradient(135deg, #c9a84c, #b8920e)', color: 'white' }
                    : { background: 'white', color: '#4a3f2f' }
                }
              >
                {g}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="card rounded-xl overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr style={{ background: '#fdfaf6', borderBottom: '1.5px solid #f0e4cc' }}>
                <th className={th} style={{ color: '#9a7a0a' }}>Customer</th>
                <th
                  className={`${th} cursor-pointer hover:text-gold-600`}
                  style={{ color: '#9a7a0a' }}
                  onClick={() => toggleSort('age')}
                >
                  <span className="flex items-center gap-1">Age <SortIcon field="age" /></span>
                </th>
                <th
                  className={`${th} cursor-pointer`}
                  style={{ color: '#9a7a0a' }}
                  onClick={() => toggleSort('city')}
                >
                  <span className="flex items-center gap-1">City <SortIcon field="city" /></span>
                </th>
                <th className={th} style={{ color: '#9a7a0a' }}>Marital Status</th>
                <th className={th} style={{ color: '#9a7a0a' }}>Religion</th>
                <th className={th} style={{ color: '#9a7a0a' }}>Status</th>
                <th className={th} style={{ color: '#9a7a0a' }}></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #fdfaf6' }}>
                    {[1,2,3,4,5,6,7].map(j => (
                      <td key={j} className="px-5 py-4">
                        <div className="h-3 rounded shimmer w-20" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-gray-400">
                    <Users size={36} className="mx-auto mb-3 opacity-40" />
                    <p>No customers match your filters.</p>
                  </td>
                </tr>
              ) : (
                filtered.map((c, i) => (
                  <motion.tr
                    key={c.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: Math.min(i * 0.02, 0.4) }}
                    onClick={() => navigate(`/customers/${c.id}`)}
                    className="cursor-pointer group transition-colors"
                    style={{ borderBottom: '1px solid #fdfaf6' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(253,250,246,0.8)'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <img
                          src={c.photo || `https://ui-avatars.com/api/?name=${c.firstName}&background=c9a84c&color=fff`}
                          alt={c.firstName}
                          className="w-10 h-10 rounded-xl object-cover flex-shrink-0"
                          style={{ border: '2px solid #f0e4cc' }}
                          onError={e => { e.target.src = `https://ui-avatars.com/api/?name=${c.firstName}+${c.lastName}&background=c9a84c&color=fff`; }}
                        />
                        <div>
                          <p className="font-semibold text-sm text-gray-800">
                            {c.firstName} {c.lastName}
                          </p>
                          <p className="text-xs text-gray-400">{c.designation}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-600">{c.age}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-600">{c.city}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-500">{c.maritalStatus}</td>
                    <td className="px-5 py-3.5 text-sm text-gray-500">{c.religion}</td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={c.status} size="sm" />
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className="text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1"
                        style={{ color: '#b8920e' }}
                      >
                        View Profile →
                      </span>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        {!loading && filtered.length > 0 && (
          <div
            className="px-5 py-3 flex items-center justify-between text-xs text-gray-400"
            style={{ borderTop: '1px solid #f0e4cc' }}
          >
            <span>Showing {filtered.length} profiles</span>
            <span>{customers.filter(c => c.gender === 'Male').length}M · {customers.filter(c => c.gender === 'Female').length}F</span>
          </div>
        )}
      </motion.div>
    </div>
  );
}
