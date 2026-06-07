import React, { useState, useEffect } from 'react';
import { format, addDays, subDays } from 'date-fns';
import { supabase } from '../../lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Plus, ChevronLeft, ChevronRight, Clock, CheckCircle2, XCircle, Link as LinkIcon } from 'lucide-react';
import OnboardModal from '../../components/admin/OnboardModal';
import EditClipperModal from '../../components/admin/EditClipperModal';

const AdminDashboard = () => {
  const [clippers, setClippers] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [posts, setPosts] = useState([]);
  const [quota, setQuota] = useState(4);
  const [pendingUsers, setPendingUsers] = useState([]);

  const [selectedClipper, setSelectedClipper] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showOnboardModal, setShowOnboardModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPendingUser, setSelectedPendingUser] = useState(null);

  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    fetchData();
  }, [currentDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const dateStr = format(currentDate, 'yyyy-MM-dd');
      const [
        { data: clippersData },
        { data: accountsData },
        { data: postsData },
        { data: settings },
        { data: pendingData }
      ] = await Promise.all([
        supabase.from('clippers').select('*'),
        supabase.from('accounts').select('*'),
        supabase.from('posts').select('*, accounts(account_label)').eq('post_date', dateStr),
        supabase.from('global_settings').select('daily_quota_per_account').single(),
        supabase.from('profiles').select('id, role, clipper_id, created_at').is('clipper_id', null).eq('role', 'clipper')
      ]);

      setClippers(clippersData || []);
      setAccounts(accountsData || []);
      setPosts(postsData || []);
      // Always enforce 4 posts per account per day
      setQuota(4);
      setPendingUsers(pendingData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

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
      const { error } = await supabase.from('clippers').delete().eq('id', clipperId);
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
        <p className="text-text-muted">Loading Admin Dashboard...</p>
      </div>
    );
  }

  const totalQuota = accounts.length * quota;
  const totalSubmitted = posts.length;
  const progressPercent = totalQuota > 0 ? (totalSubmitted / totalQuota) * 100 : 0;

  // ── Clipper Detail View ─────────────────────────────────────────────────
  if (selectedClipper) {
    const clipperAccounts = accounts.filter(a => a.clipper_id === selectedClipper.id);
    const clipperPosts = posts.filter(p => p.clipper_id === selectedClipper.id);
    return (
      <div className="space-y-6">
        <button
          onClick={() => setSelectedClipper(null)}
          className="flex items-center text-sm text-text-muted hover:text-text-main font-medium transition-colors"
        >
          <ChevronLeft className="w-4 h-4 mr-1" /> Back to Overview
        </button>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-gray-100 pb-4 gap-4">
          <div>
            <h1 className="text-2xl font-bold">{selectedClipper.name}</h1>
            <p className="text-text-muted">Reviewing posts for {format(currentDate, 'MMM dd, yyyy')}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => setShowEditModal(true)}>
              Edit Clip
            </Button>
            <Button variant="danger" size="sm" onClick={() => handleDeleteClipper(selectedClipper.id)}>
              Delete Clip
            </Button>
          </div>
        </div>
        <div className="space-y-4">
          {clipperAccounts.length === 0 ? (
            <div className="text-center py-12 bg-surface rounded-xl border border-gray-100 border-dashed">
              <p className="text-text-muted">No accounts assigned to this clipper yet.</p>
            </div>
          ) : (
            clipperAccounts.map(acc => {
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
                              <td className="px-6 py-4">
                                {post.status === 'pending' && <span className="flex items-center gap-1 text-yellow-600"><Clock className="w-4 h-4"/> Pending</span>}
                                {post.status === 'approved' && <span className="flex items-center gap-1 text-green-600"><CheckCircle2 className="w-4 h-4"/> Approved</span>}
                                {post.status === 'rejected' && (
                                  <div className="flex flex-col">
                                    <span className="flex items-center gap-1 text-red-600"><XCircle className="w-4 h-4"/> Rejected</span>
                                    {post.review_note && <span className="text-xs text-text-muted mt-1">{post.review_note}</span>}
                                  </div>
                                )}
                              </td>
                              <td className="px-6 py-4 text-right space-x-2">
                                {post.status === 'pending' && (
                                  <>
                                    <Button size="sm" onClick={() => handleReview(post.id, 'approved')} className="bg-green-600 hover:bg-green-700 text-white">
                                      Approve
                                    </Button>
                                    <Button size="sm" variant="danger" onClick={() => {
                                      const note = prompt('Reason for rejection:');
                                      if (note !== null) handleReview(post.id, 'rejected', note);
                                    }}>
                                      Reject
                                    </Button>
                                  </>
                                )}
                                {post.status !== 'pending' && (
                                  <Button size="sm" variant="secondary" onClick={() => handleReview(post.id, 'pending')}>
                                    Reset
                                  </Button>
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
            })
          )}
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
            <div className="text-2xl font-bold">{clippers.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-text-muted text-sm font-medium mb-2">Total Accounts</div>
            <div className="text-2xl font-bold">{accounts.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-text-muted text-sm font-medium mb-2">Daily Quota</div>
            <div className="text-2xl font-bold">{totalQuota}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-text-muted text-sm font-medium mb-2">Progress</div>
            <div className="text-2xl font-bold">{Math.round(progressPercent)}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Pending Registrations */}
      {pendingUsers.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Pending Registrations</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingUsers.map(user => (
              <Card key={user.id}>
                <CardHeader className="bg-gray-50 border-b border-gray-100 py-4">
                  <CardTitle>{user.id}</CardTitle>
                  <p className="text-text-muted">Created at: {format(new Date(user.created_at), 'PPP')}</p>
                </CardHeader>
                <CardContent className="p-4">
                  <Button variant="primary" size="sm" onClick={() => { setSelectedPendingUser(user); setShowOnboardModal(true); }}>
                    Onboard
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Clippers Status */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Clippers Status</h2>
        <div className="bg-surface rounded-xl border border-gray-100 overflow-hidden">
          {clippers.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-text-muted font-medium">No clippers yet</p>
              <p className="text-text-muted text-sm mt-1">New clippers will appear here once they setup their profile.</p>
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
        </div>
      </div>

      {/* Today's Submissions */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Today's Submissions</h2>
        {posts.length === 0 ? (
          <div className="text-center py-12 bg-surface rounded-xl border border-gray-100 border-dashed">
            <p className="text-text-muted">No clips submitted today.</p>
          </div>
        ) : (
          <div className="bg-surface rounded-xl border border-gray-100 overflow-hidden">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 font-medium text-text-muted">Link</th>
                  <th className="px-4 py-3 font-medium text-text-muted">Account</th>
                  <th className="px-4 py-3 font-medium text-text-muted">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {posts.map(post => (
                  <tr key={post.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 max-w-[200px] truncate">
                      <a href={post.post_url} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline flex items-center gap-1">
                        <LinkIcon className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{post.post_url}</span>
                      </a>
                    </td>
                    <td className="px-4 py-3">{post.accounts?.account_label}</td>
                    <td className="px-4 py-3">
                      {post.status === 'pending' && <span className="flex items-center gap-1 text-yellow-600"><Clock className="w-4 h-4"/> Pending</span>}
                      {post.status === 'approved' && <span className="flex items-center gap-1 text-green-600"><CheckCircle2 className="w-4 h-4"/> Approved</span>}
                      {post.status === 'rejected' && (
                        <div className="flex flex-col">
                          <span className="flex items-center gap-1 text-red-600"><XCircle className="w-4 h-4"/> Rejected</span>
                          {post.review_note && <span className="text-xs text-text-muted mt-1">{post.review_note}</span>}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
