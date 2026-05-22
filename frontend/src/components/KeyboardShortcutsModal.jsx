import Modal from './Modal';

const shortcuts = [
  { keys: ['Ctrl', 'K'], label: 'Open global search' },
  { keys: ['?'], label: 'Show keyboard shortcuts' },
  { keys: ['D'], label: 'Go to Dashboard' },
  { keys: ['C'], label: 'Go to Clients' },
  { keys: ['P'], label: 'Go to Pipeline' },
  { keys: ['T'], label: 'Go to Tasks' },
  { keys: ['A'], label: 'Go to Appointments' },
  { keys: ['S'], label: 'Go to Settings' },
];

export default function KeyboardShortcutsModal({ open, onClose }) {
  return (
    <Modal open={open} onClose={onClose} title="Keyboard shortcuts">
      <ul className="space-y-3">
        {shortcuts.map(({ keys, label }) => (
          <li key={label} className="flex items-center justify-between gap-4 text-sm">
            <span className="text-gray-600 dark:text-gray-300">{label}</span>
            <span className="flex gap-1 flex-shrink-0">
              {keys.map((k) => (
                <kbd
                  key={k}
                  className="px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded border border-gray-200 dark:border-gray-600"
                >
                  {k}
                </kbd>
              ))}
            </span>
          </li>
        ))}
      </ul>
      <p className="text-xs text-gray-400 dark:text-gray-500 mt-6">Shortcuts are disabled while typing in a field.</p>
    </Modal>
  );
}
