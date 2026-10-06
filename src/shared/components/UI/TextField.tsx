import React, { ChangeEvent, InputHTMLAttributes, useId } from 'react';

interface TextFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'disabled'> {
  value: string;
  onChange: (value: string, event: ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  label?: string;
}

const TextField: React.FC<TextFieldProps> = ({
  value,
  onChange,
  disabled = false,
  label,
  id,
  type = 'text',
  className,
  ...rest
}) => {
  const generatedId = useId();
  const inputId = id ?? generatedId;

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.value, event);
  };

  return (
    <div className="ui-text-field">
      {label && (
        <label htmlFor={inputId} className="ui-text-field__label">
          {label}
        </label>
      )}
      <input
        id={inputId}
        type={type}
        className={className ? `ui-text-field__input ${className}` : 'ui-text-field__input'}
        value={value}
        onChange={handleChange}
        disabled={disabled}
        {...rest}
      />
    </div>
  );
};

export default React.memo(TextField);
