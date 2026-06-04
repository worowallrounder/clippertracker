import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { format, subDays, addDays } from 'date-fns';
import { CheckCircle2, XCircle, Clock, Link as LinkIcon, ChevronLeft, ChevronRight, Plus, UserPlus, X, Trash2, Users } from 'lucide-react';

// ── Onboard Clipper Modal ───────────────────────────────────────────────────
const OnboardModal = ({ pendingUser, onClose, onSaved }) => {
  const [name, setName] = useState('');
  const [accountRows, setAccountRows] = useState([
    { platform: 'tiktok', label: '', url: '' }
  ]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const addRow = () => setAccountRows([...accountRows, { platform: 'tiktok', label: '', url: '' }]);
  const removeRow = (i) => setAccountRows(accountRows.filter((_, idx) => idx !== i));
  const updateRow = (i, field, value) => {
    const updated = [...accountRows];
    updated[i][field] = value;
    setAccountRows(updated);
  };

  const handleSave = async () => {
    setError('');
    if (!name.trim()) { setError('Name is required.'); return; }
    const validAccounts = accountRows.filter(r => r.label.trim() && r.url.trim());
    if (validAccounts.length === 0) { setError('Add at least one account with a label and URL.'); return; }

    setSaving(true);
    try {
      // 1. Create clipper record
      const { data: clipper, error: clipperErr } = await supabase
        .from('clippers')
        .insert({ name: name.trim() })
        .select()
        .single();
      if (clipperErr) throw clipperErr;

      // 2. Create accounts
      const accountInserts = validAccounts.map(a => ({
        clipper_id: clipper.id,
        platform: a.platform,
        account_label: a.label.trim(),
        account_url: a.url.trim(),
      }));
      const { error: accErr } = await supabase.from('accounts').insert(accountInserts);
      if (accErr) throw accErr;

      // 3. Link user profile to clipper
      if (pendingUser) {
        const { error: profErr } = await supabase
          .from('profiles')
          .update({ clipper_id: clipper.id })
          .eq('id', pendingUser.id);
        if (profErr) throw profErr;
      }

      onSaved();
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-surface w-full max-w-lg rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="bg-primary-50 p-2 rounded-lg">
              <UserPlus className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Onboard Clipper</h2>
              {pendingUser && (
                <p className="text-xs text-text-muted">{pendingUser.email}</p>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-md transition-colors">
            <X className="w-5 h-5 text-text-muted" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5 max-h-[60vh] overflow-y-auto">
          {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</div>}

          <div className="space-y-2">
            <label className="text-sm font-medium">Clipper Name</label>
            <Input
              placeholder="e.g. Alex Smith"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Social Accounts</label>
              <button onClick={addRow} className="text-xs text-primary-600 hover:underline font-medium flex items-center gap-1">
                <Plus className="w-3 h-3" /> Add Account
              </button>
            </div>

            {accountRows.map((row, i) => (
              <div key={i} className="flex items-start gap-2 bg-gray-50 p-3 rounded-lg">
                <select
                  className="h-10 rounded-lg border border-gray-200 bg-surface px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  value={row.platform}
                  onChange={e => updateRow(i, 'platform', e.target.value)}
                >
                  <option value="tiktok">TikTok</option>
                  <option value="instagram">Instagram</option>
                </select>
                <Input
                  placeholder="Label (e.g. Main)"
                  className="flex-1"
                  value={row.label}
                  onChange={e => updateRow(i, 'label', e.target.value)}
                />
                <Input
                  placeholder="URL"
                  className="flex-1"
                  value={row.url}
                  onChange={e => updateRow(i, 'url', e.target.value)}
                />
                {accountRows.length > 1 && (
                  <button onClick={() => removeRow(i)} className="mt-2 text-red-400 hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save & Activate'}
          </Button>
        </div>
      </div>
    </div>
  );
};


// ── Edit Clipper Modal ──────────────────────────────────────────────────────
const EditClipperModal = ({ clipper, clipperAccounts, onClose, onSaved }) => {
  const [name, setName] = useState(clipper.name);
  const [accountRows, setAccountRows] = useState(
    clipperAccounts.map(a => ({
      id: a.id,
      platform: a.platform,
      label: a.account_label,
      url: a.account_url
    }))
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (accountRows.length === 0) {
      setAccountRows([{ platform: 'tiktok', label: '', url: '' }]);
    }
  }, []);

  const addRow = () => setAccountRows([...accountRows, { platform: 'tiktok', label: '', url: '' }]);
  const removeRow = (i) => setAccountRows(accountRows.filter((_, idx) => idx !== i));
  const updateRow = (i, field, value) => {
    const updated = [...accountRows];
    updated[i][field] = value;
    setAccountRows(updated);
  };

  const handleSave = async () => {
    setError('');
    if (!name.trim()) { setError('Name is required.'); return; }
    
    const validAccounts = accountRows.filter(r => r.label.trim() && r.url.trim());
    if (validAccounts.length === 0) { setError('Add at least one account with a label and URL.'); return; }

    setSaving(true);
    try {
      // 1. Update clipper name
      const { error: clipperErr } = await supabase
        .from('clippers')
        .update({ name: name.trim() })
        .eq('id', clipper.id);
      if (clipperErr) throw clipperErr;

      // 2. Determine accounts to delete
      const originalIds = clipperAccounts.map(a => a.id);
      const currentIds = validAccounts.filter(r => r.id).map(r => r.id);
      const toDelete = originalIds.filter(id => !currentIds.includes(id));

      if (toDelete.length > 0) {
        const { error: delErr } = await supabase.from('accounts').delete().in('id', toDelete);
        if (delErr) throw delErr;
      }

      // 3. Update existing accounts & insert new ones
      const toInsert = [];
      for (const acc of validAccounts) {
        if (acc.id) {
          const { error: updErr } = await supabase
            .from('accounts')
            .update({
              platform: acc.platform,
              account_label: acc.label.trim(),
              account_url: acc.url.trim()
            })
            .eq('id', acc.id);
          if (updErr) throw updErr;
        } else {
          toInsert.push({
            clipper_id: clipper.id,
            platform: acc.platform,
            account_label: acc.label.trim(),
            account_url: acc.url.trim()
          });
        }
      }

      if (toInsert.length > 0) {
        const { error: insErr } = await supabase.from('accounts').insert(toInsert);
        if (insErr) throw insErr;
      }

      onSaved();
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-surface w-full max-w-lg rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="bg-primary-50 p-2 rounded-lg">
              <UserPlus className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Edit Clipper</h2>
              <p className="text-xs text-text-muted">Modify clipper details and social accounts</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-md transition-colors">
            <X className="w-5 h-5 text-text-muted" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5 max-h-[60vh] overflow-y-auto">
          {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{error}</div>}

          <div className="space-y-2">
            <label className="text-sm font-medium">Clipper Name</label>
            <Input
              placeholder="e.g. Alex Smith"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Social Accounts</label>
              <button onClick={addRow} className="text-xs text-primary-600 hover:underline font-medium flex items-center gap-1">
                <Plus className="w-3 h-3" /> Add Account
              </button>
            </div>

            {accountRows.map((row, i) => (
              <div key={i} className="flex items-start gap-2 bg-gray-50 p-3 rounded-lg">
                <select
                  className="h-10 rounded-lg border border-gray-200 bg-surface px-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  value={row.platform}
                  onChange={e => updateRow(i, 'platform', e.target.value)}
                >
                  <option value="tiktok">TikTok</option>
                  <option value="instagram">Instagram</option>
                </select>
                <Input
                  placeholder="Label (e.g. Main)"
                  className="flex-1"
                  value={row.label}
                  onChange={e => updateRow(i, 'label', e.target.value)}
                />
                <Input
                  placeholder="URL"
                  className="flex-1"
                  value={row.url}
                  onChange={e => updateRow(i, 'url', e.target.value)}
                />
                {accountRows.length > 1 && (
                  <button onClick={() => removeRow(i)} className="mt-2 text-red-400 hover:text-red-600 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
};


// ── Admin Dashboard ─────────────────────────────────────────────────────────
const AdminDashboard = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [clippers, setClippers] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [posts, setPosts] = useState([]);
  const [quota, setQuota] = useState(10);
  const [styles, setStyles] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  
  const [selectedClipper, setSelectedClipper] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showOnboardModal, setShowOnboardModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPendingUser, setSelectedPendingUser] = useState(null);

  const dateStr = format(currentDate, 'yyyy-MM-dd');

  useEffect(() => {
    fetchData();
  }, [currentDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [
        { data: clippersData },
        { data: accountsData },
        { data: postsData },
        { data: settings },
        { data: stylesData },
        { data: pendingData }
      ] = await Promise.all([
        supabase.from('clippers').select('*'),
        supabase.from('accounts').select('*'),
        supabase.from('posts').select('*, styles(name), accounts(account_label)').eq('post_date', dateStr),
        supabase.from('global_settings').select('daily_quota_per_account').single(),
        supabase.from('styles').select('*'),
        supabase.from('profiles').select('id, role, clipper_id, created_at').is('clipper_id', null).eq('role', 'clipper')
      ]);

      setClippers(clippersData || []);
      setAccounts(accountsData || []);
      setPosts(postsData || []);
      if (settings) setQuota(settings.daily_quota_per_account);
      setStyles(stylesData || []);
      setPendingUsers(pendingData || []);

      // If a clipper is currently selected, update their details to show the edited values
      if (selectedClipper) {
        const found = (clippersData || []).find(c => c.id === selectedClipper.id);
        if (found) {
          setSelectedClipper(found);
        } else {
          setSelectedClipper(null);
        }
      }

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch user emails for pending users (auth.users is not directly queryable via client,
  // so we'll show the profile id and created_at — admin can also check Supabase Auth dashboard)
  // We'll try to get email from supabase auth admin if available, otherwise show ID.
  const [pendingEmails, setPendingEmails] = useState({});
  useEffect(() => {
    // We can try to fetch user metadata from profiles by joining auth — 
    // but since Supabase client can't query auth.users, we'll use a workaround:
    // The admin can see users in Supabase dashboard. For now, show created_at and partial ID.
  }, [pendingUsers]);

  const handleReview = async (postId, status, note = null) => {
    try {
      const { error } = await supabase
        .from('posts')
        .update({ status, review_note: note, reviewed_by: 'Admin' })
        .eq('id', postId);
        
      if (error) throw error;
      fetchData();
    } catch (err) {
      alert('Error updating post: ' + err.message);
    }
  };

  const handleOnboardSaved = () => {
    setShowOnboardModal(false);
    setSelectedPendingUser(null);
    fetchData();
  };

  const handleEditSaved = () => {
    setShowEditModal(false);
    fetchData();
  };

  const handleDeleteClipper = async (clipperId) => {
    const clipper = clippers.find(c => c.id === clipperId);
    if (!clipper) return;
    
    const confirmDelete = window.confirm(
      `Are you sure you want to delete Clipper "${clipper.name}"?\nThis will permanently delete all their accounts, submitted posts, and disconnect any linked users.`
    );
    
    if (!confirmDelete) return;

    try {
      const { error } = await supabase
        .from('clippers')
        .delete()
        .eq('id', clipperId);

      if (error) throw error;

      setSelectedClipper(null);
      fetchData();
    } catch (err) {
      alert('Error deleting clipper: ' + err.message);
    }
  };

  if (loading && clippers.length === 0 && pendingUsers.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-text-muted">Loading Admin Dashboard...</div>
      </div>
    );
  }

  const totalQuota = accounts.length * quota;
  const totalSubmitted = posts.length;
  const pendingReviews = posts.filter(p => p.status === 'pending').length;
  const progressPercent = totalQuota > 0 ? (totalSubmitted / totalQuota) * 100 : 0;

  // ── Clipper Detail View ─────────────────────────────────────────────────
  if (selectedClipper) {
    const clipperAccounts = accounts.filter(a => a.clipper_id === selectedClipper.id);
    const clipperPosts = posts.filter(p => p.clipper_id === selectedClipper.id);

    return (
      <div className="space-y-6">
        <button onClick={() => setSelectedClipper(null)} className="flex items-center text-sm text-text-muted hover:text-text-main font-medium transition-colors">
          <ChevronLeft className="w-4 h-4 mr-1" /> Back to Overview
        </button>
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-100 pb-4 gap-4">
          <div>
            <h1 className="text-2xl font-bold">{selectedClipper.name}</h1>
            <p className="text-text-muted">Reviewing posts for {format(currentDate, 'MMM dd, yyyy')}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowEditModal(true)}>
              Edit Clipper
            </Button>
            <Button variant="danger" size="sm" onClick={() => handleDeleteClipper(selectedClipper.id)}>
              Delete Clipper
            </Button>
          </div>
        </div>

        <div className="space-y-4">
          {clipperAccounts.length === 0 ? (
            <div className="text-center py-12 bg-surface rounded-xl border border-gray-100 border-dashed">
              <p className="text-text-muted">No accounts assigned to this clipper yet.</p>
            </div>
          ) : clipperAccounts.map(acc => {
            const accPosts = clipperPosts.filter(p => p.account_id === acc.id);
            return (
              <Card key={acc.id}>
                <CardHeader className="bg-gray-50 border-b border-gray-100 py-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>{acc.account_label}</CardTitle>
                      <span className="text-xs uppercase text-text-muted">{acc.platform}</span>
                    </div>
                    <div className="text-sm font-semibold">
                      {accPosts.length} / {quota} Submitted
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  {accPosts.length === 0 ? (
                    <div className="p-6 text-center text-text-muted text-sm">No posts submitted.</div>
                  ) : (
                    <table className="w-full text-sm text-left">
                      <thead className="border-b border-gray-100 bg-white">
                        <tr>
                          <th className="px-6 py-3 font-medium text-text-muted">Link</th>
                          <th className="px-6 py-3 font-medium text-text-muted">Style</th>
                          <th className="px-6 py-3 font-medium text-text-muted">Status</th>
                          <th className="px-6 py-3 font-medium text-text-muted text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {accPosts.map(post => (
                          <tr key={post.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 max-w-[200px] truncate">
                              <a href={post.post_url} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline flex items-center gap-1">
                                <LinkIcon className="w-3 h-3 flex-shrink-0" />
                                <span className="truncate">{post.post_url}</span>
                              </a>
                            </td>
                            <td className="px-6 py-4"><span className="bg-gray-100 px-2 py-1 rounded-md text-xs">{post.styles?.name}</span></td>
                            <td className="px-6 py-4">
                              {post.status === 'pending' && <span className="text-yellow-600 font-medium">Pending</span>}
                              {post.status === 'approved' && <span className="text-green-600 font-medium">Approved</span>}
                              {post.status === 'rejected' && <span className="text-red-600 font-medium">Rejected</span>}
                            </td>
                            <td className="px-6 py-4 text-right space-x-2">
                              {post.status === 'pending' && (
                                <>
                                  <Button size="sm" onClick={() => handleReview(post.id, 'approved')} className="bg-green-600 hover:bg-green-700">Approve</Button>
                                  <Button size="sm" variant="danger" onClick={() => {
                                    const note = prompt('Reason for rejection:');
                                    if (note !== null) handleReview(post.id, 'rejected', note);
                                  }}>Reject</Button>
                                </>
                              )}
                              {post.status !== 'pending' && (
                                <Button size="sm" variant="secondary" onClick={() => handleReview(post.id, 'pending')}>Reset</Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Main Overview ───────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Onboard Modal */}
      {showOnboardModal && (
        <OnboardModal 
          pendingUser={selectedPendingUser} 
          onClose={() => { setShowOnboardModal(false); setSelectedPendingUser(null); }} 
          onSaved={handleOnboardSaved} 
        />
      )}

      {/* Edit Clipper Modal */}
      {showEditModal && selectedClipper && (
        <EditClipperModal
          clipper={selectedClipper}
          clipperAccounts={accounts.filter(a => a.clipper_id === selectedClipper.id)}
          onClose={() => setShowEditModal(false)}
          onSaved={handleEditSaved}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
          <p className="text-text-muted">Manage clippers and review daily content.</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-surface border border-gray-200 rounded-lg p-1">
            <button onClick={() => setCurrentDate(subDays(currentDate, 1))} className="p-1 hover:bg-gray-100 rounded-md transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="px-4 text-sm font-medium">{format(currentDate, 'MMM dd, yyyy')}</span>
            <button onClick={() => setCurrentDate(addDays(currentDate, 1))} className="p-1 hover:bg-gray-100 rounded-md transition-colors">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
          <Button className="gap-2" onClick={() => { setSelectedPendingUser(null); setShowOnboardModal(true); }}>
            <Plus className="w-4 h-4" /> New Clipper
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-text-muted text-sm font-medium mb-2">Total Clippers</div>
            <div className="text-3xl font-bold">{clippers.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-text-muted text-sm font-medium mb-2">Posts Today</div>
            <div className="text-3xl font-bold">{totalSubmitted} <span className="text-sm font-normal text-text-muted">/ {totalQuota}</span></div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-text-muted text-sm font-medium mb-2">Completion</div>
            <div className="text-3xl font-bold">{Math.round(progressPercent)}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-text-muted text-sm font-medium mb-2">Pending Reviews</div>
            <div className="text-3xl font-bold text-yellow-600">{pendingReviews}</div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Registrations */}
      {pendingUsers.length > 0 && (
        <Card className="border-yellow-200 bg-yellow-50/30">
          <CardHeader>
            <div className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-yellow-600" />
              <CardTitle className="text-yellow-800">Pending Registrations ({pendingUsers.length})</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm text-left">
              <thead className="bg-yellow-50 border-b border-yellow-100">
                <tr>
                  <th className="px-6 py-3 font-medium text-yellow-800">User ID</th>
                  <th className="px-6 py-3 font-medium text-yellow-800">Registered</th>
                  <th className="px-6 py-3 font-medium text-yellow-800 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-yellow-100">
                {pendingUsers.map(pu => (
                  <tr key={pu.id} className="hover:bg-yellow-50/50">
                    <td className="px-6 py-4 font-mono text-xs">{pu.id.substring(0, 8)}...</td>
                    <td className="px-6 py-4 text-text-muted">{format(new Date(pu.created_at), 'MMM dd, yyyy HH:mm')}</td>
                    <td className="px-6 py-4 text-right">
                      <Button size="sm" onClick={() => { setSelectedPendingUser(pu); setShowOnboardModal(true); }} className="gap-1">
                        <UserPlus className="w-3 h-3" /> Set Up
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Clippers Status Table */}
      <Card>
        <CardHeader>
          <CardTitle>Clippers Status</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {clippers.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-text-muted font-medium">No clippers yet</p>
              <p className="text-text-muted text-sm mt-1">Click "New Clipper" above to onboard your first clipper.</p>
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 font-medium text-text-muted">Clipper</th>
                  <th className="px-6 py-4 font-medium text-text-muted">Progress (Accounts)</th>
                  <th className="px-6 py-4 font-medium text-text-muted text-right">Pending</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {clippers.map(clipper => {
                  const clipperPosts = posts.filter(p => p.clipper_id === clipper.id);
                  const clipperAccounts = accounts.filter(a => a.clipper_id === clipper.id);
                  const expectedPosts = clipperAccounts.length * quota;
                  const progress = expectedPosts > 0 ? Math.min((clipperPosts.length / expectedPosts) * 100, 100) : 0;
                  const pendingCount = clipperPosts.filter(p => p.status === 'pending').length;

                  return (
                    <tr key={clipper.id} className="hover:bg-gray-50 cursor-pointer transition-colors" onClick={() => setSelectedClipper(clipper)}>
                      <td className="px-6 py-4 font-medium">{clipper.name}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-full max-w-[200px] h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all ${progress === 100 ? 'bg-green-500' : 'bg-primary-500'}`} 
                              style={{ width: `${progress}%` }} 
                            />
                          </div>
                          <span className="text-xs text-text-muted w-12">{clipperPosts.length}/{expectedPosts}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {pendingCount > 0 ? (
                          <span className="inline-flex items-center px-2 py-1 bg-yellow-50 text-yellow-700 text-xs font-medium rounded-md">
                            {pendingCount} pending
                          </span>
                        ) : (
                          <span className="text-text-muted text-xs">0</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
