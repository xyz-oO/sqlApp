import TerminalPasswordInput from './TerminalPasswordInput';
import styles from '../themes/terminal.less';

export default function ChangePasswordModal({
  open,
  user,
  value,
  onChange,
  onCancel,
  onSave,
  saving,
  error,
}) {
  if (!open) {
    return null;
  }
  return (
    <div className={styles.terminalModalOverlay} onClick={onCancel}>
      <div
        className={styles.terminalModalCard}
        style={{ width: '600px' }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.terminalModalHeader}>
          <span>修改密码</span>
          <button className={styles.terminalModalClose} type="button" onClick={onCancel}>
            ×
          </button>
        </div>
        <div className={styles.terminalModalBody}>
          <div style={{ marginBottom: 12 }}>
            {/* <Text>Username</Text> */}
            <div className={styles.terminalModalUser}>
              <div className={styles.terminalModalAvatar}>
                {(user?.username || '?').slice(0, 2).toUpperCase()}
              </div>
            </div>
          </div>
          <div>
            {/* <Text style={{color:'yellow'}}>New Password</Text> */}
            <div style={{ marginTop: 56 }} >
               <TerminalPasswordInput
                    value={value}
                    onChange={onChange}
                    placeholder="请输入新密码"
                    style={{minWidth:"560px"}}
                  />
            </div>
            {error ? (
              <div style={{ marginTop: 8, color: '#ff9a9a' }}>{error}</div>
            ) : null}
          </div>
        </div>
        <div className={styles.terminalModalFooter}>
          <button
            className={styles.terminalButton}
            type="button"
            onClick={onCancel}
            disabled={saving}
          >
            取消
          </button>
          <button
            className={styles.terminalPrimaryButton}
            type="button"
            onClick={onSave}
            disabled={saving}
          >
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}

