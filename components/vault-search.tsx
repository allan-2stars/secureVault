"use client";

type VaultSearchProps = {
  matchCount: number;
  onChange: (value: string) => void;
  query: string;
  totalCount: number;
};

export function VaultSearch({ matchCount, onChange, query, totalCount }: VaultSearchProps) {
  const isFiltering = query.trim().length > 0;

  return (
    <article className="card">
      <h2>Local keyword search</h2>
      <p>
        Search runs entirely in the browser over safe metadata only. Encrypted secret fields
        and raw private notes are not part of the keyword index.
      </p>
      <div className="search-row">
        <input
          aria-label="Search records"
          className="search-input"
          onChange={(event) => onChange(event.target.value)}
          placeholder="Search title, tags, category, URL, summary..."
          type="search"
          value={query}
        />
        {isFiltering ? (
          <button className="button button-secondary" onClick={() => onChange("")} type="button">
            Clear
          </button>
        ) : null}
      </div>
      <p className="search-meta">
        {isFiltering
          ? `${matchCount} of ${totalCount} records match this query.`
          : `${totalCount} records available for local search.`}
      </p>
    </article>
  );
}
