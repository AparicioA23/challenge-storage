import React, { ChangeEvent, SelectHTMLAttributes, useId } from 'react';

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'value' | 'onChange' | 'disabled'> {
  options: SelectOption[];
  value: string;
  onChange: (value: string, event: ChangeEvent<HTMLSelectElement>) => void;
  disabled?: boolean;
  label?: string;
  placeholder?: string;
}

const Select: React.FC<SelectProps> = ({
  options,
  value,
  onChange,
  disabled = false,
  label,
  placeholder,
  id,
  className,
  ...rest
}) => {
  const generatedId = useId();
  const selectId = id ?? generatedId;

  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    onChange(event.target.value, event);
  };

  return (
    <div className="ui-select">
      {label && (
        <label htmlFor={selectId} className="ui-select__label">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={className ? `ui-select__control ${className}` : 'ui-select__control'}
        value={value}
        onChange={handleChange}
        disabled={disabled}
        {...rest}
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default React.memo(Select);
