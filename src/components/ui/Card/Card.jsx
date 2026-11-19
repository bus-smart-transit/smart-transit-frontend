import React from 'react';

/**
 * Card component matching the design team's reference implementation
 * (rounded-2xl, slate border, shadow-card). Keeps padding/elevation props
 * for backward compatibility with existing callers.
 */
const Card = React.forwardRef(({
  as: As = 'div',
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
    lg: 'shadow-card-hover',
  };

  const paddingStyles = {
    none: '',
    sm: 'p-3',
    md: 'p-4 sm:p-6',
    lg: 'p-6 sm:p-8',
  };

  const borderStyles = border ? 'border border-slate-200' : '';

  const cardClass = `rounded-2xl bg-white transition-all ${elevationStyles[elevation]} ${paddingStyles[padding]} ${borderStyles} ${className}`;

  return (
    <As ref={ref} className={cardClass} {...props}>
      {children}
    </As>
  );
});

Card.displayName = 'Card';

export default Card;
