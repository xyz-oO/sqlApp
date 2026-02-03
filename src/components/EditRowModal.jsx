import React, { useState, useEffect } from 'react';
import { Input, Button } from 'antd';
import styles from '../themes/terminal.less';

export default function EditRowModal({
  open,
  rowData,
  columns,
  onCancel,
  onSave,
  saving,
  error,
}) {
  const [formData, setFormData] = useState({});

  useEffect(() => {
    if (rowData) {
      setFormData(rowData);
    }
  }, [rowData]);

  const handleFieldChange = (key, value) => {
    setFormData(prev => ({
      ...prev,
      [key]: value
    }));
  };

  if (!open) {
    return null;
  }

  const dataColumns = columns.filter(col => {
    if (col.key === 'edit' || col.key === 'index') {
      return false;
    }
    // Exclude time-related columns
    const columnName = col.dataIndex || col.key;
    return !columnName.toLowerCase().includes('time') && 
           !columnName.toLowerCase().includes('create_') && 
           !columnName.toLowerCase().includes('update_');
  });

  return (
    <div className={styles.terminalModalOverlay}>
      <div className={styles.terminalModalCard}>
        <div className={styles.terminalModalHeader}>
          <h3>编辑行数据</h3>
          <button
            className={styles.terminalModalClose}
            type="button"
            onClick={onCancel}
          >
            ×
          </button>
        </div>
        <div className={styles.terminalModalBody}>
          {dataColumns.map(col => {
            const fieldKey = col.dataIndex || col.key;
            return (
              <div key={col.key} className={styles.terminalModalField}>
                <label>{col.title}</label>
                <Input
                  className={styles.terminalInput}
                  placeholder={col.title}
                  spellCheck={false}
                  value={formData[fieldKey] !== undefined ? formData[fieldKey] : ''}
                  onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
                />
              </div>
            );
          })}
          {error && (
            <div style={{ marginBottom: 16, background: '#2d1d1d', border: '1px solid #4d2d2d', borderRadius: 8, padding: 12, color: '#ff9d9d' }}>
              <div style={{ fontWeight: 'bold', marginBottom: 4 }}>错误</div>
              <div>{error}</div>
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
            onClick={() => onSave(formData)}
            disabled={saving}
          >
            {saving ? '保存中...' : '保存'}
          </Button>
        </div>
      </div>
    </div>
  );
}
