import styles from './UndoToast.module.css';

interface UndoToastProps {
  message: string;
  /** Shows the "Undo" button when given. */
  onUndo?: () => void;
  undoDisabled?: boolean;
}

/**
 * Toast at the bottom of the expense list (specs/SPD-3/wireframes/expense-list-undo-toast.html).
 * A polite live region, so screen readers announce the message (AC-41).
 */
export function UndoToast({ message, onUndo, undoDisabled = false }: UndoToastProps) {
  return (
    <div className={styles.toast} role="status" aria-live="polite">
      <span>{message}</span>
      {onUndo && (
        <button type="button" className={styles.undo} disabled={undoDisabled} onClick={onUndo}>
          Undo
        </button>
      )}
    </div>
  );
}
