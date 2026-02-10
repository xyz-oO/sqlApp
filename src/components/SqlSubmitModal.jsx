import Button from 'antd/es/button';
import TextArea from 'antd/es/input/TextArea';
import Tooltip from 'antd/es/tooltip';
import { QuestionCircleOutlined } from '@ant-design/icons';
import TerminalTextInput from './TerminalTextInput';
import TerminalSelect from './TerminalSelect';
import styles from '../themes/terminal.less';

export default function SqlSubmitModal({
  open,
  menuName,
  sqlContent,
  dbname,
  dbConfigs,
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
          <div style={{ margin: '24px 0' }}>
            <div>
              <label>
                <span>目录名</span>
                 <Tooltip title="自定义目录名，将显示在主页左侧导航栏">
                <QuestionCircleOutlined style={{ marginLeft: '6px', cursor: 'help', color: '#8dff9d', fontSize: '14px' }} />
              </Tooltip>
              </label>
             
            </div>
            <TerminalTextInput
              placeholder="请输入目录名"
              value={menuName}
              onChange={onMenuNameChange}
            />
          </div>
          <div style={{ margin: '24px 0' }}>
            <label>数据库名</label>
            <TerminalSelect
              value={dbname}
              onChange={onDbnameChange}
              options={dbConfigs?.map(config => ({
                value: config.database,
                label: config.database
              })) || []}
              placeholder="请选择数据库名"
              style={{ width: '100%', minWidth: '300px' }}
            />
          </div>
          <div style={{ margin: '24px 0' }}>
            <label>SQL内容</label>
            <textarea
              className={styles.terminalTextArea}
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
