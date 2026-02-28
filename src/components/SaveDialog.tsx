import { useState } from 'preact/hooks';

interface SaveDialogProps {
  onSave: (name: string, tags: string[], isPublic: boolean) => void;
  onCancel: () => void;
  saving: boolean;
}

export function SaveDialog({ onSave, onCancel, saving }: SaveDialogProps) {
  const [name, setName] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [isPublic, setIsPublic] = useState(true);

  function handleSubmit(e: Event) {
    e.preventDefault();
    const tags = tagInput
      .split(',')
      .map(t => t.trim().toLowerCase())
      .filter(Boolean);
    onSave(name || 'Untitled Shape', tags, isPublic);
  }

  return (
    <div class="modal-overlay" onClick={onCancel}>
      <form class="modal" onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <h3>Save Shape</h3>

        <label class="field-label">Name</label>
        <input
          class="field-input"
          type="text"
          value={name}
          onInput={(e) => setName((e.target as HTMLInputElement).value)}
          placeholder="My cool shape"
          autoFocus
        />

        <label class="field-label">Tags (comma-separated)</label>
        <input
          class="field-input"
          type="text"
          value={tagInput}
          onInput={(e) => setTagInput((e.target as HTMLInputElement).value)}
          placeholder="organic, spiky, colorful"
        />

        <label class="field-checkbox">
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic((e.target as HTMLInputElement).checked)}
          />
          Public (visible in gallery)
        </label>

        <div class="modal-actions">
          <button type="button" class="btn" onClick={onCancel} disabled={saving}>
            Cancel
          </button>
          <button type="submit" class="btn btn-primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>
    </div>
  );
}
