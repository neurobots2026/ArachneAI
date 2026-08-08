import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';

function formatLabel(value) {
  return String(value || 'Unknown').replace(/_/g, ' ');
}

function formatPercent(value) {
  const number = Number(value);
  return Number.isFinite(number) ? `${Math.round(number * 100)}%` : '—';
}

function formatDate(value) {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not recorded' : date.toLocaleString();
}

export default function IncidentDetail() {
  const { id } = useParams();
  const [incident, setIncident] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionPending, setActionPending] = useState('');
  const [actionError, setActionError] = useState('');
  const [report, setReport] = useState(null);
  const [reportStatus, setReportStatus] = useState('idle');
  const [reportError, setReportError] = useState('');

  const refreshIncident = useCallback(async ({ showLoading = false } = {}) => {
    if (showLoading) setLoading(true);
    try {
      const data = await api.incident(id);
      setIncident(data);
      setError('');
      return data;
    } catch (loadError) {
      setError(loadError.message || 'Incident data could not be loaded.');
      return null;
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    let active = true;
    let timer;

    setIncident(null);
    setError('');
    setReport(null);
    setReportStatus('idle');

    async function poll(firstLoad = false) {
      await refreshIncident({ showLoading: firstLoad });
      if (active) timer = window.setTimeout(() => poll(false), 3000);
    }

    poll(true);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [refreshIncident]);

  async function updateRecommendation(recId, approved) {
    setActionPending(recId);
    setActionError('');

    try {
      await api.contain(recId, approved);
      await refreshIncident();
    } catch (updateError) {
      setActionError(updateError.message || 'The containment decision could not be saved.');
    } finally {
      setActionPending('');
    }
  }

  async function generateReport() {
    setReportStatus('generating');
    setReportError('');

    try {
      const generatedReport = await api.generateReport(id);
      setReport(generatedReport);
      setReportStatus('ready');
    } catch (generateError) {
      setReportStatus('error');
      setReportError(generateError.message || 'The report could not be generated.');
    }
  }

  async function downloadReport() {
    if (!report?.id) return;

    setReportStatus('downloading');
    setReportError('');

    try {
      const { blob, filename } = await api.downloadReport(report.id);
      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = filename || `incident-${id}-report.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 1000);
      setReportStatus('ready');
    } catch (downloadError) {
      setReportStatus('error');
      setReportError(downloadError.message || 'The report could not be downloaded.');
    }
  }

  if (loading && !incident) {
    return (
      <section className="page-shell incident-page" aria-labelledby="incident-loading-title">
        <Link className="back-link" to="/">← Back to incidents</Link>
        <div className="card state-panel" role="status" aria-live="polite">
          <span className="loading-indicator loading-indicator-large" aria-hidden="true" />
          <h2 id="incident-loading-title">Loading incident</h2>
          <p>Gathering telemetry, investigation notes, and containment guidance.</p>
        </div>
      </section>
    );
  }

  if (!incident) {
    return (
      <section className="page-shell incident-page" aria-labelledby="incident-error-title">
        <Link className="back-link" to="/">← Back to incidents</Link>
        <div className="card state-panel state-panel-error" role="alert">
          <span className="state-panel-icon" aria-hidden="true">!</span>
          <h2 id="incident-error-title">Incident unavailable</h2>
          <p>{error || 'This incident could not be found.'}</p>
          <button className="btn btn-secondary" type="button" onClick={() => refreshIncident({ showLoading: true })}>
            Try again
          </button>
        </div>
      </section>
    );
  }

  const riskScore = Number(incident.risk_score);
  const riskLevel = riskScore >= 0.7 ? 'critical' : riskScore >= 0.4 ? 'elevated' : 'low';
  const investigations = incident.ai_investigations || [];
  const recommendations = incident.recommendations || [];
  const pendingRecommendations = recommendations.filter((item) => item.status === 'pending').length;
  const reportBusy = reportStatus === 'generating' || reportStatus === 'downloading';
  const reportFormat = report?.file_path?.toLowerCase().endsWith('.pdf') ? 'PDF' : 'HTML';

  return (
    <article className="page-shell incident-page" aria-labelledby="incident-title">
      <header className="page-header incident-header">
        <div className="page-header-copy">
          <Link className="back-link" to="/">← Back to incidents</Link>
          <p className="eyebrow">Security incident</p>
          <div className="incident-title-row">
            <h2 id="incident-title">{formatLabel(incident.attack_type)}</h2>
            <span className={`badge badge-${incident.status === 'contained' ? 'contained' : 'open'}`}>
              {formatLabel(incident.status)}
            </span>
          </div>
          <p className="incident-identifier">Incident ID <code>{incident.id}</code></p>
        </div>
        <div className="sync-status" role="status" aria-label="Incident auto-refreshes every three seconds">
          <span className="status-dot" aria-hidden="true" />
          Live · refreshes every 3s
        </div>
      </header>

      {error && (
        <div className="state-banner state-banner-warning" role="alert">
          <span className="state-banner-icon" aria-hidden="true">!</span>
          <div>
            <strong>Showing the most recent incident data</strong>
            <p>{error} Automatic refresh will keep trying.</p>
          </div>
        </div>
      )}

      <section className="metric-grid incident-metrics" aria-label="Incident summary">
        <div className="card metric-card">
          <span className="metric-label">Risk score</span>
          <strong className={`metric-value risk-${riskLevel}`}>{formatPercent(incident.risk_score)}</strong>
          <span className={`metric-caption risk-${riskLevel}`}>{riskLevel} priority</span>
        </div>
        <div className="card metric-card">
          <span className="metric-label">AI confidence</span>
          <strong className="metric-value">{formatPercent(incident.confidence_score)}</strong>
          <span className="metric-caption">Detection confidence</span>
        </div>
        <div className="card metric-card">
          <span className="metric-label">Agent progress</span>
          <strong className="metric-value">{investigations.filter((item) => item.status === 'completed').length}/{investigations.length}</strong>
          <span className="metric-caption">Investigations complete</span>
        </div>
        <div className="card metric-card">
          <span className="metric-label">Action queue</span>
          <strong className="metric-value">{pendingRecommendations}</strong>
          <span className="metric-caption">Awaiting approval</span>
        </div>
      </section>

      <div className="incident-content-grid">
        <div className="incident-primary-column">
          <section className="card incident-section" aria-labelledby="investigation-title">
            <div className="panel-heading">
              <div>
                <p className="panel-kicker">Multi-agent analysis</p>
                <h3 id="investigation-title">Investigation Timeline</h3>
              </div>
              <span className="count-chip">{investigations.length}</span>
            </div>

            {investigations.length ? (
              <ol className="timeline agent-timeline">
                {investigations.map((investigation) => (
                  <li key={investigation.id} className={`timeline-item timeline-${investigation.status}`}>
                    <div className="timeline-heading">
                      <strong>{formatLabel(investigation.agent_name)}</strong>
                      <span className={`agent-chip ${investigation.status}`}>{formatLabel(investigation.status)}</span>
                    </div>
                    <p>{investigation.output_summary || investigation.input_summary || 'Analysis is still in progress.'}</p>
                    <time dateTime={investigation.completed_at || investigation.started_at}>
                      {formatDate(investigation.completed_at || investigation.started_at)}
                    </time>
                  </li>
                ))}
              </ol>
            ) : (
              <div className="empty-state compact-empty-state">
                <strong>No agent updates yet</strong>
                <p>Investigation activity will appear here as defensive agents report back.</p>
              </div>
            )}
          </section>

          <section className="card incident-section" aria-labelledby="reasoning-title">
            <div className="panel-heading">
              <div>
                <p className="panel-kicker">Decision support</p>
                <h3 id="reasoning-title">AI Reasoning</h3>
              </div>
            </div>
            {incident.ai_reasoning ? (
              <pre className="reasoning-output">{incident.ai_reasoning}</pre>
            ) : (
              <div className="empty-state compact-empty-state">
                <strong>Reasoning pending</strong>
                <p>The analysis summary has not been produced yet.</p>
              </div>
            )}
          </section>

          <section className="card incident-section" aria-labelledby="recommendations-title">
            <div className="panel-heading">
              <div>
                <p className="panel-kicker">Human-in-the-loop controls</p>
                <h3 id="recommendations-title">Containment Recommendations</h3>
              </div>
              {pendingRecommendations > 0 && <span className="count-chip count-chip-warning">{pendingRecommendations} pending</span>}
            </div>

            {actionError && <p className="inline-error" role="alert">{actionError}</p>}

            {recommendations.length ? (
              <ul className="recommendation-list">
                {recommendations.map((recommendation) => {
                  const isPending = recommendation.status === 'pending';
                  const isUpdating = actionPending === recommendation.id;
                  return (
                    <li key={recommendation.id} className="recommendation-item">
                      <div className="recommendation-copy">
                        <span className="recommendation-icon" aria-hidden="true">↳</span>
                        <div>
                          <strong>{formatLabel(recommendation.action)}</strong>
                          <span className={`recommendation-status status-${recommendation.status}`}>
                            {formatLabel(recommendation.status)}
                          </span>
                        </div>
                      </div>
                      {isPending && (
                        <div className="recommendation-actions">
                          <button
                            className="btn btn-secondary"
                            type="button"
                            onClick={() => updateRecommendation(recommendation.id, false)}
                            disabled={Boolean(actionPending)}
                            aria-label={`Reject ${formatLabel(recommendation.action)}`}
                          >
                            Reject
                          </button>
                          <button
                            className="btn btn-primary"
                            type="button"
                            onClick={() => updateRecommendation(recommendation.id, true)}
                            disabled={Boolean(actionPending)}
                            aria-label={`Approve ${formatLabel(recommendation.action)}`}
                          >
                            {isUpdating ? 'Saving…' : 'Approve'}
                          </button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="empty-state compact-empty-state">
                <strong>No containment actions proposed</strong>
                <p>Recommendations will appear after the investigation reaches a decision.</p>
              </div>
            )}
          </section>
        </div>

        <aside className="incident-side-column">
          <section className="card incident-section telemetry-card" aria-labelledby="telemetry-title">
            <div className="panel-heading">
              <div>
                <p className="panel-kicker">Observed request</p>
                <h3 id="telemetry-title">Telemetry</h3>
              </div>
            </div>

            {incident.telemetry ? (
              <dl className="telemetry-list">
                <div>
                  <dt>Source IP</dt>
                  <dd><code>{incident.telemetry.source_ip || 'Unknown'}</code></dd>
                </div>
                <div>
                  <dt>Endpoint</dt>
                  <dd><code>{incident.telemetry.endpoint || 'Unknown'}</code></dd>
                </div>
                <div>
                  <dt>HTTP method</dt>
                  <dd><span className="method-chip">{incident.telemetry.http_method || '—'}</span></dd>
                </div>
                <div>
                  <dt>User agent</dt>
                  <dd className="telemetry-wrap">{incident.telemetry.user_agent || 'Not recorded'}</dd>
                </div>
                <div>
                  <dt>Detected</dt>
                  <dd>{formatDate(incident.created_at)}</dd>
                </div>
              </dl>
            ) : (
              <div className="empty-state compact-empty-state">
                <strong>No telemetry attached</strong>
                <p>The triggering request has not been linked to this incident.</p>
              </div>
            )}
          </section>

          <section className="card incident-section report-card" aria-labelledby="report-title">
            <div className="panel-heading">
              <div>
                <p className="panel-kicker">Incident artifact</p>
                <h3 id="report-title">Incident Report</h3>
              </div>
            </div>
            <p className="report-description">
              Package the evidence, AI reasoning, and containment decisions into a shareable report.
            </p>

            {reportError && <p className="inline-error" role="alert">{reportError}</p>}

            {report ? (
              <div className="report-ready" aria-live="polite">
                <div className="report-file">
                  <span className="report-file-icon" aria-hidden="true">{reportFormat}</span>
                  <div>
                    <strong>{reportFormat} incident report ready</strong>
                    <span>Generated {formatDate(report.generated_at)}</span>
                  </div>
                </div>
                <button className="btn btn-primary btn-block" type="button" onClick={downloadReport} disabled={reportBusy}>
                  {reportStatus === 'downloading' ? 'Preparing download…' : 'Download report'}
                </button>
                <button className="btn btn-quiet btn-block" type="button" onClick={generateReport} disabled={reportBusy}>
                  Regenerate
                </button>
              </div>
            ) : (
              <button className="btn btn-primary btn-block" type="button" onClick={generateReport} disabled={reportBusy}>
                {reportStatus === 'generating' ? 'Generating report…' : 'Generate incident report'}
              </button>
            )}
          </section>
        </aside>
      </div>
    </article>
  );
}
