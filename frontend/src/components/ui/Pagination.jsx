export default function Pagination({ page, pages, total, onPageChange }) {
  if (pages <= 1) return null;

  const prev = () => onPageChange(Math.max(1, page - 1));
  const next = () => onPageChange(Math.min(pages, page + 1));

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
      <p className="text-sm text-gray-500 dark:text-gray-400">
        Page {page} of {pages}
        {total != null && <span className="hidden sm:inline"> · {total} total</span>}
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          className="btn-secondary min-h-[44px] px-4 disabled:opacity-40"
          disabled={page <= 1}
          onClick={prev}
        >
          Previous
        </button>
        <button
          type="button"
          className="btn-secondary min-h-[44px] px-4 disabled:opacity-40"
          disabled={page >= pages}
          onClick={next}
        >
          Next
        </button>
      </div>
    </div>
  );
}
