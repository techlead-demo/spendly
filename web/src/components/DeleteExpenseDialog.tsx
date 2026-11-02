import { useEffect, useRef } from 'react';
import styles from './DeleteExpenseDialog.module.css';

interface DeleteExpenseDialogProps {
  /** "<date> · <category> · <amount>" of the stored expense. */
  expenseLabel: string;
  /** While the delete request runs, both buttons are disabled and Escape and outside clicks do nothing. */
  deleting: boolean;
  onConfirm: () => void;
  onKeep: () => void;
}

/**
 * Modal confirmation before a delete (BR-21), per specs/SPD-3/wireframes/edit-expense-delete-confirm.html.
 * Focus starts on "Keep" so Enter never deletes by accident, and Tab stays inside the dialog.
 */
export function DeleteExpenseDialog({ expenseLabel, deleting, onConfirm, onKeep }: DeleteExpenseDialogProps) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  const keepRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    keepRef.current?.focus();
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (!deleting) onKeep();
      } else if (event.key === 'Tab') {
        // Two buttons: Tab and Shift+Tab both move to the other one.
        event.preventDefault();
        if (deleting) return;
        const next = document.activeElement === keepRef.current ? confirmRef.current : keepRef.current;
        next?.focus();
      }
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [deleting, onKeep]);

  return (
    <div
      className={styles.backdrop}
      data-testid="dialog-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget && !deleting) onKeep();
      }}
    >
      <div
        className={styles.dialog}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="delete-expense-title"
        aria-describedby="delete-expense-text"
      >
        <h2 id="delete-expense-title" className={styles.title}>
          Delete this expense?
        </h2>
        <p id="delete-expense-text" className={styles.text}>
          {expenseLabel} will be removed. You can undo this for 5 seconds.
        </p>
        <div className={styles.actions}>
          <button
            ref={confirmRef}
            type="button"
            className={`${styles.button} ${styles.danger}`}
            disabled={deleting}
            onClick={onConfirm}
          >
            Delete expense
          </button>
          <button ref={keepRef} type="button" className={styles.button} disabled={deleting} onClick={onKeep}>
            Keep
          </button>
        </div>
      </div>
    </div>
  );
}
