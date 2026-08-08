import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';

function label(value = '') {
  return String(value || 'Unknown').replace(/[_-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function date(value) {
  if (!value) return 'Not recorded';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 'Not recorded' : parsed.toLocaleString();
}

export default function IncidentDetail() {
  const { id } = useParams();
  const [incident, setIncident] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pendingAction, setPendingAction] = useState('');
  const [actionError, setActionError] = useState('');
  const [report, setReport] = useState(null);
  const [reportState, setReportState] = useState('idle');
  const [reportError, setReportError] = useState('');

  const load = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true);
    try {
      setIncident(await api.incident(id));
      setError('');
    } catch (loadError) {
      setError(loadError.message || 'Incident data is unavailable.');
    } finally {
      if (showLoader) setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    let active = true;
    let timer;
    async function poll(first = false) {
      if (active) await load(first);
      if (active) timer = window.setTimeout(() => poll(false), 3000);
    }
    poll(true);
    return () => { active = false; window.clearTimeout(timer); };
  }, [load]);

  async function decide(recommendationId, approved) {
    setPendingAction(recommendationId);
    setActionError('');
    try {
      await api.contain(recommendationId, approved);
      await load();
    } catch (decisionError) {
      setActionError(decisionError.message || 'The containment decision could not be saved.');
    } finally {
      setPendingAction('');
    }
  }

  async function generateReport() {
    setReportState('generating');
    setReportError('');
    try {
      setReport(await api.generateReport(id));
      setReportState('ready');
    } catch (generateError) {
      setReportError(generateError.message || 'Report generation failed.');
      setReportState('error');
    }
  }

  async function downloadReport() {
    if (!report?.id) return;
    setReportState('downloading');
    setReportError('');
    try {
      const result = await api.downloadReport(report.id);
      const url = window.URL.createObjectURL(result.blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = result.filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
      setReportState('ready');
    } catch (downloadError) {
      setReportError(downloadError.message || 'Report download failed.');
      setReportState('error');
    }
  }

  if (loading && !incident) return <section className="state-page" role="status"><span className="spinner large" /><h2>Loading incident evidence</h2><p>Gathering telemetry, agent findings, and response controls.</p></section>;
  if (!incident) return <section className="state-page error" role="alert"><span>!</span><h2>Incident unavailable</h2><p>{error}</p><button className="button primary" type="button" onClick={() => load(true)}>Try again</button></section>;

  const investigations = incident.ai_investigations || [];
  const recommendations = incident.recommendations || [];
  const risk = Math.round(Number(incident.risk_score || 0) * 100);
  const completed = investigations.filter((item) => item.status === 'completed').length;
  const reportBusy = ['generating', 'downloading'].includes(reportState);

  return (
    <article className="incident-page">
      <Link className="back-link" to="/">← Back to security overview</Link>
      <header className="incident-header">
        <div><p className="eyebrow">Security incident</p><div className="incident-title"><h2>{label(incident.attack_type)}</h2><span className={`status-badge ${incident.status}`}>{label(incident.status)}</span></div><p>Incident <code>{incident.id}</code> · detected {date(incident.created_at)}</p></div>
        <span className="sync-chip"><i /> Live · every 3 seconds</span>
      </header>

      {error && <div className="notice warning" role="status"><strong>Live refresh paused</strong><span>{error} Showing the latest successful snapshot.</span></div>}

      <section className="incident-metrics" aria-label="Incident summary">
        <article className={`metric-card ${risk >= 70 ? 'critical' : ''}`}><span className="metric-icon">!</span><div><strong>{risk}%</strong><span>Risk score</span></div><small>{risk >= 70 ? 'Critical priority' : 'Elevated priority'}</small></article>
        <article className="metric-card"><span className="metric-icon">◎</span><div><strong>{Math.round(Number(incident.confidence_score || 0) * 100)}%</strong><span>AI confidence</span></div><small>Evidence correlation</small></article>
        <article className="metric-card"><span className="metric-icon">AI</span><div><strong>{completed}/{investigations.length}</strong><span>Agent tasks</span></div><small>{investigations.some((item) => item.status === 'running') ? 'Investigation active' : 'Investigation complete'}</small></article>
        <article className="metric-card"><span className="metric-icon">↳</span><div><strong>{recommendations.filter((item) => item.status === 'pending').length}</strong><span>Pending actions</span></div><small>Human approval gate</small></article>
      </section>

      <div className="incident-layout">
        <div className="incident-main">
          <section className="panel" aria-labelledby="agent-trail-title">
            <div className="panel-heading"><div><p className="eyebrow">Autonomous investigation</p><h3 id="agent-trail-title">Agent trail</h3></div><span>{completed}/{investigations.length} complete</span></div>
            {investigations.length ? <ol className="agent-timeline">{investigations.map((item, index) => <li key={item.id} className={item.status}><span className="timeline-node">{item.status === 'completed' ? '✓' : index + 1}</span><div><div className="timeline-title"><strong>{label(item.agent_name)}</strong><span className={`agent-badge ${item.status}`}>{label(item.status)}</span></div><p>{item.output_summary || item.input_summary || 'Analysis is queued.'}</p><time dateTime={item.completed_at || item.started_at}>{date(item.completed_at || item.started_at)}</time></div></li>)}</ol> : <div className="empty-state"><span>AI</span><div><strong>Agents are being assigned</strong><p>Investigation tasks will appear here automatically.</p></div></div>}
          </section>

          <section className="panel" aria-labelledby="reasoning-title">
            <div className="panel-heading"><div><p className="eyebrow">Decision support</p><h3 id="reasoning-title">AI reasoning</h3></div></div>
            {incident.ai_reasoning ? <pre className="reasoning-output">{incident.ai_reasoning}</pre> : <div className="empty-state compact"><span>…</span><div><strong>Reasoning in progress</strong><p>The correlated analysis has not been produced yet.</p></div></div>}
          </section>

          <section className="panel" aria-labelledby="containment-title">
            <div className="panel-heading"><div><p className="eyebrow">Human-in-the-loop</p><h3 id="containment-title">Containment controls</h3></div><span>{recommendations.filter((item) => item.status === 'pending').length} pending</span></div>
            {actionError && <div className="inline-error" role="alert">{actionError}</div>}
            {recommendations.length ? <ul className="recommendation-list">{recommendations.map((item) => <li key={item.id}><div className="recommendation-copy"><span>↳</span><div><strong>{label(item.action)}</strong><small className={`decision-${item.status}`}>{label(item.status)}</small></div></div>{item.status === 'pending' && <div className="decision-actions"><button className="button secondary" type="button" disabled={Boolean(pendingAction)} onClick={() => decide(item.id, false)}>Reject</button><button className="button primary" type="button" disabled={Boolean(pendingAction)} onClick={() => decide(item.id, true)}>{pendingAction === item.id ? 'Saving…' : 'Approve containment'}</button></div>}</li>)}</ul> : <div className="empty-state compact"><span>✓</span><div><strong>No actions proposed yet</strong><p>Agent recommendations will appear after investigation.</p></div></div>}
          </section>
        </div>

        <aside className="incident-side">
          <section className="panel telemetry-panel" aria-labelledby="telemetry-title">
            <div className="panel-heading"><div><p className="eyebrow">Honeytoken evidence</p><h3 id="telemetry-title">Captured request</h3></div></div>
            {incident.telemetry ? <dl><div><dt>Source IP</dt><dd><code>{incident.telemetry.source_ip || 'Unknown'}</code></dd></div><div><dt>Endpoint</dt><dd><code>{incident.telemetry.endpoint || 'Unknown'}</code></dd></div><div><dt>HTTP method</dt><dd><span className="method-badge">{incident.telemetry.http_method || '—'}</span></dd></div><div><dt>User agent</dt><dd>{incident.telemetry.user_agent || 'Not recorded'}</dd></div></dl> : <div className="empty-state compact"><span>○</span><div><strong>No request attached</strong><p>Telemetry evidence is still being linked.</p></div></div>}
          </section>

          <section className="panel report-panel" aria-labelledby="report-title">
            <div className="panel-heading"><div><p className="eyebrow">Shareable artifact</p><h3 id="report-title">Incident report</h3></div></div>
            <p>Package telemetry, agent reasoning, and containment decisions into a downloadable report.</p>
            {reportError && <div className="inline-error" role="alert">{reportError}</div>}
            {report ? <div className="report-ready"><div className="report-file"><span>PDF</span><div><strong>Report ready</strong><small>Generated {date(report.generated_at)}</small></div></div><button className="button primary block" type="button" disabled={reportBusy} onClick={downloadReport}>{reportState === 'downloading' ? 'Preparing download…' : 'Download report'}</button><button className="button quiet block" type="button" disabled={reportBusy} onClick={generateReport}>Regenerate</button></div> : <button className="button primary block" type="button" disabled={reportBusy} onClick={generateReport}>{reportState === 'generating' ? 'Generating report…' : 'Generate incident report'}</button>}
          </section>
        </aside>
      </div>
    </article>
  );
}
