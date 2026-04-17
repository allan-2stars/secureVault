"use client";

type VaultSearchProps = {
  isSemanticMode: boolean;
  matchLabel: string;
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
  matchLabel,
  onChange,
  onSemanticModeChange,
  onSemanticSearch,
  query,
  semanticInFlight,
  semanticStatusMessage,
  totalCount
}: VaultSearchProps) {
  // We only show "Clear" and match text when the user actually typed something.
  const isFiltering = query.trim().length > 0;

  return (
    <article className="card">
      {/* This card controls both search modes: local keyword and Pi-backed semantic search. */}
      <h2>Local keyword search</h2>
      <p>
        Keyword search stays fully local. Semantic search uses the Pi wrapper and falls back
        to local keyword results if the Pi or Chroma is unavailable.
      </p>
      <div className="search-mode-row">
        {/* Keyword mode filters records using safe local metadata only. */}
        <button
          className={`button ${!isSemanticMode ? "button-primary" : "button-secondary"}`}
          onClick={() => onSemanticModeChange(false)}
          type="button"
        >
          Local keyword
        </button>
        {/* Semantic mode asks the Pi wrapper to find related records by meaning instead of exact keywords. */}
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
          // The parent component owns the query state, so we pass each keystroke upward.
          onChange={(event) => onChange(event.target.value)}
          placeholder="Search title, tags, category, URL, summary..."
          type="search"
          value={query}
        />
        {isSemanticMode ? (
          // Semantic search is run explicitly by button click instead of on every keystroke.
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
      {/* This text explains how many results are currently being shown. */}
      <p className="search-meta">{isFiltering ? matchLabel : `${totalCount} records available for local search.`}</p>
      {/* Extra status text is used for fallback messages and semantic-search results. */}
      {semanticStatusMessage ? <p className="search-meta">{semanticStatusMessage}</p> : null}
    </article>
  );
}
