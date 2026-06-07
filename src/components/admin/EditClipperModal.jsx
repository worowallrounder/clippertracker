import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../components/ui/Dialog';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { X } from 'lucide-react';

/**
 * Simple modal for editing a clipper's basic information.
 * Props:
 *  - clipper: { id, name, ... }
 *  - clipperAccounts: array of accounts belonging to the clipper (optional, displayed for context)
 *  - onClose: () => void
 *  - onSaved: () => void – called after successful update to refresh parent data.
 */
const EditClipperModal = ({ clipper, clipperAccounts, onClose, onSaved }) => {
  const [name, setName] = useState(clipper?.name || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Name cannot be empty');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const { error: dbError } = await supabase
        .from('clippers')
        .update({ name })
        .eq('id', clipper.id);
      if (dbError) throw dbError;
      onSaved();
    } catch (e) {
      console.error(e);
      setError(e.message || 'Failed to update clipper');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Clipper</DialogTitle>
          <DialogDescription>Update the clipper's name and view their linked accounts.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-4 mt-4">
          {error && <div className="text-sm text-red-600 bg-red-50 p-2 rounded">{error}</div>}
          <Input
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Clipper name"
          />
          {clipperAccounts && clipperAccounts.length > 0 && (
            <div className="text-sm text-text-muted">
              <strong>Linked accounts:</strong> {clipperAccounts.map(a => a.account_label).join(', ')}
            </div>
          )}
          <div className="flex justify-end space-x-2 pt-2">
            <Button variant="secondary" onClick={onClose} disabled={saving}>
              <X className="w-4 h-4 mr-1" /> Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EditClipperModal;
