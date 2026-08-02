export default function Pagination({ page, lastPage, setPage }) {
  if (lastPage <= 1) return null;
  return (
    <div className="pagination">
      <button className="btn secondary small" disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</button>
      <span>Page {page} of {lastPage}</span>
      <button className="btn secondary small" disabled={page >= lastPage} onClick={() => setPage(page + 1)}>Next</button>
    </div>
  );
}
