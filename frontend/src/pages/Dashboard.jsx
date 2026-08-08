import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

const POLL_INTERVAL_MS = 5000;

function formatLabel(value = '') {
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDateTime(value) {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not recorded' : date.toLocaleString();
}

function statusClass(value = '') {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-');
}

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [threats, setThreats] = useState([]);
  const [activity, setActivity] = useState([]);
  const [incidents, setIncidents] = useState([]);
  const [posture, setPosture] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  const load = useCallback(async ({ background = false } = {}) => {
    if (background) setRefreshing(true);
    else setLoading(true);

    try {
      const [nextPosture, nextThreats, nextIncidents] = await Promise.all([
        api.dashboardStatus(),
        api.threats(),
        api.incidents(),
      ]);
      setSummary(nextPosture.summary);
      setThreats(nextThreats);
      setActivity(nextPosture.recent_activity);
      setIncidents(nextIncidents);
      setPosture(nextPosture);
      setLoadError('');
      setLastUpdated(new Date());
    } catch (error) {
      setLoadError(error.message || 'Unable to reach the monitoring service.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = window.setInterval(() => load({ background: true }), POLL_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, [load]);

  const hasData = Boolean(summary);
  const connectionState = loadError
    ? 'offline'
    : loading && !hasData
      ? 'connecting'
      : refreshing
        ? 'syncing'
        : 'connected';
  const connectionLabel = loadError
    ? 'Monitoring connection interrupted'
    : loading && !hasData
      ? 'Connecting to live monitoring'
      : refreshing
        ? 'Syncing live telemetry'
        : 'Live monitoring connected';

  const metrics = summary
    ? [
        { label: 'Open incidents', value: summary.open_incidents, tone: 'warning' },
        { label: 'Critical incidents', value: summary.critical_incidents, tone: 'critical' },
        { label: 'Honeytokens active', value: summary.honeytokens_deployed, tone: 'success' },
        { label: 'Events in 24 hours', value: summary.telemetry_events_24h, tone: 'neutral' },
        { label: 'Total incidents', value: summary.total_incidents, tone: 'neutral' },
      ]
    : [];

  const postureState = posture?.state || 'normal';
  const postureCopy = {
    normal: {
      eyebrow: 'Environment secure',
      title: 'No active threats detected',
      description: 'The deception mesh is monitoring protected assets and all current signals are within baseline.',
    },
    investigating: {
      eyebrow: 'Investigation active',
      title: 'Security agents are analyzing new activity',
      description: 'Telemetry has triggered an investigation. Evidence and containment guidance will update automatically.',
    },
    critical: {
      eyebrow: 'Critical response',
      title: 'A high-confidence threat needs review',
      description: 'An active incident has crossed the critical risk threshold. Open the triage queue to review evidence.',
    },
    contained: {
      eyebrow: 'Threat contained',
      title: 'The latest incident is under control',
      description: 'Approved response actions were recorded. Monitoring remains active for follow-on behavior.',
    },
  }[postureState] || {
    eyebrow: 'Monitoring active',
    title: 'Security posture available',
    description: 'ArachneAI is receiving the latest organization signals.',
  };

  return (
    <div className="page-shell dashboard-page" aria-busy={loading || refreshing}>
      <header className="page-header dashboard-header">
        <div className="page-header__copy">
          <p className="page-eyebrow">Security operations center</p>
          <h2>Threat overview</h2>
          <p className="page-subtitle">
            Monitor deception telemetry, triage active incidents, and track containment from one view.
          </p>
        </div>
        <div className="page-actions dashboard-header__actions">
          <button
            className="btn btn-secondary"
            type="button"
            onClick={() => load({ background: hasData })}
            disabled={loading || refreshing}
          >
            {refreshing ? 'Refreshing…' : 'Refresh data'}
          </button>
        </div>
      </header>

      {hasData && (
        <section className={`posture-banner posture-banner--${postureState}`} aria-live="polite">
          <span className="posture-banner__signal" aria-hidden="true"><i /></span>
          <div className="posture-banner__copy">
            <p>{postureCopy.eyebrow}</p>
            <h3>{postureCopy.title}</h3>
            <span>{postureCopy.description}</span>
          </div>
          <div className="posture-banner__meta">
            <strong>{posture?.open_incidents || 0}</strong>
            <span>open {posture?.open_incidents === 1 ? 'incident' : 'incidents'}</span>
          </div>
        </section>
      )}

      <section className={`system-status system-status--${connectionState}`} aria-live="polite">
        <span className="system-status__indicator" aria-hidden="true" />
        <div className="system-status__copy">
          <strong>{connectionLabel}</strong>
          <span>
            {lastUpdated
              ? `Last updated ${lastUpdated.toLocaleTimeString()}`
              : 'Waiting for the first telemetry snapshot'}
          </span>
        </div>
        {refreshing && <span className="system-status__activity">Receiving updates</span>}
      </section>

      {loadError && hasData && (
        <div className="status-banner status-banner--warning" role="status">
          <div>
            <strong>Live refresh paused.</strong>
            <span> Showing the most recent successful snapshot. {loadError}</span>
          </div>
          <button className="btn btn-secondary" type="button" onClick={() => load({ background: true })}>
            Retry connection
          </button>
        </div>
      )}

      {loading && !hasData && (
        <section className="card state-panel state-panel--loading" aria-label="Loading dashboard">
          <span className="loading-indicator" aria-hidden="true" />
          <div>
            <h3>Connecting to live telemetry</h3>
            <p>Loading the latest incidents, risk signals, and organization activity.</p>
          </div>
        </section>
      )}

      {!loading && loadError && !hasData && (
        <section className="card state-panel state-panel--error" role="alert">
          <p className="state-panel__eyebrow">Connection unavailable</p>
          <h3>The security dashboard could not be loaded</h3>
          <p>{loadError}</p>
          <button className="btn" type="button" onClick={() => load()}>
            Try again
          </button>
        </section>
      )}

      {summary && (
        <section className="metrics-section" aria-labelledby="dashboard-metrics-title">
          <div className="section-heading">
            <div>
              <p className="section-kicker">Current posture</p>
              <h3 id="dashboard-metrics-title">Security at a glance</h3>
            </div>
            <span className="section-meta">Auto-refreshes every 5 seconds</span>
          </div>
          <div className="card-grid metrics-grid">
            {metrics.map((metric) => (
              <article className={`card metric-card metric-card--${metric.tone}`} key={metric.label}>
                <span className="metric-card__label">{metric.label}</span>
                <strong className="stat-value metric-card__value">{metric.value}</strong>
                <span className="metric-card__context">
                  {metric.tone === 'critical' && metric.value > 0
                    ? 'Requires immediate review'
                    : metric.tone === 'warning' && metric.value > 0
                      ? 'Awaiting investigation or containment'
                      : 'Reported by the monitoring API'}
                </span>
              </article>
            ))}
          </div>
        </section>
      )}

      {hasData && (
        <>
          <section className="section incident-section" aria-labelledby="live-incidents-title">
            <div className="section-heading">
              <div>
                <p className="section-kicker">Triage queue</p>
                <h3 id="live-incidents-title">Live incidents</h3>
              </div>
              <span className="section-meta">
                {incidents.length} {incidents.length === 1 ? 'incident' : 'incidents'} recorded
              </span>
            </div>
            <div className="card data-panel">
              {incidents.length ? (
                <div className="table-scroll" role="region" aria-label="Live security incidents" tabIndex={0}>
                  <table className="incident-table">
                    <caption className="sr-only">Live incidents sorted by the backend service</caption>
                    <thead>
                      <tr>
                        <th scope="col">Incident</th>
                        <th scope="col">Attack</th>
                        <th scope="col">Risk</th>
                        <th scope="col">Status</th>
                        <th scope="col">Detected</th>
                        <th scope="col"><span className="sr-only">Actions</span></th>
                      </tr>
                    </thead>
                    <tbody>
                      {incidents.map((incident) => {
                        const riskPercent = Math.round(incident.risk_score * 100);
                        const severity = riskPercent >= 70 ? 'critical' : riskPercent >= 40 ? 'warning' : 'low';
                        return (
                          <tr key={incident.id}>
                            <td><code className="incident-id">{incident.id}</code></td>
                            <td><strong>{formatLabel(incident.attack_type)}</strong></td>
                            <td>
                              <span className={`badge badge-${severity}`}>
                                {riskPercent}% <span className="sr-only">risk</span>
                              </span>
                            </td>
                            <td>
                              <span className={`status-label status-label--${statusClass(incident.status)}`}>
                                {formatLabel(incident.status)}
                              </span>
                            </td>
                            <td>
                              <time dateTime={incident.created_at}>{formatDateTime(incident.created_at)}</time>
                            </td>
                            <td className="table-action">
                              <Link to={`/incidents/${incident.id}`} aria-label={`Review incident ${incident.id}`}>
                                Review <span aria-hidden="true">→</span>
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state">
                  <span className="empty-state__icon" aria-hidden="true">✓</span>
                  <div>
                    <h4>No incidents in the queue</h4>
                    <p>Monitoring is active. New honeytoken events will appear here automatically.</p>
                  </div>
                </div>
              )}
            </div>
          </section>

          <div className="dashboard-detail-grid">
            <section className="section" aria-labelledby="threat-breakdown-title">
              <div className="section-heading">
                <div>
                  <p className="section-kicker">Risk distribution</p>
                  <h3 id="threat-breakdown-title">Threat breakdown</h3>
                </div>
              </div>
              <div className="card data-panel">
                {threats.length ? (
                  <ul className="threat-list">
                    {threats.map((threat) => {
                      const averageRisk = Math.round(threat.avg_risk_score * 100);
                      return (
                        <li className="threat-row" key={threat.attack_type}>
                          <div className="threat-row__header">
                            <strong>{formatLabel(threat.attack_type)}</strong>
                            <span>{threat.count} {threat.count === 1 ? 'incident' : 'incidents'}</span>
                          </div>
                          <div className="threat-row__risk">
                            <progress value={averageRisk} max="100" aria-label={`${averageRisk}% average risk`} />
                            <span>{averageRisk}% average risk</span>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="empty-state empty-state--compact">
                    <div>
                      <h4>No threat patterns recorded</h4>
                      <p>Risk distribution will populate after the first detected incident.</p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <section className="section" aria-labelledby="recent-activity-title">
              <div className="section-heading">
                <div>
                  <p className="section-kicker">Telemetry stream</p>
                  <h3 id="recent-activity-title">Recent activity</h3>
                </div>
              </div>
              <div className="card data-panel">
                {activity.length ? (
                  <ol className="activity-list">
                    {activity.map((item) => (
                      <li className={`activity-row activity-row--${statusClass(item.type)}`} key={item.id}>
                        <span className="activity-row__indicator" aria-hidden="true" />
                        <div className="activity-row__copy">
                          <div className="activity-row__header">
                            <strong>{item.description}</strong>
                            <span className={`activity-type activity-type--${statusClass(item.type)}`}>
                              {formatLabel(item.type)}
                            </span>
                          </div>
                          <time dateTime={item.timestamp}>{formatDateTime(item.timestamp)}</time>
                        </div>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <div className="empty-state empty-state--compact">
                    <div>
                      <h4>Waiting for organization activity</h4>
                      <p>Normal traffic and alert telemetry will share this timeline.</p>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
