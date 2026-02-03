import { Input, Button } from 'antd';
import styles from '../themes/terminal.less';

const { TextArea } = Input;

export default function SqlSubmitModal({
  open,
  menuName,
  sqlContent,
  dbname,
  onMenuNameChange,
  onSqlContentChange,
  onDbnameChange,
  onCancel,
  onSave,
  saving,
  error,
  isEditing,
}) {
  if (!open) return null;

  return (
    <div className={styles.terminalModalOverlay}>
      <div className={styles.terminalModalCard}>
        <div className={styles.terminalModalHeader}>
          <h3>{isEditing ? '编辑SQL列表' : '新建SQL列表'}</h3>
          <button
            className={styles.terminalModalClose}
            type="button"
            onClick={onCancel}
          >
            ×
          </button>
        </div>
        <div className={styles.terminalModalBody}>
          <div className={styles.terminalModalField}>
            {/* <label>目录名</label> */}
            <Input
              className={styles.terminalInput}
              placeholder="请输入目录名"
              spellCheck={false}
              value={menuName}
              onChange={(e) => onMenuNameChange(e.target.value)}
              size="large"
            />
          </div>
          <div className={styles.terminalModalField}>
            {/* <label>数据库名</label> */}
            <Input
              className={styles.terminalInput}
              placeholder="请输入数据库名"
              spellCheck={false}
              value={dbname}
              onChange={(e) => onDbnameChange(e.target.value)}
              size="large"
            />
          </div>
          <div className={styles.terminalModalField}>
            {/* <label>SQL内容</label> */}
            <TextArea
              className={styles.terminalEditor}
              rows={6}
              placeholder="Write SQL here..."
              spellCheck={false}
              value={sqlContent}
              onChange={(e) => onSqlContentChange(e.target.value)}
            />
          </div>
          {error && (
            <div className={styles.error} style={{ marginTop: '12px' }}>
              {error}
            </div>
          )}
        </div>
        <div className={styles.terminalModalFooter}>
          <Button
            className={styles.secondaryButton}
            type="button"
            onClick={onCancel}
            disabled={saving}
          >
            取消
          </Button>
          <Button
            className={styles.primaryButton}
            type="button"
            onClick={onSave}
            disabled={saving}
          >
            {saving ? '提交中...' : '提交'}
          </Button>
        </div>
      </div>
    </div>
  );
}
