import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { format } from 'date-fns';
import { CheckCircle2, XCircle, Clock, Link as LinkIcon, Send } from 'lucide-react';

const ClipperDashboard = () => {
  const { profile } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quota, setQuota] = useState(4);
  
  const [form, setForm] = useState({ urls: '', account_id: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const today = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    if (profile) {
      if (profile.clipper_id) {
        fetchData();
      } else {
        setLoading(false);
      }
    }
  }, [profile]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: accData } = await supabase
        .from('accounts')
        .select('*')
        .eq('clipper_id', profile.clipper_id);
      
      if (accData) setAccounts(accData);

      const { data: settings } = await supabase.from('global_settings').select('daily_quota_per_account').single();
      // Enforce a fixed quota of 4 posts per account per day
      setQuota(4);

      const { data: postData } = await supabase
        .from('posts')
        .select('*, accounts(account_label)')
        .eq('clipper_id', profile.clipper_id)
        .eq('post_date', today);
        
      if (postData) setPosts(postData);

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const validateUrl = (url, platform) => {
    try {
      const parsed = new URL(url);
      if (platform === 'tiktok' && !parsed.hostname.includes('tiktok.com')) return false;
      if (platform === 'instagram' && !parsed.hostname.includes('instagram.com')) return false;
      return true;
    } catch {
      return false;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!form.account_id || !form.urls) {
      setError('Please select an account and paste your URLs.');
      return;
    }

    const selectedAccount = accounts.find(a => a.id === form.account_id);
    
    const urlList = form.urls
      .split(/[\n,]+/)
      .map(u => u.trim())
      .filter(u => u.length > 0);

    // Check how many posts already exist for this account today
    const existingPosts = posts.filter(p => p.account_id === form.account_id);
    const remaining = quota - existingPosts.length;

    if (urlList.length > remaining) {
      setError(`You can only submit ${remaining} more post(s) for this account today. (Quota: ${quota})`);
      return;
    }

    const invalidUrls = urlList.filter(url => !validateUrl(url, selectedAccount.platform));
    if (invalidUrls.length > 0) {
      setError(`Some URLs do not match the selected platform (${selectedAccount.platform}): ${invalidUrls[0]}`);
      return;
    }

    setSubmitting(true);
    
    try {
      const inserts = urlList.map(url => ({
        clipper_id: profile.clipper_id,
        account_id: form.account_id,
        post_url: url,
        post_date: today,
        status: 'pending'
      }));

      const { error: insertError } = await supabase.from('posts').insert(inserts);
      
      if (insertError) throw insertError;
      
      setSuccess(`Successfully submitted ${urlList.length} post(s)!`);
      setForm({ urls: '', account_id: '' });
      fetchData();
    } catch (err) {
      setError(err.message || 'Error submitting posts.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div>Loading dashboard...</div>;

  if (!profile?.clipper_id) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center space-y-4">
        <div className="bg-primary-50 p-4 rounded-full">
          <Clock className="w-8 h-8 text-primary-600" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight">Account Pending Setup</h2>
        <p className="text-text-muted max-w-md mx-auto">
          Your account was created successfully! However, your admin has not yet linked you to your specific TikTok/Instagram accounts. Please let your admin know you have registered.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Your Dashboard</h1>
        <p className="text-text-muted">Submit your completed clips and track your daily quota ({quota} posts per account).</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {accounts.map(acc => {
          const accPosts = posts.filter(p => p.account_id === acc.id);
          const progress = Math.min((accPosts.length / quota) * 100, 100);
          
          return (
            <Card key={acc.id}>
              <CardContent className="p-4 sm:p-6 flex flex-col justify-between h-full space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-semibold text-lg">{acc.account_label}</h3>
                    <span className="text-xs text-text-muted uppercase tracking-wider">{acc.platform}</span>
                  </div>
                  <div className="text-2xl font-bold text-primary-600">
                    {accPosts.length}<span className="text-sm text-text-muted font-normal">/{quota}</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all ${progress === 100 ? 'bg-green-500' : 'bg-primary-500'}`} 
                      style={{ width: `${progress}%` }} 
                    />
                  </div>
                  <p className="text-xs text-text-muted text-right">{Math.round(progress)}% completed</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Submit Clips</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-md">{error}</div>}
                {success && <div className="text-sm text-green-600 bg-green-50 p-3 rounded-md">{success}</div>}
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Account</label>
                  <select 
                    className="flex h-10 w-full rounded-lg border border-gray-200 bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    value={form.account_id}
                    onChange={e => setForm({...form, account_id: e.target.value})}
                  >
                    <option value="">Select Account</option>
                    {accounts.map(acc => {
                      const accPosts = posts.filter(p => p.account_id === acc.id);
                      const remaining = quota - accPosts.length;
                      return (
                        <option key={acc.id} value={acc.id}>
                          {acc.account_label} ({acc.platform}) — {remaining > 0 ? `${remaining} left` : 'Full'}
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium flex justify-between">
                    <span>URLs</span>
                    <span className="text-text-muted font-normal text-xs">One per line, or comma separated</span>
                  </label>
                  <textarea 
                    className="flex min-h-[120px] w-full rounded-lg border border-gray-200 bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="https://tiktok.com/..."
                    value={form.urls}
                    onChange={e => setForm({...form, urls: e.target.value})}
                  />
                </div>

                <Button type="submit" className="w-full gap-2" disabled={submitting}>
                  <Send className="w-4 h-4" />
                  {submitting ? 'Submitting...' : 'Submit Clips'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <h3 className="font-semibold text-lg">Today's Submissions</h3>
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
    </div>
  );
};

export default ClipperDashboard;
