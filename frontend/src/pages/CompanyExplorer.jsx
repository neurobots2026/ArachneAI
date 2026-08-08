import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api';

function formatLabel(value = '') {
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function CompanyExplorer() {
  const [tokens, setTokens] = useState([]);
  const [strategy, setStrategy] = useState(null);
  const [tokensLoading, setTokensLoading] = useState(true);
  const [tokensRefreshing, setTokensRefreshing] = useState(false);
  const [tokensError, setTokensError] = useState('');
  const [action, setAction] = useState('idle');
  const [actionError, setActionError] = useState('');
  const [feedback, setFeedback] = useState('');

  const load = useCallback(async ({ background = false } = {}) => {
    if (background) setTokensRefreshing(true);
    else setTokensLoading(true);

    try {
      const nextTokens = await api.honeytokens();
      setTokens(nextTokens);
      setTokensError('');
      return true;
    } catch (error) {
      setTokensError(error.message || 'Unable to load the honeytoken inventory.');
      return false;
    } finally {
      setTokensLoading(false);
      setTokensRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function analyze() {
    setAction('analyzing');
    setActionError('');
    setFeedback('');
    try {
      const nextStrategy = await api.analyzeDeception();
      setStrategy(nextStrategy);
      const placementCount = nextStrategy.honeytokens?.length || 0;
      setFeedback(
        `Analysis complete. ${placementCount} ${placementCount === 1 ? 'placement' : 'placements'} ready for review.`,
      );
    } catch (error) {
      setActionError(error.message || 'The organization analysis could not be completed.');
    } finally {
      setAction('idle');
    }
  }

  async function deploy() {
    if (!strategy) return;
    setAction('deploying');
    setActionError('');
    setFeedback('');
    try {
      const deployed = await api.generateDeception(strategy);
      const inventoryUpdated = await load({ background: true });
      setFeedback(
        inventoryUpdated
          ? `${deployed.length} ${deployed.length === 1 ? 'honeytoken was' : 'honeytokens were'} deployed successfully.`
          : 'The strategy was deployed, but the inventory could not be refreshed.',
      );
    } catch (error) {
      setActionError(error.message || 'The deception strategy could not be deployed.');
    } finally {
      setAction('idle');
    }
  }

  const departmentGroups = useMemo(() => {
    const groups = tokens.reduce((acc, token) => {
      const department = token.department || 'General';
      if (!acc[department]) acc[department] = [];
      acc[department].push(token);
      return acc;
    }, {});

    return Object.entries(groups).sort(([left], [right]) => left.localeCompare(right));
  }, [tokens]);

  const busy = action !== 'idle';
  const proposedCount = strategy?.honeytokens?.length || 0;

  return (
    <div className="page-shell explorer-page" aria-busy={tokensLoading || tokensRefreshing || busy}>
      <header className="page-header explorer-header">
        <div className="page-header__copy">
          <p className="page-eyebrow">Deception coverage</p>
          <h2>Company Explorer</h2>
          <p className="page-subtitle">
            Review protected departments, inspect deployed honeytokens, and generate adaptive placements.
          </p>
        </div>
        <div className="page-actions explorer-header__actions">
          <button
            className="btn btn-secondary"
            type="button"
            onClick={() => load({ background: tokens.length > 0 })}
            disabled={tokensLoading || tokensRefreshing || busy}
          >
            {tokensRefreshing ? 'Refreshing…' : 'Refresh inventory'}
          </button>
          <button
            className="btn btn-secondary"
            type="button"
            onClick={analyze}
            disabled={busy || tokensLoading}
            aria-describedby="explorer-action-status"
          >
            {action === 'analyzing'
              ? 'Analyzing organization…'
              : strategy
                ? 'Re-analyze organization'
                : 'Analyze organization'}
          </button>
          {strategy && (
            <button
              className="btn"
              type="button"
              onClick={deploy}
              disabled={busy || proposedCount === 0}
              aria-describedby="explorer-action-status"
            >
              {action === 'deploying' ? 'Deploying strategy…' : 'Deploy strategy'}
            </button>
          )}
        </div>
      </header>

      <div id="explorer-action-status" className="action-status" aria-live="polite">
        {actionError && (
          <div className="status-banner status-banner--error" role="alert">
            <div>
              <strong>Action failed.</strong>
              <span> {actionError}</span>
            </div>
          </div>
        )}
        {feedback && !actionError && (
          <div className="status-banner status-banner--success" role="status">
            {feedback}
          </div>
        )}
      </div>

      {tokensError && tokens.length > 0 && (
        <div className="status-banner status-banner--warning" role="status">
          <div>
            <strong>Inventory refresh paused.</strong>
            <span> Showing the last successful inventory. {tokensError}</span>
          </div>
          <button className="btn btn-secondary" type="button" onClick={() => load({ background: true })}>
            Retry connection
          </button>
        </div>
      )}

      {strategy && (
        <section className="card section strategy-panel" aria-labelledby="strategy-title">
          <header className="strategy-panel__header">
            <div>
              <p className="section-kicker">AI recommendation</p>
              <h3 id="strategy-title">Adaptive deception strategy</h3>
            </div>
            <span className="badge badge-open">
              {proposedCount} proposed {proposedCount === 1 ? 'placement' : 'placements'}
            </span>
          </header>

          <p className="strategy-panel__summary">
            {strategy.justification || 'The analysis completed without an additional justification.'}
          </p>

          {strategy.assets?.length > 0 && (
            <div className="strategy-assets" aria-label="Assets included in the analysis">
              <span className="strategy-assets__label">Analyzed assets</span>
              <ul className="chip-list">
                {strategy.assets.map((asset) => (
                  <li className="chip" key={asset}>{asset}</li>
                ))}
              </ul>
            </div>
          )}

          {proposedCount > 0 ? (
            <ol className="strategy-list">
              {strategy.honeytokens.map((honeytoken, index) => (
                <li
                  className="strategy-item"
                  key={`${honeytoken.type}-${honeytoken.name}-${honeytoken.placement_path}-${index}`}
                >
                  <span className="strategy-item__number" aria-hidden="true">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div className="strategy-item__copy">
                    <div className="strategy-item__header">
                      <strong>{honeytoken.name}</strong>
                      <span className="token-type">{formatLabel(honeytoken.type)}</span>
                    </div>
                    <code>{honeytoken.placement_path}</code>
                    {honeytoken.reasoning && <p>{honeytoken.reasoning}</p>}
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <div className="empty-state empty-state--compact">
              <div>
                <h4>No new placements recommended</h4>
                <p>The current coverage already matches the strategy returned by the analysis.</p>
              </div>
            </div>
          )}
        </section>
      )}

      <section className="section inventory-section" aria-labelledby="inventory-title">
        <div className="section-heading">
          <div>
            <p className="section-kicker">Organization map</p>
            <h3 id="inventory-title">Honeytoken inventory</h3>
          </div>
          <div className="inventory-summary" aria-label="Inventory summary">
            <span><strong>{tokens.length}</strong> active tokens</span>
            <span><strong>{departmentGroups.length}</strong> protected departments</span>
          </div>
        </div>

        <div className="card inventory-panel">
          {tokensLoading && tokens.length === 0 && (
            <div className="state-panel state-panel--loading" aria-label="Loading honeytoken inventory">
              <span className="loading-indicator" aria-hidden="true" />
              <div>
                <h4>Mapping deception coverage</h4>
                <p>Loading departments and active honeytoken placements.</p>
              </div>
            </div>
          )}

          {!tokensLoading && tokensError && tokens.length === 0 && (
            <div className="state-panel state-panel--error" role="alert">
              <p className="state-panel__eyebrow">Inventory unavailable</p>
              <h4>Honeytokens could not be loaded</h4>
              <p>{tokensError}</p>
              <button className="btn" type="button" onClick={() => load()}>
                Try again
              </button>
            </div>
          )}

          {!tokensLoading && !tokensError && tokens.length === 0 && (
            <div className="empty-state">
              <span className="empty-state__icon" aria-hidden="true">＋</span>
              <div>
                <h4>No honeytokens deployed yet</h4>
                <p>Analyze the organization to generate a tailored deception strategy.</p>
                <button className="btn" type="button" onClick={analyze} disabled={busy}>
                  Analyze organization
                </button>
              </div>
            </div>
          )}

          {tokens.length > 0 && (
            <div className="department-grid">
              {departmentGroups.map(([department, departmentTokens]) => (
                <article className="department-card" key={department}>
                  <header className="department-card__header">
                    <span className="department-card__icon" aria-hidden="true">▦</span>
                    <div>
                      <h4>{department}</h4>
                      <span>{departmentTokens.length} active {departmentTokens.length === 1 ? 'token' : 'tokens'}</span>
                    </div>
                  </header>
                  <ul className="token-list">
                    {departmentTokens.map((token) => (
                      <li className="token-row" key={token.id}>
                        <span className="token-row__indicator" aria-hidden="true" />
                        <div className="token-row__copy">
                          <div className="token-row__header">
                            <strong>{token.name}</strong>
                            <span className="token-type">{formatLabel(token.type)}</span>
                          </div>
                          <code>{token.placement_path || 'Placement path not reported'}</code>
                        </div>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
