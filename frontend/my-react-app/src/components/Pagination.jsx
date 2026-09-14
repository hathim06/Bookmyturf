export default function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null;
  return <nav className="pagination" aria-label="Pagination"><button disabled={page === 1} onClick={() => onChange(page - 1)}>Previous</button>{Array.from({ length: totalPages }, (_, index) => index + 1).map((number) => <button className={number === page ? 'currentPage' : ''} key={number} onClick={() => onChange(number)}>{number}</button>)}<button disabled={page === totalPages} onClick={() => onChange(page + 1)}>Next</button></nav>;
}
