import { useCallback, useEffect, useMemo, useState } from 'react';
import { ApiError, api, clearToken, hasToken, setToken } from './api';
import { findScenario, SCENARIO_CATEGORIES, SCENARIOS } from './scenarios';

const TERMINAL_STATUSES = new Set(['completed', 'failed', 'cancelled', 'error']);
const DASHBOARD_URL = (import.meta.env.VITE_DASHBOARD_URL || 'http://localhost:3002').replace(/\/$/, '');
const DECOY_DOCUMENT_CLASSIFICATION = 'synthetic_decoy_document';

function normalizeStatus(status) {
  if (status === 'complete') return 'completed';
  return status || 'ready';
}

function statusLabel(status) {
  const labels = {
    ready: 'Ready',
    starting: 'Starting',
    running: 'Running',
    completed: 'Completed',
    failed: 'Failed',
    cancelled: 'Cancelled',
    error: 'Error',
  };
  return labels[status] || status;
}

function formatTimestamp(value, includeDate = false) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return includeDate ? date.toLocaleString() : date.toLocaleTimeString();
}

function safeText(value, fallback, maximumLength = 240) {
  if (typeof value !== 'string' && typeof value !== 'number') return fallback;
  const normalized = String(value)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!normalized) return fallback;
  return normalized.length > maximumLength ? `${normalized.slice(0, maximumLength)}…` : normalized;
}

function parseHttpTrace(logs) {
  return logs.flatMap((entry, index) => {
    const match = String(entry?.message || '').match(/^(GET|POST|PUT|PATCH|DELETE)\s+(\S+)(?:\s+(FAILED))?/i);
    if (!match) return [];

    const detail = String(entry?.detail || '');
    const statusMatch = detail.match(/Status:\s*([^\n]+)/i);
    const rawStatus = statusMatch?.[1]?.trim() || (match[3] ? 'error' : 'unknown');
    const status = /^(?:[1-5]\d{2}|error|unknown)$/i.test(rawStatus) ? rawStatus : 'recorded';

    return [{
      id: `${entry.timestamp || 'trace'}-${index}`,
      method: match[1].toUpperCase(),
      path: safeText(match[2].split(/[?#]/)[0], '[path withheld]', 160),
      failed: Boolean(match[3]),
      status,
      timestamp: entry.timestamp,
    }];
  });
}

function deriveArtifacts(suppliedArtifacts = [], scenario) {
  return suppliedArtifacts
    .filter((artifact) => (
      artifact
      && artifact.kind === 'document'
      && artifact.is_decoy === true
      && artifact.classification === DECOY_DOCUMENT_CLASSIFICATION
    ))
    .map((artifact, index) => ({
      id: `decoy-${scenario.id}-${index}`,
      label: safeText(artifact.name, `${scenario.shortName || scenario.name} decoy ${index + 1}`, 96),
      source: safeText(artifact.source, 'controlled decoy registry', 120),
      value: safeText(artifact.preview, 'Synthetic decoy preview intentionally unavailable.'),
      size: safeText(artifact.size, 'size withheld', 24),
      status: 'fake retrieved',
      classification: 'SYNTHETIC_DECOY_DOCUMENT',
    }));
}

async function fetchRunSnapshot(simulationId) {
  const [simulationResult, logResult] = await Promise.allSettled([
    api.simulation(simulationId),
    api.simulationLog(simulationId),
  ]);

  if (simulationResult.status === 'rejected' && logResult.status === 'rejected') {
    throw simulationResult.reason;
  }

  return { simulationResult, logResult };
}

function ConsoleGlyph({ name }) {
  const paths = {
    terminal: <><path d="M4 6h16v12H4z" /><path d="m7 10 2 2-2 2M11 14h4" /></>,
    shield: <><path d="M12 3 5 6v5c0 4.5 2.8 7.8 7 10 4.2-2.2 7-5.5 7-10V6z" /><path d="m9 12 2 2 4-4" /></>,
    pulse: <path d="M3 12h4l2-5 4 10 2-5h6" />,
    exit: <><path d="M10 5H5v14h5M14 8l4 4-4 4M8 12h10" /></>,
    search: <><circle cx="11" cy="11" r="6" /><path d="m16 16 4 4" /></>,
    play: <path d="m9 7 8 5-8 5z" />,
    link: <><path d="M10 14 8.5 15.5a3 3 0 0 1-4-4L8 8a3 3 0 0 1 4 0" /><path d="m14 10 1.5-1.5a3 3 0 0 1 4 4L16 16a3 3 0 0 1-4 0" /></>,
  };

  return (
    <svg className="console-glyph" viewBox="0 0 24 24" aria-hidden="true">
      {paths[name] || paths.terminal}
    </svg>
  );
}

function LoadingScreen() {
  return (
    <main className="session-screen session-loading" aria-live="polite">
      <div className="boot-mark" aria-hidden="true"><span /><span /><span /></div>
      <p>Validating operator session</p>
    </main>
  );
}

function Login({ onAuthenticated }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (pending) return;

    setPending(true);
    setError('');
    try {
      const { access_token: accessToken } = await api.login(email.trim(), password);
      setToken(accessToken);
      const operator = await api.me();
      onAuthenticated(operator);
    } catch (loginError) {
      clearToken();
      setError(loginError.message || 'Authentication failed.');
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="session-screen login-screen">
      <section className="login-intro" aria-labelledby="login-product-title">
        <div className="brand-lockup">
          <span className="brand-mark"><ConsoleGlyph name="terminal" /></span>
          <span>ARACHNE / LAB</span>
        </div>
        <div className="login-intro-copy">
          <p className="overline">Controlled security validation</p>
          <h1 id="login-product-title">Operate the attack surface.<br /><span>Observe every signal.</span></h1>
          <p>Run bounded local simulations, inspect sanitized request status, and retrieve planted fake documents only. This console never exposes organization files.</p>
        </div>
        <ul className="boundary-list" aria-label="Simulation safeguards">
          <li><span>01</span> Fixed local scenario registry</li>
          <li><span>02</span> Safe, deterministic payloads</li>
          <li><span>03</span> Metadata-only HTTP trace</li>
        </ul>
      </section>

      <section className="login-panel" aria-labelledby="login-title">
        <div className="auth-card">
          <div className="auth-card-header">
            <span className="auth-icon"><ConsoleGlyph name="shield" /></span>
            <div>
              <p className="overline">Operator access</p>
              <h2 id="login-title">Authenticate</h2>
            </div>
          </div>
          <p className="auth-description">Use an authorized security-platform account to open the simulator.</p>

          {error && <div className="inline-alert" role="alert"><strong>Access denied</strong><span>{error}</span></div>}

          <form className="auth-form" onSubmit={submit}>
            <label htmlFor="operator-email">Operator email</label>
            <input
              id="operator-email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="operator@example.com"
              required
            />

            <div className="field-heading">
              <label htmlFor="operator-password">Password</label>
              <button type="button" className="text-button" onClick={() => setShowPassword((value) => !value)}>
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <input
              id="operator-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Enter password"
              required
            />

            <button className="primary-action auth-submit" type="submit" disabled={pending}>
              {pending ? <span className="button-loader" aria-hidden="true" /> : <ConsoleGlyph name="terminal" />}
              {pending ? 'Establishing session…' : 'Enter operator console'}
            </button>
          </form>
          <p className="auth-footnote"><span className="signal-dot" /> API-backed authentication · bearer session</p>
        </div>
      </section>
    </main>
  );
}

function ScenarioLibrary({ selectedId, query, category, disabled, isOpen, onToggle, onQuery, onCategory, onSelect }) {
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return SCENARIOS.filter((scenario) => {
      const matchesCategory = category === 'all' || scenario.category === category;
      const matchesQuery = !needle || [scenario.name, scenario.shortName, scenario.category, scenario.id]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(needle));
      return matchesCategory && matchesQuery;
    });
  }, [category, query]);

  const grouped = useMemo(() => filtered.reduce((result, scenario) => {
    (result[scenario.category] ||= []).push(scenario);
    return result;
  }, {}), [filtered]);

  const selectedScenario = findScenario(selectedId);

  return (
    <aside className={`scenario-library ${isOpen ? 'library-open' : ''}`} aria-labelledby="scenario-library-title">
      <div className="library-heading">
        <div>
          <p className="overline">Scenario registry</p>
          <h2 id="scenario-library-title">Attack modules</h2>
        </div>
        <span className="module-count" aria-label={`${SCENARIOS.length} modules`}>{SCENARIOS.length}</span>
        <button
          className="library-toggle"
          type="button"
          aria-expanded={isOpen}
          aria-controls="scenario-library-content"
          onClick={onToggle}
        >
          <span><small>Selected module {selectedScenario.sequence}</small><strong>{selectedScenario.shortName || selectedScenario.name}</strong></span>
          <i aria-hidden="true">{isOpen ? '−' : '+'}</i>
        </button>
      </div>

      <div className="library-content" id="scenario-library-content">
        <label className="scenario-search" htmlFor="scenario-search-input">
          <ConsoleGlyph name="search" />
          <span className="sr-only">Search scenarios</span>
          <input
            id="scenario-search-input"
            type="search"
            value={query}
            onChange={(event) => onQuery(event.target.value)}
            placeholder="Filter modules…"
            disabled={disabled}
          />
          {query && <button type="button" onClick={() => onQuery('')} aria-label="Clear search">×</button>}
        </label>

        <div className="category-filter" role="group" aria-label="Filter by category">
          <button type="button" className={category === 'all' ? 'active' : ''} onClick={() => onCategory('all')} disabled={disabled}>All</button>
          {SCENARIO_CATEGORIES.map((item) => (
            <button key={item} type="button" className={category === item ? 'active' : ''} onClick={() => onCategory(item)} disabled={disabled}>
              {item}
            </button>
          ))}
        </div>

        <div className="scenario-groups">
          {Object.entries(grouped).map(([group, scenarios]) => (
            <section className="scenario-group" key={group}>
              <h3>{group}<span>{scenarios.length}</span></h3>
              <div className="scenario-list">
                {scenarios.map((scenario) => {
                  const selected = scenario.id === selectedId;
                  return (
                    <button
                      key={scenario.id}
                      type="button"
                      className={`scenario-option ${selected ? 'selected' : ''}`}
                      onClick={() => onSelect(scenario.id)}
                      disabled={disabled}
                      aria-pressed={selected}
                      aria-current={selected ? 'true' : undefined}
                    >
                      <span className="scenario-sequence">{scenario.sequence}</span>
                      <span className="scenario-option-copy">
                        <strong>{scenario.shortName || scenario.name}</strong>
                        <small>{scenario.method} · {scenario.target.split('/').pop()}</small>
                      </span>
                      <span className="scenario-cursor" aria-hidden="true">›</span>
                    </button>
                  );
                })}
              </div>
            </section>
          ))}

          {!filtered.length && (
            <div className="library-empty">
              <strong>No matching modules</strong>
              <p>Clear the filters to restore the scenario registry.</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

function WorkflowRail({ hasRun, status }) {
  const activeStep = !hasRun ? 1 : TERMINAL_STATUSES.has(status) ? 3 : 2;
  const steps = [
    ['01', 'Select', 'Review a module'],
    ['02', 'Execute', 'Stream the run'],
    ['03', 'Inspect', 'Open fake documents'],
  ];

  return (
    <ol className="workflow-rail" aria-label="Simulation workflow">
      {steps.map(([number, label, detail], index) => {
        const position = index + 1;
        return (
          <li key={number} className={position === activeStep ? 'active' : position < activeStep ? 'complete' : ''}>
            <span>{position < activeStep ? '✓' : number}</span>
            <div><strong>{label}</strong><small>{detail}</small></div>
          </li>
        );
      })}
    </ol>
  );
}

function ScenarioBrief({ scenario, armed, busy, onArmed, onLaunch }) {
  return (
    <section className="brief-card" aria-labelledby="scenario-brief-title">
      <div className="brief-topline">
        <span className="module-identity">MODULE {scenario.sequence} / {scenario.category.toUpperCase()}</span>
        <span className="safe-chip"><ConsoleGlyph name="shield" /> contained simulation</span>
      </div>

      <div className="brief-heading">
        <div>
          <h2 id="scenario-brief-title">{scenario.name}</h2>
          <p>{scenario.objective}</p>
        </div>
        <span className="method-badge">{scenario.method}</span>
      </div>

      <div className="brief-grid">
        <div className="brief-block target-block">
          <span className="block-label">Target route</span>
          <code>{scenario.target}</code>
        </div>
        <div className="brief-block">
          <span className="block-label">Expected detection</span>
          <p>{scenario.detection}</p>
        </div>
      </div>

      <div className="payload-preview">
        <div className="payload-heading">
          <span><i /> Simulated request profile</span>
          <small>read only</small>
        </div>
        <pre>{scenario.requestPreview}</pre>
      </div>

      <div className="launch-controls">
        <label className={`arm-control ${armed ? 'armed' : ''}`}>
          <input type="checkbox" checked={armed} onChange={(event) => onArmed(event.target.checked)} disabled={busy} />
          <span className="arm-toggle" aria-hidden="true"><i /></span>
          <span><strong>Safety interlock</strong><small>Confirm this is the configured local simulation target.</small></span>
        </label>
        <button className="primary-action launch-action" type="button" onClick={onLaunch} disabled={!armed || busy}>
          {busy ? <span className="button-loader" aria-hidden="true" /> : <ConsoleGlyph name="play" />}
          {busy ? 'Run in progress…' : `Launch module ${scenario.sequence}`}
        </button>
      </div>
    </section>
  );
}

function EmptyOutput({ status, scenario }) {
  const running = status === 'starting' || status === 'running';
  return (
    <div className="output-empty" role="status">
      {running ? <span className="scan-loader" aria-hidden="true"><i /></span> : <span className="empty-prompt" aria-hidden="true">_</span>}
      <strong>{running ? 'Waiting for simulator output' : 'No run output yet'}</strong>
      <p>{running ? `${scenario.shortName || scenario.name} has been accepted. The first event will appear here.` : 'Arm and launch this module to begin the trace.'}</p>
    </div>
  );
}

function StreamView({ logs, status, scenario }) {
  if (!logs.length) return <EmptyOutput status={status} scenario={scenario} />;

  return (
    <ol className="event-stream" aria-label="Live simulator events">
      {logs.map((entry, index) => {
        const message = safeText(entry?.message, 'Simulator event', 180);
        const tone = /failed|error/i.test(message) ? 'error' : /completed/i.test(message) ? 'success' : 'neutral';
        const httpStatus = String(entry?.detail || '').match(/Status:\s*([1-5]\d{2})/i)?.[1];
        return (
          <li key={`${entry?.timestamp || message}-${index}`} className={`stream-event ${tone}`}>
            <span className="stream-node" aria-hidden="true" />
            <time dateTime={entry?.timestamp}>{formatTimestamp(entry?.timestamp)}</time>
            <div>
              <strong>{message}</strong>
              {httpStatus && <p className="safe-log-detail">HTTP {httpStatus} · response body withheld</p>}
              {entry?.detail && !httpStatus && <p className="safe-log-detail">Event recorded · raw detail withheld</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function TraceView({ traces, scenario, status }) {
  return (
    <div className="trace-view">
      <article className="planned-request">
        <div>
          <span className="trace-index">PLAN</span>
          <div><strong>Simulator request profile</strong><code>{scenario.target}</code></div>
        </div>
        <pre>{scenario.requestPreview}</pre>
      </article>

      {!traces.length ? (
        <EmptyOutput status={status} scenario={scenario} />
      ) : (
        <ol className="http-trace-list">
          {traces.map((trace, index) => (
            <li key={trace.id} className="http-trace">
              <div className="http-trace-heading">
                <span className="trace-index">{String(index + 1).padStart(2, '0')}</span>
                <span className={`http-method method-${trace.method.toLowerCase()}`}>{trace.method}</span>
                <code>{trace.path}</code>
                <span className={`http-status ${trace.failed || trace.status === 'error' ? 'failed' : ''}`}>{trace.status}</span>
              </div>
              <div className="http-response">
                <span>Safe response record</span>
                <p><strong>HTTP {trace.status}</strong> · Body withheld. Retrieved content is shown only when it is a verified synthetic decoy document.</p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function ArtifactView({ artifacts, blockedCount, status, scenario }) {
  const running = status === 'starting' || status === 'running';
  return (
    <div className="artifact-view">
      <div className="artifact-notice">
        <ConsoleGlyph name="shield" />
        <p>
          <strong>Fake documents retrieved</strong>
          <span>The attacker retrieved {artifacts.length} planted synthetic {artifacts.length === 1 ? 'decoy' : 'decoys'}. Real organization documents are never displayed.</span>
        </p>
        <div className="decoy-count" aria-label={`${artifacts.length} fake documents retrieved and zero real documents exposed`}>
          <strong>{String(artifacts.length).padStart(2, '0')}</strong>
          <span>FAKE DOCS</span>
          <small>0 REAL DOCUMENTS EXPOSED</small>
        </div>
      </div>
      {blockedCount > 0 && <p className="blocked-artifact-note" role="status">{blockedCount} unclassified {blockedCount === 1 ? 'item was' : 'items were'} hidden by the decoy-only boundary.</p>}
      {!artifacts.length ? (
        <div className="fake-document-empty" role="status">
          {running ? <span className="scan-loader" aria-hidden="true"><i /></span> : <span className="empty-prompt" aria-hidden="true">_</span>}
          <strong>{running ? 'Scanning for planted decoys' : 'No fake documents retrieved yet'}</strong>
          <p>{running ? `${scenario.shortName || scenario.name} is running. Only verified synthetic decoys can appear here.` : 'Launch a module to retrieve planted fake documents. Organization files remain outside the attacker view.'}</p>
          <span className="empty-boundary-label">SYNTHETIC_DECOY_DOCUMENT · ORG_DATA_EXPOSED = FALSE</span>
        </div>
      ) : (
        <div className="artifact-list" aria-label="Retrieved fake documents">
          {artifacts.map((artifact, index) => (
            <article className="artifact-card" key={artifact.id} aria-label={`Fake synthetic decoy document: ${artifact.label}`}>
              <div className="decoy-ribbon">FAKE / DECOY</div>
              <div className="artifact-card-heading">
                <span className="artifact-number">D{String(index + 1).padStart(2, '0')}</span>
                <div><strong>{artifact.label}</strong><small>{artifact.source}</small></div>
              </div>
              <div className="artifact-metadata" aria-label="Fake document metadata">
                <span>FAKE DOCUMENT</span>
                <span>{artifact.size}</span>
                <span className="artifact-retrieved">{artifact.status}</span>
                <span className="artifact-classification">{artifact.classification}</span>
              </div>
              <div className="decoy-preview">
                <span>Safe decoy preview · not organization data</span>
                <pre>{artifact.value}</pre>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function DataBoundary({ boundary, progress, responseActions }) {
  const boundaryReady = Boolean(boundary);
  const rejectedBoundaryClaim = boundary?.organization_records_exposed === true;
  const attackerViewLabel = boundary?.attacker_view === 'seeded_fake_documents_only'
    ? 'seeded fake documents only'
    : 'decoy-only boundary enforced locally';
  const boundedChecks = boundaryReady ? [
    ['HOST_EXECUTION', boundary.host_execution_performed],
    ['EXTERNAL_TARGET', boundary.external_network_targeted],
  ] : [];

  return (
    <section className="boundary-panel" aria-label="Simulation data boundary">
      <div className="progress-block">
        <div><span>Run progress</span><strong>{Math.max(0, Math.min(100, Number(progress) || 0))}%</strong></div>
        <progress className="progress-track" aria-label="Simulation progress" max="100" value={Math.max(0, Math.min(100, Number(progress) || 0))} />
      </div>
      <div className={`boundary-verdict ${rejectedBoundaryClaim ? 'unsafe' : 'safe'}`}>
        <span>Data boundary</span>
        <strong>ORG_DATA_EXPOSED = FALSE</strong>
        <small>{rejectedBoundaryClaim ? 'invalid exposure claim blocked' : attackerViewLabel}</small>
      </div>
      <div className="boundary-checks">
        {boundedChecks.map(([label, value]) => (
          <span key={label} className={value ? 'unsafe' : 'safe'}>{label} = {String(Boolean(value)).toUpperCase()}</span>
        ))}
        {responseActions.map((action) => <span key={action} className="response-action">{action.replace(/_/g, ' ')}</span>)}
        {rejectedBoundaryClaim && <span className="unsafe">INVALID EXPOSURE CLAIM BLOCKED</span>}
        {!boundaryReady && <span className="pending-check">Boundary checks pending</span>}
      </div>
    </section>
  );
}

function OutputWorkspace({ scenario, status, run, logs, runMeta, syncError, lastSync, activeTab, onTab, onRefresh }) {
  const traces = useMemo(() => parseHttpTrace(logs), [logs]);
  const artifacts = useMemo(
    () => deriveArtifacts(runMeta.artifacts, scenario),
    [runMeta.artifacts, scenario],
  );
  const blockedArtifactCount = Math.max(0, runMeta.artifacts.length - artifacts.length);
  const tabs = [
    ['stream', 'Event stream', logs.length],
    ['trace', 'HTTP trace', traces.length],
    ['artifacts', 'Fake documents retrieved', artifacts.length],
  ];

  function moveTabFocus(event, currentId) {
    const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End'];
    if (!keys.includes(event.key)) return;

    event.preventDefault();
    const currentIndex = tabs.findIndex(([id]) => id === currentId);
    const nextIndex = event.key === 'Home'
      ? 0
      : event.key === 'End'
        ? tabs.length - 1
        : (currentIndex + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    const nextId = tabs[nextIndex][0];
    onTab(nextId);
    window.requestAnimationFrame(() => document.getElementById(`tab-${nextId}`)?.focus());
  }

  return (
    <section className="output-card" aria-labelledby="run-output-title" aria-busy={status === 'starting' || status === 'running'}>
      <header className="output-header">
        <div>
          <p className="overline">Attacker view · decoys only</p>
          <h2 id="run-output-title">Fake-document retrieval trace</h2>
        </div>
        <div className="output-status">
          <span className={`run-status status-${status}`}><i />{statusLabel(status)}</span>
          <small>{lastSync ? `synced ${formatTimestamp(lastSync)}` : 'not synchronized'}</small>
        </div>
      </header>

      {syncError && (
        <div className="sync-alert" role="alert">
          <span>!</span><p><strong>Trace synchronization delayed</strong>{syncError}</p>
          {run?.id && TERMINAL_STATUSES.has(status) && <button type="button" onClick={onRefresh}>Retry</button>}
        </div>
      )}

      <DataBoundary boundary={runMeta.dataBoundary} progress={runMeta.progress} responseActions={runMeta.responseActions} />

      <div className="output-tabs" role="tablist" aria-label="Run output views">
        {tabs.map(([id, label, count]) => (
          <button
            key={id}
            id={`tab-${id}`}
            type="button"
            role="tab"
            aria-selected={activeTab === id}
            aria-controls={`panel-${id}`}
            className={activeTab === id ? 'active' : ''}
            tabIndex={activeTab === id ? 0 : -1}
            onClick={() => onTab(id)}
            onKeyDown={(event) => moveTabFocus(event, id)}
          >
            {label}<span>{count}</span>
          </button>
        ))}
      </div>

      <div className="output-viewport" id={`panel-${activeTab}`} role="tabpanel" aria-labelledby={`tab-${activeTab}`} aria-live={activeTab === 'stream' ? 'polite' : 'off'}>
        {activeTab === 'stream' && <StreamView logs={logs} status={status} scenario={scenario} />}
        {activeTab === 'trace' && <TraceView traces={traces} scenario={scenario} status={status} />}
        {activeTab === 'artifacts' && <ArtifactView artifacts={artifacts} blockedCount={blockedArtifactCount} status={status} scenario={scenario} />}
      </div>
    </section>
  );
}

function RunResult({ run, status, scenario, onRefresh }) {
  if (!run?.id) return null;

  const completed = status === 'completed';
  return (
    <section className={`result-bar ${completed ? 'result-complete' : ''}`} aria-live="polite">
      <div className="result-icon"><ConsoleGlyph name={completed ? 'shield' : 'pulse'} /></div>
      <div className="result-copy">
        <span>{completed ? 'Simulation complete · fake documents only' : 'Active decoy simulation'}</span>
        <strong>{scenario.shortName || scenario.name}</strong>
        <code>{run.id}</code>
      </div>
      <dl>
        <div><dt>Started</dt><dd>{formatTimestamp(run.started_at, true)}</dd></div>
        <div><dt>Finished</dt><dd>{formatTimestamp(run.finished_at, true)}</dd></div>
      </dl>
      {run.resulting_incident_id ? (
        <a className="incident-link" href={`${DASHBOARD_URL}/incidents/${encodeURIComponent(run.resulting_incident_id)}`} target="_blank" rel="noreferrer">
          Open resulting incident <ConsoleGlyph name="link" />
        </a>
      ) : completed ? (
        <button className="secondary-action" type="button" onClick={onRefresh}>Refresh incident link</button>
      ) : (
        <span className="result-waiting"><i /> awaiting detection</span>
      )}
    </section>
  );
}

function OperatorConsole({ operator, onLogout }) {
  const [selectedId, setSelectedId] = useState(SCENARIOS[0].id);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const [armed, setArmed] = useState(false);
  const [run, setRun] = useState(null);
  const [runStatus, setRunStatus] = useState('ready');
  const [logs, setLogs] = useState([]);
  const [runError, setRunError] = useState('');
  const [syncError, setSyncError] = useState('');
  const [lastSync, setLastSync] = useState('');
  const [activeTab, setActiveTab] = useState('stream');
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [runMeta, setRunMeta] = useState({
    progress: 0,
    artifacts: [],
    responseActions: [],
    dataBoundary: null,
  });

  const scenario = findScenario(run?.scenario_name || selectedId);
  const busy = runStatus === 'starting' || runStatus === 'running';

  const applySnapshot = useCallback((snapshot) => {
    const { simulationResult, logResult } = snapshot;
    let nextStatus;

    if (simulationResult.status === 'fulfilled') {
      setRun((current) => ({ ...current, ...simulationResult.value }));
      nextStatus = normalizeStatus(simulationResult.value.status);
    }

    if (logResult.status === 'fulfilled') {
      const logPayload = logResult.value;
      setLogs(Array.isArray(logPayload.log) ? logPayload.log : []);
      setRunMeta({
        progress: Number(logPayload.progress) || 0,
        artifacts: Array.isArray(logPayload.artifacts) ? logPayload.artifacts : [],
        responseActions: Array.isArray(logPayload.response_actions) ? logPayload.response_actions : [],
        dataBoundary: logPayload.data_boundary || null,
      });
      if (logPayload.resulting_incident_id) {
        setRun((current) => ({ ...current, resulting_incident_id: logPayload.resulting_incident_id }));
      }
      nextStatus ||= normalizeStatus(logPayload.status);
    }

    const failedResult = simulationResult.status === 'rejected' ? simulationResult : logResult.status === 'rejected' ? logResult : null;
    if (failedResult) setSyncError(failedResult.reason?.message || 'One output channel could not be synchronized.');
    else setSyncError('');

    if (nextStatus) setRunStatus(nextStatus);
    setLastSync(new Date().toISOString());
    return nextStatus;
  }, []);

  useEffect(() => {
    if (!run?.id) return undefined;

    let active = true;
    let timer;

    async function poll() {
      try {
        const snapshot = await fetchRunSnapshot(run.id);
        if (!active) return;
        const nextStatus = applySnapshot(snapshot);
        if (nextStatus && TERMINAL_STATUSES.has(nextStatus)) return;
      } catch (error) {
        if (!active) return;
        if (error instanceof ApiError && error.status === 401) {
          onLogout();
          return;
        }
        setSyncError(error.message || 'The run could not be synchronized. Retrying…');
      }

      timer = window.setTimeout(poll, 1000);
    }

    poll();
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [applySnapshot, onLogout, run?.id]);

  function selectScenario(id) {
    if (busy) return;
    setLibraryOpen(false);
    if (id === selectedId) return;
    setSelectedId(id);
    setArmed(false);
    setRun(null);
    setRunStatus('ready');
    setLogs([]);
    setRunError('');
    setSyncError('');
    setLastSync('');
    setActiveTab('stream');
    setRunMeta({ progress: 0, artifacts: [], responseActions: [], dataBoundary: null });
  }

  async function launch() {
    if (!armed || busy) return;

    setRun(null);
    setRunStatus('starting');
    setLogs([]);
    setRunError('');
    setSyncError('');
    setLastSync('');
    setActiveTab('stream');
    setRunMeta({ progress: 0, artifacts: [], responseActions: [], dataBoundary: null });

    try {
      const startedRun = await api.startSimulation(selectedId);
      setRun(startedRun);
      setRunStatus(normalizeStatus(startedRun.status || 'running'));
      setArmed(false);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        onLogout();
        return;
      }
      setRunStatus('error');
      setRunError(error.message || 'The simulation could not be started.');
    }
  }

  async function refreshRun() {
    if (!run?.id) return;
    try {
      const snapshot = await fetchRunSnapshot(run.id);
      applySnapshot(snapshot);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) onLogout();
      else setSyncError(error.message || 'The run could not be refreshed.');
    }
  }

  return (
    <div className="operator-shell">
      <a className="skip-link" href="#operator-workspace">Skip to simulation workspace</a>
      <header className="console-topbar">
        <div className="brand-lockup console-brand">
          <span className="brand-mark"><ConsoleGlyph name="terminal" /></span>
          <div><strong>ARACHNE</strong><small>ATTACK SIMULATION CONSOLE</small></div>
        </div>
        <div className="environment-strip">
          <span><i /> LOCAL LAB</span>
          <code>/api/v1/simulation</code>
        </div>
        <div className="operator-session">
          <div><span>authenticated operator</span><strong>{operator.email}</strong></div>
          <a href={DASHBOARD_URL} target="_blank" rel="noreferrer" title="Open security dashboard"><ConsoleGlyph name="shield" /><span>Defense view</span></a>
          <button type="button" onClick={onLogout} title="End session"><ConsoleGlyph name="exit" /><span>Log out</span></button>
        </div>
      </header>

      <div className="console-body">
        <ScenarioLibrary
          selectedId={selectedId}
          query={query}
          category={category}
          disabled={busy}
          isOpen={libraryOpen}
          onToggle={() => setLibraryOpen((value) => !value)}
          onQuery={setQuery}
          onCategory={setCategory}
          onSelect={selectScenario}
        />

        <main className="operator-workspace" id="operator-workspace" tabIndex={-1}>
          <div className="workspace-heading">
            <div>
              <p className="command-path">operator@arachne:~/simulations/<span>{selectedId}</span>$</p>
              <h1>Simulation workspace</h1>
            </div>
            <WorkflowRail hasRun={Boolean(run)} status={runStatus} />
          </div>

          {runError && (
            <div className="run-alert" role="alert">
              <span>LAUNCH_ERROR</span><p>{runError}</p><button type="button" onClick={() => setRunError('')}>Dismiss</button>
            </div>
          )}

          <ScenarioBrief scenario={findScenario(selectedId)} armed={armed} busy={busy} onArmed={setArmed} onLaunch={launch} />
          <RunResult run={run} status={runStatus} scenario={scenario} onRefresh={refreshRun} />
          <OutputWorkspace
            scenario={scenario}
            status={runStatus}
            run={run}
            logs={logs}
            runMeta={runMeta}
            syncError={syncError}
            lastSync={lastSync}
            activeTab={activeTab}
            onTab={setActiveTab}
            onRefresh={refreshRun}
          />
        </main>
      </div>
    </div>
  );
}

export default function App() {
  const [sessionState, setSessionState] = useState(hasToken() ? 'checking' : 'signed-out');
  const [operator, setOperator] = useState(null);

  const logout = useCallback(() => {
    clearToken();
    setOperator(null);
    setSessionState('signed-out');
  }, []);

  useEffect(() => {
    if (!hasToken()) return undefined;
    let active = true;

    api.me()
      .then((user) => {
        if (!active) return;
        setOperator(user);
        setSessionState('authenticated');
      })
      .catch(() => {
        if (active) logout();
      });

    return () => { active = false; };
  }, [logout]);

  if (sessionState === 'checking') return <LoadingScreen />;
  if (sessionState !== 'authenticated') {
    return <Login onAuthenticated={(user) => { setOperator(user); setSessionState('authenticated'); }} />;
  }
  return <OperatorConsole operator={operator} onLogout={logout} />;
}
