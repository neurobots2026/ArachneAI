import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';

const POLL_MS = 4000;
const STAGES = [
  { id: 'normal', label: 'Normal', copy: 'Baseline activity' },
  { id: 'alert', label: 'Alert', copy: 'Decoy touched' },
  { id: 'investigating', label: 'Investigating', copy: 'Agents analyzing' },
  { id: 'critical', label: 'Critical', copy: 'Approval required' },
  { id: 'contained', label: 'Contained', copy: 'Threat isolated' },
];

const POSTURE = {
  normal: { title: 'Environment operating normally', copy: 'Live traffic is within the expected baseline. Deception assets are listening quietly.', action: 'No analyst action required' },
  alert: { title: 'Honeytoken interaction detected', copy: 'A deception asset has responded. Telemetry is being preserved while the incident pipeline starts.', action: 'Response initiated automatically' },
  investigating: { title: 'Autonomous investigation in progress', copy: 'Defense agents are correlating the request, attacker behavior, and affected decoy.', action: 'Agent findings updating live' },
  critical: { title: 'Critical decision awaiting analyst', copy: 'A high-confidence threat requires human approval before containment is applied.', action: 'Review the incident now' },
  contained: { title: 'Threat contained successfully', copy: 'The response was authorized, evidence is preserved, and an incident report can be generated.', action: 'Review evidence and report' },
};

function formatLabel(value = '') {
  return value.replace(/[_-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatTime(value) {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not recorded' : date.toLocaleString();
}

function deriveState(status, incidents, activity) {
  const openIncidents = incidents.filter((item) => !['contained', 'closed', 'resolved'].includes(item.status));
  const newestIncident = [...openIncidents].sort((left, right) => new Date(right.created_at) - new Date(left.created_at))[0];
  const incidentAge = newestIncident ? Date.now() - new Date(newestIncident.created_at).getTime() : Number.POSITIVE_INFINITY;
  if (Number.isFinite(incidentAge) && incidentAge < 6000 && activity.some((item) => item.type === 'alert')) return 'alert';
  if (Number.isFinite(incidentAge) && incidentAge < 12000) return 'investigating';
  if (openIncidents.some((item) => Number(item.risk_score) >= 0.7)) return 'critical';
  if (status?.state === 'investigating' || openIncidents.length) return 'investigating';
  if (status?.state === 'contained' && incidents.length) return 'contained';
  if (activity.some((item) => item.type === 'alert')) return 'alert';
  return 'normal';
}

export default function Dashboard() {
  const [data, setData] = useState({ status: null, incidents: [], threats: [], tokens: [], activity: [] });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [resetting, setResetting] = useState(false);
  const [resetError, setResetError] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  const load = useCallback(async (background = false) => {
    if (background) setRefreshing(true);
    else setLoading(true);
    const results = await Promise.allSettled([
      api.status(), api.incidents(), api.threats(), api.honeytokens(), api.activity(),
    ]);
    const failed = results.filter((result) => result.status === 'rejected');
    if (failed.length === results.length) {
      setError(failed[0]?.reason?.message || 'The monitoring API is unavailable.');
    } else {
      setData((current) => ({
        status: results[0].status === 'fulfilled' ? results[0].value : current.status,
        incidents: results[1].status === 'fulfilled' ? results[1].value : current.incidents,
        threats: results[2].status === 'fulfilled' ? results[2].value : current.threats,
        tokens: results[3].status === 'fulfilled' ? results[3].value : current.tokens,
        activity: results[4].status === 'fulfilled' ? results[4].value : current.activity,
      }));
      setError(failed.length ? 'Some live data is temporarily unavailable; the latest successful values remain visible.' : '');
      setLastUpdated(new Date());
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    load();
    const timer = window.setInterval(() => load(true), POLL_MS);
    return () => window.clearInterval(timer);
  }, [load]);

  async function resetDemo() {
    const confirmed = window.confirm(
      'Reset simulation evidence and return the defender console to its normal baseline? Organization records are preserved.',
    );
    if (!confirmed) return;
    setResetting(true);
    setResetError('');
    try {
      await api.resetDemo();
      await load();
    } catch (resetFailure) {
      setResetError(resetFailure.message || 'The demo could not be reset.');
    } finally {
      setResetting(false);
    }
  }

  const state = deriveState(data.status, data.incidents, data.activity);
  const posture = POSTURE[state];
  const activeStage = STAGES.findIndex((stage) => stage.id === state);
  const summary = data.status?.summary || {};
  const normalActivity = data.activity.filter((item) => item.type === 'normal').slice(0, 5);
  const defenseActivity = data.activity.filter((item) => item.type !== 'normal').slice(0, 6);
  const latestAlert = data.activity.find((item) => item.type === 'alert');
  const deceptionResponse = data.status?.deception_response || {
    honeytoken_state: 'armed',
    honeypot_state: 'standby',
    response_stage: 'monitoring',
    last_incident_id: null,
    message: 'Deception assets are armed and monitoring normal organization activity.',
  };

  const agents = useMemo(() => {
    const investigations = data.incidents.flatMap((incident) => incident.ai_investigations || []);
    const counts = investigations.reduce((result, item) => {
      const key = item.status || 'pending';
      result[key] = (result[key] || 0) + 1;
      return result;
    }, {});
    return { total: investigations.length, counts, recent: investigations.slice(0, 4) };
  }, [data.incidents]);

  if (loading && !data.status) {
    return <section className="state-page" role="status"><span className="spinner large" /><h2>Connecting to the defense mesh</h2><p>Loading baseline traffic, honeytokens, and incident state.</p></section>;
  }

  if (!data.status && error) {
    return <section className="state-page error" role="alert"><span>!</span><h2>Monitoring is unavailable</h2><p>{error}</p><button className="button primary" type="button" onClick={() => load()}>Retry connection</button></section>;
  }

  return (
    <div className="dashboard-page" aria-busy={refreshing}>
      <header className="page-header">
        <div><p className="eyebrow">Crestwood College · Security operations</p><h2>Defensive command center</h2><p>Follow the full deception response from ordinary traffic through containment.</p></div>
        <div className="header-actions"><span className="updated-time"><i /> {refreshing ? 'Syncing telemetry…' : `Updated ${lastUpdated?.toLocaleTimeString() || 'just now'}`}</span><button className="button secondary" type="button" onClick={resetDemo} disabled={resetting || refreshing}>{resetting ? 'Resetting…' : 'Reset demo'}</button><button className="button secondary" type="button" onClick={() => load(true)} disabled={refreshing || resetting}>Refresh</button></div>
      </header>

      {error && <div className="notice warning" role="status"><strong>Partial data</strong><span>{error}</span></div>}
      {resetError && <div className="notice warning" role="alert"><strong>Reset failed</strong><span>{resetError}</span></div>}

      <section className={`posture-card posture-${state}`} aria-labelledby="posture-title">
        <div className="posture-signal"><span><i /></span><b>{state}</b></div>
        <div className="posture-copy"><p>Current posture</p><h3 id="posture-title">{posture.title}</h3><span>{posture.copy}</span></div>
        <div className="posture-action"><strong>{data.status?.open_incidents || 0}</strong><span>open incidents</span><small>{posture.action}</small></div>
      </section>

      <section className="response-flow" aria-labelledby="response-flow-title">
        <div className="section-heading"><div><p className="eyebrow">Live response lifecycle</p><h3 id="response-flow-title">From baseline to containment</h3></div><span>Current stage: <strong>{formatLabel(state)}</strong></span></div>
        <ol>
          {STAGES.map((stage, index) => (
            <li key={stage.id} className={`${index === activeStage ? 'active' : ''} ${index < activeStage ? 'complete' : ''}`}>
              <span className="stage-marker">{index < activeStage ? '✓' : index + 1}</span>
              <div><strong>{stage.label}</strong><small>{stage.copy}</small></div>
            </li>
          ))}
        </ol>
      </section>

      <section className="metric-grid" aria-label="Security metrics">
        <article className="metric-card"><span className="metric-icon">◎</span><div><strong>{summary.honeytokens_deployed ?? data.tokens.length}</strong><span>Honeytokens active</span></div><small>Deception coverage online</small></article>
        <article className="metric-card"><span className="metric-icon">⌁</span><div><strong>{summary.telemetry_events_24h || 0}</strong><span>Decoy events · 24h</span></div><small>{latestAlert ? 'Latest interaction captured' : 'No unexpected touches'}</small></article>
        <article className={`metric-card ${summary.critical_incidents ? 'critical' : ''}`}><span className="metric-icon">!</span><div><strong>{summary.critical_incidents || 0}</strong><span>Critical incidents</span></div><small>{summary.critical_incidents ? 'Analyst review required' : 'No critical queue'}</small></article>
        <article className="metric-card"><span className="metric-icon">✓</span><div><strong>{agents.counts.completed || 0}/{agents.total}</strong><span>Agent tasks complete</span></div><small>{agents.counts.running ? `${agents.counts.running} running now` : 'Investigation mesh ready'}</small></article>
      </section>

      <div className="dashboard-grid">
        <section className="panel activity-panel" aria-labelledby="normal-activity-title">
          <div className="panel-heading"><div><p className="eyebrow">Baseline first</p><h3 id="normal-activity-title">Normal site activity</h3></div><span className="count">{normalActivity.length}</span></div>
          <p className="panel-intro">Ordinary Crestwood traffic establishes the baseline before any defensive escalation.</p>
          {normalActivity.length ? <ol className="feed-list">{normalActivity.map((item) => <li key={item.id} className="feed-normal"><span className="feed-icon">✓</span><div><strong>{item.description}</strong><time dateTime={item.timestamp}>{formatTime(item.timestamp)}</time></div></li>)}</ol> : <div className="empty-state"><span>⌁</span><div><strong>Waiting for baseline traffic</strong><p>Open the Crestwood target app to generate ordinary activity.</p></div></div>}
        </section>

        <section className="panel defense-panel" aria-labelledby="defense-activity-title">
          <div className="panel-heading"><div><p className="eyebrow">Escalation stream</p><h3 id="defense-activity-title">Defensive activity</h3></div><span className="count">{defenseActivity.length}</span></div>
          <p className="panel-intro">Honeytoken touches and incident events appear here as the response advances.</p>
          {defenseActivity.length ? <ol className="feed-list">{defenseActivity.map((item) => <li key={item.id} className={`feed-${item.type}`}><span className="feed-icon">{item.type === 'alert' ? '!' : '◆'}</span><div><strong>{item.description}</strong><time dateTime={item.timestamp}>{formatTime(item.timestamp)}</time></div></li>)}</ol> : <div className="empty-state"><span>✓</span><div><strong>No defensive events</strong><p>Deception sensors are armed and monitoring quietly.</p></div></div>}
        </section>
      </div>

      <div className="dashboard-grid lower-grid">
        <section className="panel deception-panel" aria-labelledby="deception-title">
          <div className="panel-heading"><div><p className="eyebrow">Honeypot response</p><h3 id="deception-title">Deception assets</h3></div><span className="health-chip"><i /> armed</span></div>
          <div className="deception-summary"><strong>{data.tokens.length}</strong><span>active honeytokens across {new Set(data.tokens.map((token) => token.department).filter(Boolean)).size || 1} areas</span></div>
          <div className={`response-status response-${deceptionResponse.response_stage}`}>
            <div className="response-assets">
              <div><span>Honeytoken</span><strong>{formatLabel(deceptionResponse.honeytoken_state)}</strong></div>
              <span className="response-link" aria-hidden="true">→</span>
              <div><span>Adaptive honeypot</span><strong>{formatLabel(deceptionResponse.honeypot_state)}</strong></div>
            </div>
            <p>{deceptionResponse.message}</p>
            <div className="response-stage"><span>Response stage</span><b>{formatLabel(deceptionResponse.response_stage)}</b>{deceptionResponse.last_incident_id && <Link to={`/incidents/${deceptionResponse.last_incident_id}`}>Open linked incident →</Link>}</div>
          </div>
          {latestAlert && <div className="last-trigger"><span>Latest trigger</span><strong>{latestAlert.description}</strong><time dateTime={latestAlert.timestamp}>{formatTime(latestAlert.timestamp)}</time></div>}
          <ul className="token-preview">{data.tokens.slice(0, 4).map((token) => <li key={token.id}><span className="token-dot" /><div><strong>{token.name}</strong><small>{formatLabel(token.type)} · {token.department || 'General'}</small></div><code>{token.placement_path || 'active'}</code></li>)}</ul>
          {!data.tokens.length && <div className="empty-state compact"><span>○</span><div><strong>No deception inventory returned</strong><p>The backend has not provided honeytoken records.</p></div></div>}
        </section>

        <section className="panel agent-panel" aria-labelledby="agent-title">
          <div className="panel-heading"><div><p className="eyebrow">Autonomous triage</p><h3 id="agent-title">Defense agents</h3></div><span className="health-chip"><i /> ready</span></div>
          <div className="agent-summary"><div><strong>{agents.counts.running || 0}</strong><span>Running</span></div><div><strong>{agents.counts.completed || 0}</strong><span>Complete</span></div><div><strong>{agents.counts.failed || 0}</strong><span>Failed</span></div></div>
          {agents.recent.length ? <ul className="agent-list">{agents.recent.map((agent) => <li key={agent.id}><span className={`agent-state ${agent.status}`} /><div><strong>{formatLabel(agent.agent_name)}</strong><small>{agent.output_summary || agent.input_summary || 'Analysis queued'}</small></div><b>{formatLabel(agent.status)}</b></li>)}</ul> : <div className="empty-state compact"><span>AI</span><div><strong>Agents standing by</strong><p>Agent tasks begin automatically after an incident is opened.</p></div></div>}
        </section>
      </div>

      <section className="panel incidents-panel" aria-labelledby="incidents-title">
        <div className="panel-heading"><div><p className="eyebrow">Triage and response</p><h3 id="incidents-title">Incident queue</h3></div><span>{data.incidents.length} recorded</span></div>
        {data.incidents.length ? <div className="table-scroll" tabIndex="0" role="region" aria-label="Security incidents"><table><thead><tr><th>Incident</th><th>Attack</th><th>Risk</th><th>Agent state</th><th>Status</th><th><span className="sr-only">Action</span></th></tr></thead><tbody>{data.incidents.map((incident) => { const investigations = incident.ai_investigations || []; const running = investigations.find((item) => item.status === 'running'); return <tr key={incident.id}><td><code>{incident.id}</code><small>{formatTime(incident.created_at)}</small></td><td><strong>{formatLabel(incident.attack_type)}</strong></td><td><span className={`risk-badge ${incident.risk_score >= 0.7 ? 'critical' : 'elevated'}`}>{Math.round(incident.risk_score * 100)}%</span></td><td><span className="agent-inline"><i className={running ? 'running' : 'complete'} />{running ? formatLabel(running.agent_name) : `${investigations.filter((item) => item.status === 'completed').length}/${investigations.length} complete`}</span></td><td><span className={`status-badge ${incident.status}`}>{formatLabel(incident.status)}</span></td><td><Link to={`/incidents/${incident.id}`}>Investigate →</Link></td></tr>; })}</tbody></table></div> : <div className="empty-state wide"><span>✓</span><div><strong>No incidents in the response queue</strong><p>Normal activity is still being monitored; any honeytoken trigger will open a defensive workflow.</p></div></div>}
      </section>
    </div>
  );
}
