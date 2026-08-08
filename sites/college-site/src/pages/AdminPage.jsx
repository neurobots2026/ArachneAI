import { useEffect, useState } from 'react';
import { api } from '../api';
import { InlineStatus, LoadingPanel } from '../components/SiteChrome';

function formatOutput(value) {
  return typeof value === 'string' ? value : JSON.stringify(value, null, 2);
}

function formatDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not available' : date.toLocaleDateString();
}

export default function AdminPage({ user }) {
  const [tab, setTab] = useState('overview');
  const [students, setStudents] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [system, setSystem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [toolState, setToolState] = useState({ state: 'idle', title: 'Tool output', output: 'Choose an administrative tool to begin.' });
  const [host, setHost] = useState('portal.crestwood.edu');
  const [previewUrl, setPreviewUrl] = useState('https://www.crestwood.edu/academics');
  const [xml, setXml] = useState('<transcript><student>CW-2026001</student><term>Spring 2026</term></transcript>');
  const [settings, setSettings] = useState('{\n  "theme": "crestwood",\n  "notifications": true\n}');
  const [uploadFile, setUploadFile] = useState(null);

  async function load() {
    setLoading(true);
    setLoadError('');
    const [studentResult, documentResult, systemResult] = await Promise.allSettled([
      api.adminStudents(),
      api.adminDocuments(),
      api.systemStatus(),
    ]);
    if (studentResult.status === 'fulfilled') setStudents(studentResult.value);
    if (documentResult.status === 'fulfilled') setDocuments(documentResult.value);
    if (systemResult.status === 'fulfilled') setSystem(systemResult.value);
    if ([studentResult, documentResult, systemResult].some((result) => result.status === 'rejected')) {
      setLoadError('Some administrative data could not be loaded. Check your staff permissions and try again.');
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function runTool(title, operation) {
    setToolState({ state: 'running', title, output: 'Working…' });
    try {
      const result = await operation();
      setToolState({ state: 'success', title, output: formatOutput(result) });
    } catch (error) {
      setToolState({ state: 'error', title, output: error.message });
    }
  }

  async function importJson() {
    try {
      const parsed = JSON.parse(settings);
      await runTool('Settings import', () => api.importSettings(parsed));
    } catch (error) {
      setToolState({ state: 'error', title: 'Settings import', output: `Invalid JSON: ${error.message}` });
    }
  }

  async function upload() {
    if (!uploadFile) return;
    const content = await uploadFile.text();
    await runTool('Legacy file bridge', () => api.legacyUpload(uploadFile.name, content));
  }

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'directory', label: 'Records' },
    { id: 'tools', label: 'Service tools' },
    { id: 'imports', label: 'Data imports' },
  ];

  return (
    <main className="admin-page" id="main-content">
      <header className="admin-hero">
        <div className="site-container admin-hero__inner">
          <div><p className="eyebrow eyebrow--light">Staff workspace</p><h1>College administration</h1><p>Student records, document services, and internal system utilities.</p></div>
          <div className="admin-identity"><span>{user.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</span><div><strong>{user.name}</strong><small>Administrator · {user.student_id}</small></div></div>
        </div>
      </header>

      <div className="site-container admin-workspace">
        <nav className="admin-tabs" aria-label="Administration sections">
          {tabs.map((item) => <button key={item.id} type="button" className={tab === item.id ? 'is-active' : ''} aria-pressed={tab === item.id} onClick={() => setTab(item.id)}>{item.label}</button>)}
        </nav>

        {loadError && <InlineStatus tone="warning" onRetry={load}>{loadError}</InlineStatus>}
        {loading ? <LoadingPanel message="Loading administrative services…" /> : (
          <>
            {tab === 'overview' && (
              <div className="admin-overview">
                <section className="admin-metrics">
                  <article><span>Student records</span><strong>{students.length}</strong><small>Active portal accounts</small></article>
                  <article><span>Managed documents</span><strong>{documents.length}</strong><small>Across all categories</small></article>
                  <article><span>Platform uptime</span><strong>{system?.uptime || '—'}</strong><small>Current service period</small></article>
                  <article><span>Core services</span><strong>{system?.services?.length || 0}</strong><small>{system?.status || 'Status unavailable'}</small></article>
                </section>
                <div className="admin-overview__grid">
                  <section className="admin-card service-card"><header><div><p className="eyebrow">Systems</p><h2>Service status</h2></div><span className="service-pill"><i />{system?.status || 'Unknown'}</span></header><div className="service-list">{system?.services?.map((service) => <div key={service}><span>{service}</span><strong>Operational</strong></div>) || <p>No service data available.</p>}</div></section>
                  <section className="admin-card"><header><div><p className="eyebrow">Recent records</p><h2>Student directory</h2></div><button className="text-action" type="button" onClick={() => setTab('directory')}>View all</button></header><div className="mini-roster">{students.slice(0, 5).map((student) => <article key={student.id}><span>{student.name.split(' ').map((part) => part[0]).slice(0, 2).join('')}</span><div><strong>{student.name}</strong><small>{student.major}</small></div><code>{student.student_id}</code></article>)}</div></section>
                </div>
              </div>
            )}

            {tab === 'directory' && (
              <div className="admin-records">
                <section className="admin-card"><header><div><p className="eyebrow">Registrar</p><h2 id="student-roster-heading">Student roster</h2></div><span>{students.length} records</span></header><span className="sr-only" id="student-roster-scroll-help">Scroll horizontally to view every student record column.</span><div className="table-scroll" tabIndex={0} role="region" aria-labelledby="student-roster-heading" aria-describedby="student-roster-scroll-help"><table><caption className="sr-only">Current Crestwood portal student records</caption><thead><tr><th scope="col">Student</th><th scope="col">College ID</th><th scope="col">Program</th><th scope="col">GPA</th><th scope="col">Role</th></tr></thead><tbody>{students.map((student) => <tr key={student.id}><td><strong>{student.name}</strong><small>{student.email}</small></td><td><code>{student.student_id}</code></td><td>{student.major}</td><td>{Number(student.gpa).toFixed(2)}</td><td><span className="record-tag">{student.role}</span></td></tr>)}</tbody></table></div></section>
                <section className="admin-card"><header><div><p className="eyebrow">Document services</p><h2>Managed documents</h2></div><span>{documents.length} files</span></header><div className="admin-document-list">{documents.map((document) => <article key={document.id}><span aria-hidden="true">DOC</span><div><strong>{document.title}</strong><small>{document.category} · Added {formatDate(document.created_at)}</small></div><code>{document.file_path}</code></article>)}</div></section>
              </div>
            )}

            {tab === 'tools' && (
              <div className="admin-tools-layout">
                <div className="admin-tool-list">
                  <section className="admin-card tool-card"><p className="eyebrow">Network diagnostic</p><h2>Host availability</h2><p>Check whether an approved campus host is responding.</p><label>Host name<input value={host} onChange={(event) => setHost(event.target.value)} /></label><button className="button button--small" type="button" onClick={() => runTool('Host availability', () => api.ping(host))} disabled={toolState.state === 'running'}>Run diagnostic</button></section>
                  <section className="admin-card tool-card"><p className="eyebrow">Content preview</p><h2>External page preview</h2><p>Request a policy-controlled metadata preview for a public URL.</p><label>Page URL<input type="url" value={previewUrl} onChange={(event) => setPreviewUrl(event.target.value)} /></label><button className="button button--small" type="button" onClick={() => runTool('External page preview', () => api.fetchPreview(previewUrl))} disabled={toolState.state === 'running'}>Fetch preview</button></section>
                  <section className="admin-card tool-card"><p className="eyebrow">Configuration</p><h2>Sanitized export</h2><p>Generate an approved, redacted snapshot for service support.</p><button className="button button--small" type="button" onClick={() => runTool('Sanitized configuration export', api.exportConfig)} disabled={toolState.state === 'running'}>Export configuration</button></section>
                </div>
                <ToolOutput state={toolState} />
              </div>
            )}

            {tab === 'imports' && (
              <div className="admin-tools-layout">
                <div className="admin-tool-list">
                  <section className="admin-card tool-card"><p className="eyebrow">Registrar exchange</p><h2>Transcript XML import</h2><p>Validate a transcript record from an approved partner system.</p><label>XML document<textarea value={xml} onChange={(event) => setXml(event.target.value)} /></label><button className="button button--small" type="button" onClick={() => runTool('Transcript XML import', () => api.importTranscript(xml))} disabled={toolState.state === 'running'}>Validate XML</button></section>
                  <section className="admin-card tool-card"><p className="eyebrow">Legacy service</p><h2>Settings import</h2><p>Import a JSON preferences bundle for compatible campus tools.</p><label>JSON settings<textarea value={settings} onChange={(event) => setSettings(event.target.value)} /></label><button className="button button--small" type="button" onClick={importJson} disabled={toolState.state === 'running'}>Import settings</button></section>
                  <section className="admin-card tool-card"><p className="eyebrow">Legacy file bridge</p><h2>Archive transfer</h2><p>Send a small text-based record to the legacy archive intake service.</p><label className="admin-file-input">Choose file<input type="file" accept=".txt,.csv,.xml,.json" onChange={(event) => setUploadFile(event.target.files?.[0] || null)} /><span>{uploadFile?.name || 'No file selected'}</span></label><button className="button button--small" type="button" onClick={upload} disabled={!uploadFile || toolState.state === 'running'}>Send to archive</button></section>
                </div>
                <ToolOutput state={toolState} />
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function ToolOutput({ state }) {
  return (
    <aside className={`tool-output tool-output--${state.state}`} aria-live="polite">
      <header><span aria-hidden="true">›_</span><div><p>Administrative console</p><h2>{state.title}</h2></div></header>
      <pre>{state.output}</pre>
      <small>Responses shown here are limited to this demonstration environment.</small>
    </aside>
  );
}
