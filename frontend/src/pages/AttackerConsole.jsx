import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

const scenarios = [
  {
    id: 'broken_auth',
    name: 'Broken Auth',
    category: 'Initial Access',
    description: 'Replay a decoy administrator credential against the target login flow.',
    signal: 'Credential misuse',
  },
  {
    id: 'ssrf',
    name: 'SSRF',
    category: 'Reconnaissance',
    description: 'Probe the internal metadata boundary through the administrative fetch service.',
    signal: 'Metadata access',
  },
  {
    id: 'xss',
    name: 'Stored XSS',
    category: 'Web Exploitation',
    description: 'Plant a controlled script payload in the course review workflow.',
    signal: 'Script injection',
  },
  {
    id: 'idor',
    name: 'IDOR',
    category: 'Access Control',
    description: 'Attempt to enumerate a student record outside the active user boundary.',
    signal: 'Object enumeration',
  },
];

const terminalStatuses = new Set(['completed', 'failed', 'error', 'cancelled']);

function formatTime(value) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleTimeString();
}

function statusLabel(status) {
  if (status === 'launching') return 'Launching';
  if (status === 'running') return 'In progress';
  if (status === 'completed') return 'Completed';
  if (status === 'failed') return 'Failed';
  if (status === 'cancelled') return 'Cancelled';
  if (status === 'error') return 'Connection error';
  return 'Ready';
}

export default function AttackerConsole() {
  const [selected, setSelected] = useState('broken_auth');
  const [status, setStatus] = useState('ready');
  const [simulation, setSimulation] = useState(null);
  const [log, setLog] = useState([]);
  const [error, setError] = useState('');

  const grouped = useMemo(() => {
    return scenarios.reduce((acc, item) => {
      acc[item.category] = acc[item.category] || [];
      acc[item.category].push(item);
      return acc;
    }, {});
  }, []);

  const selectedScenario = scenarios.find((item) => item.id === selected) || scenarios[0];
  const isBusy = status === 'launching' || status === 'running';

  useEffect(() => {
    if (!simulation?.id) return undefined;

    let active = true;
    let timer;

    async function pollSimulation() {
      try {
        const [simulationResult, activityResult] = await Promise.allSettled([
          api.simulation(simulation.id),
          api.simulationLog(simulation.id),
        ]);

        if (!active) return;

        if (simulationResult.status === 'rejected') throw simulationResult.reason;

        const simulationState = simulationResult.value;
        setSimulation(simulationState);
        setStatus(simulationState.status || 'running');
        if (activityResult.status === 'fulfilled') {
          setLog(Array.isArray(activityResult.value.log) ? activityResult.value.log : []);
          setError('');
        } else {
          setError(activityResult.reason?.message || 'The activity trace is temporarily unavailable.');
        }

        if (terminalStatuses.has(simulationState.status)) return;
      } catch (pollError) {
        if (!active) return;
        setError(pollError.message || 'Live simulation status is temporarily unavailable.');
      }

      timer = window.setTimeout(pollSimulation, 1200);
    }

    pollSimulation();

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [simulation?.id]);

  async function launchScenario() {
    if (isBusy) return;

    setStatus('launching');
    setSimulation(null);
    setLog([]);
    setError('');

    try {
      const result = await api.startSimulation(selectedScenario.id);
      setSimulation(result);
      setStatus(result.status || 'running');
    } catch (launchError) {
      setStatus('error');
      setError(launchError.message || 'The simulation could not be started.');
    }
  }

  return (
    <section className="page-shell operations-page" aria-labelledby="attacker-console-title">
      <header className="page-header operations-hero">
        <div className="page-header-copy">
          <p className="eyebrow">Controlled attack lab</p>
          <h2 id="attacker-console-title">Attacker Console</h2>
          <p className="page-description">
            Exercise the Crestwood target environment and follow each simulated action as it is recorded.
          </p>
        </div>
        <div className="page-header-actions">
          <span className={`status-pill status-${status}`} role="status" aria-live="polite">
            <span className="status-dot" aria-hidden="true" />
            {statusLabel(status)}
          </span>
          <button className="btn btn-primary" type="button" onClick={launchScenario} disabled={isBusy}>
            {isBusy ? 'Simulation running…' : `Launch ${selectedScenario.name}`}
          </button>
        </div>
      </header>

      {error && (
        <div className="state-banner state-banner-error" role="alert">
          <span className="state-banner-icon" aria-hidden="true">!</span>
          <div>
            <strong>Simulation update interrupted</strong>
            <p>{error}</p>
          </div>
        </div>
      )}

      <div className="operations-grid">
        <aside className="card scenario-panel" aria-labelledby="scenario-library-title">
          <div className="panel-heading">
            <div>
              <p className="panel-kicker">Attack catalog</p>
              <h3 id="scenario-library-title">Scenario Library</h3>
            </div>
            <span className="count-chip">{scenarios.length}</span>
          </div>

          <div className="scenario-groups">
            {Object.entries(grouped).map(([category, items]) => (
              <section className="scenario-group" key={category} aria-labelledby={`scenario-${category.replace(/\s+/g, '-').toLowerCase()}`}>
                <h4 className="scenario-group-title" id={`scenario-${category.replace(/\s+/g, '-').toLowerCase()}`}>
                  {category}
                </h4>
                <div className="scenario-list">
                  {items.map((item) => {
                    const isSelected = selected === item.id;
                    return (
                      <button
                        key={item.id}
                        className={`scenario-card ${isSelected ? 'selected' : ''}`}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => setSelected(item.id)}
                        disabled={isBusy}
                      >
                        <span className="scenario-card-main">
                          <strong>{item.name}</strong>
                          <span>{item.description}</span>
                        </span>
                        <span className="scenario-signal">{item.signal}</span>
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        </aside>

        <section className="card activity-panel" aria-labelledby="live-activity-title">
          <div className="panel-heading">
            <div>
              <p className="panel-kicker">Execution trace</p>
              <h3 id="live-activity-title">Live Activity</h3>
            </div>
            {simulation?.id && <code className="simulation-id">{simulation.id}</code>}
          </div>

          <div className="activity-summary">
            <div>
              <span className="activity-summary-label">Selected scenario</span>
              <strong>{selectedScenario.name}</strong>
            </div>
            <div>
              <span className="activity-summary-label">Expected signal</span>
              <strong>{selectedScenario.signal}</strong>
            </div>
          </div>

          <div
            className={`terminal-log ${isBusy ? 'is-active' : ''}`}
            role="log"
            aria-live="polite"
            aria-busy={isBusy}
            aria-label="Simulation activity log"
          >
            <div className="terminal-toolbar" aria-hidden="true">
              <span />
              <span />
              <span />
              <strong>arachne / attack-trace</strong>
            </div>

            {status === 'ready' && (
              <div className="terminal-empty">
                <span className="terminal-prompt" aria-hidden="true">$</span>
                <p>Select a scenario, then launch it to stream the execution trace.</p>
              </div>
            )}

            {status === 'launching' && (
              <div className="terminal-empty">
                <span className="loading-indicator" aria-hidden="true" />
                <p>Creating a controlled {selectedScenario.name} simulation…</p>
              </div>
            )}

            {simulation && !log.length && status === 'running' && (
              <div className="terminal-empty">
                <span className="loading-indicator" aria-hidden="true" />
                <p>Simulation accepted. Waiting for the first activity event…</p>
              </div>
            )}

            {log.length > 0 && (
              <ol className="activity-log-list">
                {log.map((entry, index) => (
                  <li key={`${entry.timestamp || entry.message}-${index}`} className="log-line">
                    <span className="log-marker" aria-hidden="true" />
                    <div className="log-content">
                      <div className="log-heading">
                        <strong>{entry.message || 'Simulation event'}</strong>
                        {formatTime(entry.timestamp) && <time dateTime={entry.timestamp}>{formatTime(entry.timestamp)}</time>}
                      </div>
                      {entry.detail && <pre className="log-detail">{entry.detail}</pre>}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>

          {simulation?.resulting_incident_id && (
            <div className="simulation-result state-banner state-banner-success">
              <div>
                <strong>Incident created</strong>
                <p>The defensive workflow captured this simulation and opened an incident.</p>
              </div>
              <Link className="btn btn-secondary" to={`/incidents/${simulation.resulting_incident_id}`}>
                Open incident
              </Link>
            </div>
          )}
        </section>
      </div>
    </section>
  );
}
