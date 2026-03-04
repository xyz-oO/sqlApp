import { useEffect, useMemo } from 'react';
import Button from 'antd/es/button';
import TextArea from 'antd/es/input/TextArea';
import Switch from 'antd/es/switch';
import Tooltip from 'antd/es/tooltip';
import { QuestionCircleOutlined } from '@ant-design/icons';
import ChartTypeRadioGroup from './ChartTypeRadioGroup';
import TerminalTextInput from './TerminalTextInput';
import TerminalSelect from './TerminalSelect';
import styles from '../themes/terminal.less';

export default function SqlSubmitModal({
  open,
  menuName,
  sqlContent,
  dbname,
  chartEnabled,
  chartType,
  dbConfigs,
  onMenuNameChange,
  onSqlContentChange,
  onDbnameChange,
  onChartEnabledChange,
  onChartTypeChange,
  onCancel,
  onSave,
  saving,
  error,
  isEditing,
}) {
  const normalizedChartType = useMemo(() => {
    const raw = typeof chartType === 'string' ? chartType.trim() : '';
    if (['lineChart', 'Bar-v-chart', 'Bar-h-chart', 'PieChart'].includes(raw)) return raw;
    return 'lineChart';
  }, [chartType]);

  // If we loaded an older/invalid value from storage, normalize it so
  // the Radio.Group always has a matching selected option and saves consistently.
  useEffect(() => {
    if (!open) return;
    if (chartEnabled && chartType !== normalizedChartType) {
      onChartTypeChange?.(normalizedChartType);
    }
  }, [open, chartEnabled, chartType, normalizedChartType, onChartTypeChange]);

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
                <QuestionCircleOutlined className={styles.terminalHelpIcon} />
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
              rows={18}
              placeholder="Write SQL here..."
              spellCheck={false}
              value={sqlContent}
              onChange={(e) => onSqlContentChange(e.target.value)}
              style={{ minHeight: '300px', fontSize: '14px', fontFamily: 'SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace' }}
            />
          </div>
          <div>
            <span style={{ marginRight: 8 }}>图表开关</span>
            <Switch
              className={styles.statusSwitch}
              checked={!!chartEnabled}
              checkedChildren="ON"
              unCheckedChildren="OFF"
              onChange={(checked) => {
                onChartEnabledChange?.(checked);
                if (checked) {
                  onChartTypeChange?.(normalizedChartType || 'lineChart');
                }
              }}
            />
            {chartEnabled ? (
              <fieldset className={styles.terminalFieldset} style={{ marginTop: 12 }}>
                <legend className={styles.terminalLegend}>图表类型</legend>
                <ChartTypeRadioGroup
                  value={normalizedChartType || 'lineChart'}
                  onChange={(e) => onChartTypeChange?.(e.target.value)}
                  style={{ display: 'flex' }}
                />
              </fieldset>
            ) : null}
           
          </div>
          {error && (
            <div className={styles.terminalModalError}>
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
