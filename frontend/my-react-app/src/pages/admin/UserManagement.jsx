import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardShell from '../../components/DashboardShell';
import Pagination from '../../components/Pagination';
import useDebouncedValue from '../../hooks/useDebouncedValue';
import { getAuthToken } from '../../utils/auth';
import { confirmAction, showSuccess } from '../../utils/alert';

const API_URL = 'http://localhost:5000/api/admin';
async function parseResponse(response) { const text = await response.text(); try { return text ? JSON.parse(text) : {}; } catch { throw new Error(`The server returned an unexpected response (${response.status}).`); } }

export default function UserManagement({ role }) {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState([]); const [search, setSearch] = useState(''); const [page, setPage] = useState(1); const [totalPages, setTotalPages] = useState(1); const [error, setError] = useState(''); const [loading, setLoading] = useState(true);
  const label = role === 'owner' ? 'Owners' : 'Users'; 
  const debouncedSearch = useDebouncedValue(search); 

  useEffect(() => { 
    async function loadAccounts() { 
      setLoading(true); setError(''); 
      try { 
        const params = new URLSearchParams({ role, search: debouncedSearch, page: String(page), limit: '5' }); 
        const response = await fetch(`${API_URL}/users?${params}`, { 
          headers: { Authorization: `Bearer ${getAuthToken()}` } 
        }); 
        const data = await parseResponse(response); 
        if (!response.ok) throw new Error(data.message || `Unable to load ${label.toLowerCase()}.`); 
        setAccounts(data.users); 
        setTotalPages(data.totalPages); 
      } catch (requestError) { 
        setError(requestError.message); 
      } finally { 
        setLoading(false); 
      } 
    } 
    loadAccounts(); 
  }, [role, debouncedSearch, page, label]);

  async function updateBlock(account) {
    const action = account.isBlocked ? 'unblock' : 'block';
    const confirmed = await confirmAction({
      title: `${action.toUpperCase()} Account?`,
      text: `Are you sure you want to ${action} ${account.name}?`,
      icon: 'warning',
      confirmButtonText: `Yes, ${action}`,
      danger: !account.isBlocked
    });
    if (!confirmed) return;

    try {
      const response = await fetch(`${API_URL}/users/${account._id}/block`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${getAuthToken()}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isBlocked: !account.isBlocked })
      });
      const data = await parseResponse(response);
      if (!response.ok) throw new Error(data.message || `Unable to ${action} account.`);
      setAccounts((items) => items.map((item) => (item._id === account._id ? data.user : item)));
      showSuccess(`Account ${action}ed`, `${account.name} has been ${action}ed successfully.`);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  async function deleteAccount(account) {
    const confirmed = await confirmAction({
      title: `Delete ${account.name}?`,
      text: `Are you sure you want to delete ${account.name}'s account? This action cannot be undone.`,
      icon: 'warning',
      confirmButtonText: 'Yes, delete account',
      danger: true
    });
    if (!confirmed) return;

    try {
      const response = await fetch(`${API_URL}/users/${account._id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${getAuthToken()}` } });
      const data = await parseResponse(response);
      if (!response.ok) throw new Error(data.message || 'Unable to delete account.');
      setAccounts((items) => items.filter((item) => item._id !== account._id));
      showSuccess('Account Deleted', `${account.name}'s account has been removed.`);
    } catch (requestError) {
      setError(requestError.message);
    }
  }

  return <DashboardShell role="admin" title={`${label} management`} subtitle={`View and manage all platform ${label.toLowerCase()}`}><section className="managementCard"><div className="panelTitle"><div><h2>{label}</h2><p>Search, review, and manage accounts</p></div>{role === 'owner' && <button className="dashAction" onClick={() => navigate('/admin/owners/new')}>+ Create owner</button>}</div><input className="managementSearch" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder={`Search ${label.toLowerCase()} by name, email, or phone`} />{error && <p className="authError" role="alert">{error}</p>}{loading ? <p className="managementEmpty">Loading {label.toLowerCase()}...</p> : accounts.length === 0 ? <p className="managementEmpty">No {label.toLowerCase()} found.</p> : <div className="accountTable"><div className="accountRow accountHead"><span>Name</span><span>Contact</span><span>Status</span><span>Actions</span></div>{accounts.map((account) => <div className="accountRow" key={account._id}><span><b>{account.name}</b><small>Joined {new Date(account.createdAt).toLocaleDateString()}</small></span><span><small>{account.email}</small><small>{account.phone}</small></span><span><em className={account.isBlocked ? 'blocked' : ''}>{account.isBlocked ? 'Blocked' : 'Active'}</em></span><span className="accountActions"><button className="detailIcon" title="View full details" onClick={() => navigate(`/admin/${role}s/${account._id}`)}>ⓘ</button><button onClick={() => updateBlock(account)}>{account.isBlocked ? 'Unblock' : 'Block'}</button><button className="deleteButton" onClick={() => deleteAccount(account)}>Delete</button></span></div>)}</div>}<Pagination page={page} totalPages={totalPages} onChange={setPage} /></section></DashboardShell>;
}

