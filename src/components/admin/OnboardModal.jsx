import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/Dialog';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { X, Plus } from 'lucide-react';

/**
 * OnboardModal – allows an admin to link a pending user (clipper role) to an existing clipper record.
 * Props:
 *   pendingUser   – the profile object of the pending user (`id`, `created_at`, etc.)
 *   onClose       – callback to close the modal
 *   onSaved       – callback after successful onboarding (to refresh data)
 */
const OnboardModal = ({ pendingUser, onClose, onSaved }) => {
  const [clippers, setClippers] = useState([]);
  const [selectedClipperId, setSelectedClipperId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Load available clippers for selection
  useEffect(() => {
    const fetchClippers = async () => {
      const { data, error } = await supabase.from('clippers').select('id, name');
      if (error) {
        console.error(error);
        setError('Failed to load clippers');
      } else {
        setClippers(data || []);
      }
    };
    fetchClippers();
  }, []);

  const handleSave = async () => {
    if (!selectedClipperId) {
      setError('Select a clipper to link this user to');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const { error: dbError } = await supabase
        .from('profiles')
        .update({ clipper_id: selectedClipperId })
        .eq('id', pendingUser.id);
      if (dbError) throw dbError;
      onSaved();
    } catch (e) {
      console.error(e);
      setError(e.message || 'Failed to onboard user');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Onboard Pending User</DialogTitle>
          <DialogDescription>
            Assign this pending account to an existing clipper so they can start submitting clips.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 mt-4">
          {error && <div className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</div>}
          <select
            className="flex h-10 w-full rounded-lg border border-gray-200 bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={selectedClipperId}
            onChange={(e) => setSelectedClipperId(e.target.value)}
          >
            <option value="">Select Clipper</option>
            {clippers.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <div className="flex justify-end space-x-2 pt-2">
            <Button variant="secondary" onClick={onClose} disabled={saving}>
              <X className="w-4 h-4 mr-1" /> Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Onboarding...' : 'Onboard'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OnboardModal;
