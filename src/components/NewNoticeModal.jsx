import { useMemo } from 'react';
import Button from 'antd/es/button';
import TerminalTextInput from './TerminalTextInput';
import styles from '../themes/terminal.less';

export default function NewNoticeModal({
  open,
  title,
  body,
  onTitleChange,
  onBodyChange,
  onCancel,
  onSave,
  saving,
  error,
}) {
  const canSave = useMemo(() => {
    return !!title?.trim() && !!body?.trim() && !saving;
  }, [body, saving, title]);

  if (!open) return null;

  return (
    <div className={styles.terminalModalOverlay} onClick={onCancel}>
      <div
        className={styles.terminalModalCard}
        onClick={(event) => event.stopPropagation()}
        style={{ width: 'min(720px, 92vw)' }}
      >
        <div className={styles.terminalModalHeader}>
          <span>发送通知</span>
          <button className={styles.terminalModalClose} type="button" onClick={onCancel}>
            ×
          </button>
        </div>

        <div className={styles.terminalModalBody}>
          <div style={{ margin: '14px 0' }}>
            <label>标题</label>
            <TerminalTextInput value={title} onChange={onTitleChange} placeholder="请输入通知标题" />
          </div>

          <div style={{ margin: '14px 0' }}>
            <label>内容</label>
            <textarea
              className={styles.terminalTextArea}
              rows={6}
              placeholder="请输入通知内容..."
              spellCheck={false}
              value={body}
              onChange={(e) => onBodyChange(e.target.value)}
            />
          </div>

          {error ? <div style={{ marginTop: 8, color: '#ff9a9a' }}>{error}</div> : null}
        </div>

        <div className={styles.terminalModalFooter}>
          <Button className={styles.secondaryButton} type="button" onClick={onCancel} disabled={saving}>
            取消
          </Button>
          <Button className={styles.primaryButton} type="button" onClick={onSave} disabled={!canSave}>
            {saving ? '发送中...' : '发送'}
          </Button>
        </div>
      </div>
    </div>
  );
}

