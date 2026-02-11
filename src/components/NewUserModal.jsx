import { useState } from 'react';
import TerminalTextInput from './TerminalTextInput';
import TerminalPasswordInput from './TerminalPasswordInput';
import TerminalSelect from './TerminalSelect';
import styles from '../themes/terminal.less';

export default function NewUserModal({
  open,
  username,
  password,
  role,
  onUsernameChange,
  onPasswordChange,
  onRoleChange,
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
               
                <div style={{ margin: '24px 0' }}>
                  {/* <Text>Username</Text> */}
                  <TerminalTextInput
                    value={username}
                    onChange={onUsernameChange}
                    placeholder="用户名"
                    style={{width:"560px"}}
                  />
                </div>
                <div style={{ margin: '24px 0' }}>
                  {/* <Text>Password</Text> */}
                  <TerminalPasswordInput
                    value={password}
                    onChange={onPasswordChange}
                    placeholder="密码"
                    style={{minWidth:"560px"}}
                  />
                </div>

                <div style={{ margin: '24px 0' }}>
                  {/* <Text>Role</Text> */}
                  <TerminalSelect
                    value={role || 'USER'}
                    onChange={onRoleChange}
                    options={[
                      { value: 'USER', label: 'USER' },
                      { value: 'SUPER', label: 'SUPER' }
                    ]}
                    placeholder="选择角色"
                    style={{ width: '560px' }}
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

