const Button = ({
  children,
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  className = "",
  ...props
}) => {
  const baseClasses =
    "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all duration-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-offset-2 focus-visible:ring-primary-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-soft";

  const variants = {
    primary:
      "bg-primary-800 text-white hover:bg-primary-900 hover:shadow-md focus-visible:ring-primary-400",
    secondary:
      "bg-primary-600 text-white hover:bg-primary-800 focus-visible:ring-primary-400",
    outline:
      "border-2 border-primary-600 text-primary-800 hover:bg-primary-50 hover:text-primary-900 focus-visible:ring-primary-400 bg-transparent",
    subtle:
      "bg-transparent text-primary-800 hover:bg-primary-200/50 focus-visible:ring-primary-400",
    danger:
      "bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-400",
    ghost:
      "bg-transparent text-primary-600 hover:bg-primary-200/50 focus-visible:ring-primary-400 shadow-none",
  };

  const sizes = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-sm",
    lg: "px-8 py-4 text-base",
  };

  const spinner = (
    <span className="inline-flex items-center gap-2">
      <span className="h-4 w-4 flex-shrink-0 animate-spin rounded-full border-2 border-primary-200/40 border-t-primary-200" />
      <span className="tracking-wide">Loading...</span>
    </span>
  );

  const classes = `${baseClasses} ${variants[variant] ?? variants.primary} ${
    sizes[size] ?? sizes.md
  } ${className}`;

  return (
    <button className={classes} disabled={disabled || loading} {...props}>
      {loading ? spinner : children}
    </button>
  );
};

export default Button;
