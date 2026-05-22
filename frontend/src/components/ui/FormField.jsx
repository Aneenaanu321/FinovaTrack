export default function FormField({ label, name, error, required, children, hint }) {
  const id = name ? `field-${name}` : undefined;
  return (
    <div>
      {label && (
        <label htmlFor={id} className="label">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      {children}
      {hint && !error && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{hint}</p>}
      {error && (
        <p id={id ? `${id}-error` : undefined} className="text-xs text-red-600 dark:text-red-400 mt-1" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
