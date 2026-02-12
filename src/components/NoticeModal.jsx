import styles from '../themes/terminal.less';

export default function NoticeModal({ open, title, body, footer, onCancel }) {
  if (!open) return null;

  return (
    <div className={styles.terminalModalOverlay} onClick={onCancel}>
      <div
        className={styles.terminalModalCard}
        onClick={(event) => event.stopPropagation()}
        style={{ width: 'min(640px, 92vw)' }}
      >
        <div className={styles.terminalModalHeader}>
          <span>{title}</span>
          <button className={styles.terminalModalClose} type="button" onClick={onCancel}>
            ×
          </button>
        </div>

        <div className={styles.terminalModalBody}>
          <div className={styles.messageModalBody}>{body}</div>
        </div>

        <div className={styles.messageModalFooter}>
          <div className={styles.messageModalFooterText}>{footer}</div>
          <button className={styles.terminalButton} type="button" onClick={onCancel}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

