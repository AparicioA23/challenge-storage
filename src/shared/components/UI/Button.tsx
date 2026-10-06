import React, { ButtonHTMLAttributes, CSSProperties, MouseEvent } from 'react';

interface ButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'title' | 'style' | 'onClick'> {
  title: string;
  styles?: CSSProperties;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
}

const Button: React.FC<ButtonProps> = ({
  title,
  styles,
  onClick,
  type = 'button',
  className,
  ...rest
}) => (
  <button
    type={type}
    className={className ? `ui-button ${className}` : 'ui-button'}
    style={styles}
    onClick={onClick}
    {...rest}
  >
    {title}
  </button>
);

export default React.memo(Button);
