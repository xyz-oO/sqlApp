import { Input, Typography } from 'antd';
import styles from '../themes/terminal.less';

const { Text } = Typography;

export default function NewUserModal({
  open,
  username,
  password,
  onUsernameChange,
  onPasswordChange,
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
              onClick={(event) => event.stopPropagation()}
              style={{ width: '600px' }}
            >
              <div className={styles.terminalModalHeader}>
                <span>新增用户</span>
                <button className={styles.terminalModalClose} type="button" onClick={onCancel}>
                  ×
                </button>
              </div>
              <div className={styles.terminalModalBody}>
               
                <div className={styles.terminalModalField} >
                  {/* <Text>Username</Text> */}
                  <Input
                    value={username}
                    onChange={(event) => onUsernameChange(event.target.value)}
                    placeholder="用户名"
                    size="large"
                    disabled={false}
                    spellCheck={false}
                    style={{width:"560px"}}
                  />
                </div>
                <div className={styles.terminalModalField}>
                  {/* <Text>Password</Text> */}
                  <Input.Password
                    value={password}
                    size="large"
                    onChange={(event) => onPasswordChange(event.target.value)}
                    placeholder="密码"
                    disabled={false}
                    spellCheck={false}
                    iconRender={(visible) => (
                      <span style={{ fontSize: '20px' }}>{visible ? '👁️':'🙈' }</span>
                    )}
                    style={{minWidth:"560px"}}
                  />
                </div>
                 
                {error ? <div style={{ marginTop: 8, color: '#ff9a9a' }}>{error}</div> : null}
              </div>
              <div className={styles.terminalModalFooter}>
                <button
                  className={styles.terminalButton}
                  type="button"
                  onClick={onCancel}
                  disabled={saving}
                  >
                  Cancel
                  </button>

                <button
                  className={styles.terminalPrimaryButton}
                  type="button"
                  onClick={onSave}
                  disabled={saving}
                >
                  {saving ? 'Saving...' : '保存'}
                </button>
              </div>
            
            </div>
    </div>
  );
}

