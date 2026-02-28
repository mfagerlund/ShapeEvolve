import { signal } from '@preact/signals';

interface ConfirmState {
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  resolve: (confirmed: boolean) => void;
}

export const confirmState = signal<ConfirmState | null>(null);

export function confirm(message: string, opts?: { confirmLabel?: string; danger?: boolean }): Promise<boolean> {
  return new Promise((resolve) => {
    confirmState.value = {
      message,
      confirmLabel: opts?.confirmLabel,
      danger: opts?.danger,
      resolve,
    };
  });
}

export function ConfirmDialog() {
  const state = confirmState.value;
  if (!state) return null;

  function respond(confirmed: boolean) {
    state!.resolve(confirmed);
    confirmState.value = null;
  }

  return (
    <div class="modal-overlay" onClick={() => respond(false)}>
      <div class="modal" onClick={(e) => e.stopPropagation()}>
        <p class="confirm-message">{state.message}</p>
        <div class="modal-actions">
          <button class="btn" onClick={() => respond(false)}>Cancel</button>
          <button
            class={`btn ${state.danger ? 'btn-danger' : 'btn-primary'}`}
            onClick={() => respond(true)}
            autoFocus
          >
            {state.confirmLabel ?? 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}
