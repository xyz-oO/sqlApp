import React from 'react';
import styles from '../themes/terminal.less';

const TerminalAlert = ({ message, description, type, showIcon }) => {
  const getIcon = () => {
    switch (type) {
      case 'error':
        return '❌';
      case 'success':
        return '✅';
      case 'warning':
        return '⚠️';
      case 'info':
      default:
        return 'ℹ️';
    }
  };

  return (
    <div className={`${styles.terminalAlert} ${styles[`terminalAlert${type.charAt(0).toUpperCase() + type.slice(1)}`]}`}>
      {showIcon && (
        <div className={styles.terminalAlertIcon}>
          {getIcon()}
        </div>
      )}
      <div className={styles.terminalAlertContent}>
        {message && (
          <div className={styles.terminalAlertMessage}>
            {message}
          </div>
        )}
        {description && (
          <div className={styles.terminalAlertDescription}>
            {description}
          </div>
        )}
      </div>
    </div>
  );
};

export default TerminalAlert;