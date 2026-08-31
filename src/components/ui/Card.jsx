import React from 'react';

/**
 * Flexible Card component for content containers.
 * Supports elevation, borders, and padding variations.
 */
const Card = React.forwardRef(({
  children,
  className = '',
  elevation = 'md',
  padding = 'md',
  border = true,
  ...props
}, ref) => {
  const elevationStyles = {
    none: '',
    sm: 'shadow-card',
    md: 'shadow-card',
    lg: 'shadow-card-lg',
  };

  const paddingStyles = {
    none: '',
    sm: 'p-3',
    md: 'p-4 sm:p-6',
    lg: 'p-6 sm:p-8',
  };

  const baseStyles = 'bg-white rounded-xl transition-all';
  const borderStyles = border ? 'border border-slate-200' : '';

  const cardClass = `${baseStyles} ${elevationStyles[elevation]} ${paddingStyles[padding]} ${borderStyles} ${className}`;

  return (
    <div ref={ref} className={cardClass} {...props}>
      {children}
    </div>
  );
});

Card.displayName = 'Card';

export default Card;
