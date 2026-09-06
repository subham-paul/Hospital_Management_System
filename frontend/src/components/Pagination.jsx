import { ChevronLeft, ChevronRight } from 'lucide-react';

export default function Pagination({ page, lastPage, setPage }) {
  if (lastPage <= 1) return null;
  return (
    <div className="pagination">
      <button className="btn secondary small icon-button" aria-label="Previous page" disabled={page <= 1} onClick={() => setPage(page - 1)}><ChevronLeft size={16} /> Prev</button>
      <span><strong>{page}</strong> of {lastPage}</span>
      <button className="btn secondary small icon-button" aria-label="Next page" disabled={page >= lastPage} onClick={() => setPage(page + 1)}>Next <ChevronRight size={16} /></button>
    </div>
  );
}
