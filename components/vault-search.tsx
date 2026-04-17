"use client";

type VaultSearchProps = {
  isSemanticMode: boolean;
  matchCount: number;
  onChange: (value: string) => void;
  onSemanticModeChange: (mode: boolean) => void;
  onSemanticSearch: () => Promise<void>;
  query: string;
  semanticInFlight: boolean;
  semanticStatusMessage: string | null;
  totalCount: number;
};

export function VaultSearch({
  isSemanticMode,
  matchCount,
  onChange,
  onSemanticModeChange,
  onSemanticSearch,
  query,
  semanticInFlight,
  semanticStatusMessage,
  totalCount
}: VaultSearchProps) {
  const isFiltering = query.trim().length > 0;

  return (
    <article className="card">
      <h2>Local keyword search</h2>
      <p>
        Keyword search stays fully local. Semantic search uses the Pi wrapper and falls back
        to local keyword results if the Pi or Chroma is unavailable.
      </p>
      <div className="search-mode-row">
        <button
          className={`button ${!isSemanticMode ? "button-primary" : "button-secondary"}`}
          onClick={() => onSemanticModeChange(false)}
          type="button"
        >
          Local keyword
        </button>
        <button
          className={`button ${isSemanticMode ? "button-primary" : "button-secondary"}`}
          onClick={() => onSemanticModeChange(true)}
          type="button"
        >
          Semantic AI
        </button>
      </div>
      <div className="search-row">
        <input
          aria-label="Search records"
          className="search-input"
          onChange={(event) => onChange(event.target.value)}
          placeholder="Search title, tags, category, URL, summary..."
          type="search"
          value={query}
        />
        {isSemanticMode ? (
          <button
            className="button button-primary"
            disabled={semanticInFlight || !query.trim()}
            onClick={() => void onSemanticSearch()}
            type="button"
          >
            {semanticInFlight ? "Searching..." : "Run semantic search"}
          </button>
        ) : null}
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
      {semanticStatusMessage ? <p className="search-meta">{semanticStatusMessage}</p> : null}
    </article>
  );
}
