import React, { useState, useRef, useEffect } from 'react';
import styles from '../themes/terminal.less';

const TerminalSelect = ({ value, onChange, options, placeholder, style, className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (selectRef.current && !selectRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleOptionClick = (optionValue) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  const selectedOption = options?.find(option => option.value === value);

  return (
    <div ref={selectRef} className={`${styles.terminalSelectWrapper} ${className}`} style={style}>
      <div 
        className={styles.terminalSelectTrigger}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={styles.terminalSelectValue}>
          {selectedOption?.label || value || placeholder}
        </span>
        <span className={`${styles.terminalSelectArrow} ${isOpen ? styles.terminalSelectArrowOpen : ''}`}>
          ▼
        </span>
      </div>
      {isOpen && (
        <div className={styles.terminalSelectDropdown}>
          {options?.map(option => (
            <div
              key={option.value}
              className={`${styles.terminalSelectOption} ${option.value === value ? styles.terminalSelectOptionSelected : ''}`}
              onClick={() => handleOptionClick(option.value)}
            >
              {option.label}
            </div>
          )) || (
            <div className={styles.terminalSelectOption}>
              暂无选项
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TerminalSelect;