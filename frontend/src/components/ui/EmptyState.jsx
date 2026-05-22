export default function EmptyState({ icon, title, description, action }) {
  return (
    <div className="card text-center py-12 md:py-16 px-6">
      {icon && (
        <div className="mx-auto w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 dark:text-gray-500 mb-4">
          {icon}
        </div>
      )}
      <p className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</p>
      {description && <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 max-w-sm mx-auto">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
