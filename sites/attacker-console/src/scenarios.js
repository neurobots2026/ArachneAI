export const SCENARIOS = [
  {
    sequence: '01',
    id: 'broken_auth',
    name: 'Broken Authentication',
    category: 'Initial access',
    method: 'POST',
    target: '/api/v1/target/auth/login',
    objective: 'Exercise a small, controlled credential replay against a seeded decoy identity.',
    requestPreview: `{
  "identity": "seeded decoy account",
  "mode": "bounded wordlist"
}`,
    detection: 'A successful decoy-account login should emit a credential misuse event.',
    artifactLabel: 'Authentication response',
  },
  {
    sequence: '02',
    id: 'ssrf',
    name: 'Server-Side Request Forgery',
    shortName: 'SSRF',
    category: 'Reconnaissance',
    method: 'POST',
    target: '/api/v1/target/admin/tools/fetch-preview',
    objective: 'Ask the simulated administrative fetcher to resolve an internal metadata address.',
    requestPreview: `{
  "url": "http://internal/finance-api"
}`,
    detection: 'Access to the internal bait destination should produce an SSRF telemetry event.',
    artifactLabel: 'Internal fetch response',
  },
  {
    sequence: '03',
    id: 'xss',
    name: 'Stored Cross-Site Scripting',
    shortName: 'Stored XSS',
    category: 'Web exploitation',
    method: 'POST',
    target: '/api/v1/target/courses/{course_id}/reviews',
    objective: 'Submit an inert training payload to the simulated review storage flow.',
    requestPreview: `{
  "content": "<script>simulated_beacon()</script>"
}`,
    detection: 'The stored payload path should invoke the controlled telemetry beacon.',
    artifactLabel: 'Review submission response',
  },
  {
    sequence: '04',
    id: 'csrf',
    name: 'Cross-Site Request Forgery',
    shortName: 'CSRF',
    category: 'Web exploitation',
    method: 'POST',
    target: '/api/v1/target/portal/profile/email',
    objective: 'Simulate a profile mutation submitted without an anti-forgery token.',
    requestPreview: `{
  "email": "simulated-recipient@example.invalid",
  "csrf_token": null
}`,
    detection: 'A missing-token profile update should be classified as a request-hygiene anomaly.',
    artifactLabel: 'Profile mutation response',
  },
  {
    sequence: '05',
    id: 'idor',
    name: 'Broken Access Control / IDOR',
    shortName: 'IDOR',
    category: 'Access control',
    method: 'GET',
    target: '/api/v1/target/students/{student_id}',
    objective: 'Request a reserved decoy record outside the simulated user ownership boundary.',
    requestPreview: `GET /students/{reserved-decoy-id}`,
    detection: 'Retrieval of a reserved decoy record should create an object-enumeration event.',
    artifactLabel: 'Retrieved decoy record',
  },
  {
    sequence: '06',
    id: 'command_injection',
    name: 'Command Injection',
    category: 'Execution',
    method: 'POST',
    target: '/api/v1/target/admin/tools/ping',
    objective: 'Pass shell-like syntax into a safe lookup simulator with no host shell access.',
    requestPreview: `{
  "host": "127.0.0.1; cat [decoy-document]"
}`,
    detection: 'The fake-file resolver should record access to the decoy document.',
    artifactLabel: 'Simulated command output',
  },
  {
    sequence: '07',
    id: 'file_upload',
    name: 'Unrestricted File Upload',
    shortName: 'File Upload',
    category: 'Execution',
    method: 'POST',
    target: '/api/v1/target/portal/assignments/upload',
    objective: 'Send an inert executable-looking filename through the controlled upload handler.',
    requestPreview: `multipart/form-data
filename: training-payload.php
content: inert demonstration text`,
    detection: 'Follow-up access to a returned decoy filename should emit the detection event.',
    artifactLabel: 'Upload and directory response',
  },
  {
    sequence: '08',
    id: 'api_abuse',
    name: 'API Mass Assignment',
    shortName: 'API Abuse',
    category: 'API & identity',
    method: 'POST + GET',
    target: '/api/v1/target/auth/register → /api/data',
    objective: 'Submit unexpected role fields, then query the simulated exposed-data route.',
    requestPreview: `{
  "email": "generated-user@example.invalid",
  "role": "admin"
}`,
    detection: 'Unexpected privilege assignment and follow-up data access should be correlated.',
    artifactLabel: 'Registration / exposed API response',
  },
  {
    sequence: '09',
    id: 'session_attack',
    name: 'Session Reuse',
    category: 'API & identity',
    method: 'POST',
    target: '/api/v1/target/portal/dashboard',
    objective: 'Replay a fixed, simulated decoy session identifier after its expected lifecycle.',
    requestPreview: `Cookie: session_id=[decoy-session-token]`,
    detection: 'Any protected action using the decoy session should be marked as session misuse.',
    artifactLabel: 'Session validation response',
  },
  {
    sequence: '10',
    id: 'mitm',
    name: 'MITM Signature',
    category: 'Network & delivery',
    method: 'GET',
    target: '/api/v1/target/api/secure',
    objective: 'Send proxy-chain metadata that safely represents interception residue.',
    requestPreview: `X-Forwarded-For: private-hop, simulated-external-hop
X-Client-Cert-Fingerprint: mismatched-training-signature`,
    detection: 'An anomalous forwarded chain or fingerprint should trigger signature detection.',
    artifactLabel: 'Secure endpoint response',
  },
  {
    sequence: '11',
    id: 'dns_redirect',
    name: 'DNS / Open Redirect',
    shortName: 'Open Redirect',
    category: 'Network & delivery',
    method: 'GET',
    target: '/api/v1/target/resources/go',
    objective: 'Submit a reserved lookalike destination to the simulated redirect handler.',
    requestPreview: `?url=https://training-lookalike.example.invalid`,
    detection: 'A destination matching the local demonstration blocklist should be flagged.',
    artifactLabel: 'Redirect response',
  },
  {
    sequence: '12',
    id: 'deserialization',
    name: 'Unsafe Deserialization',
    shortName: 'Deserialization',
    category: 'Injection',
    method: 'POST',
    target: '/api/v1/target/admin/settings/import',
    objective: 'Import a structured marker that safely simulates unintended object behavior.',
    requestPreview: `{
  "__ht_marker__": "training-only",
  "mode": "simulated"
}`,
    detection: 'The unexpected marker should route through the fake configuration lookup.',
    artifactLabel: 'Settings import response',
  },
  {
    sequence: '13',
    id: 'xxe',
    name: 'XML External Entity',
    shortName: 'XXE',
    category: 'Injection',
    method: 'POST',
    target: '/api/v1/target/admin/students/import',
    objective: 'Resolve a fake-file URI through a contained transcript parser simulation.',
    requestPreview: `<!DOCTYPE transcript [
  <!ENTITY xxe SYSTEM "file:///internal/honeytoken/transcripts">
]>
<transcript>&xxe;</transcript>`,
    detection: 'Resolution of the registered fake URI should record a decoy-file access.',
    artifactLabel: 'Parsed XML / fake-file response',
  },
  {
    sequence: '14',
    id: 'cache_poisoning',
    name: 'Web Cache Poisoning',
    shortName: 'Cache Poisoning',
    category: 'Web exploitation',
    method: 'GET × 2',
    target: '/api/v1/target/api/cache',
    objective: 'Repeat a host-header variant to exercise the in-memory cache-key simulation.',
    requestPreview: `X-Forwarded-Host: training-cache.example.invalid
repeat: 2 controlled requests`,
    detection: 'A mismatched host influencing a cache write should create a poisoning event.',
    artifactLabel: 'Cached response comparison',
  },
  {
    sequence: '15',
    id: 'supply_chain',
    name: 'Supply Chain Package Pull',
    shortName: 'Supply Chain',
    category: 'Supply chain',
    method: 'GET',
    target: '/api/v1/target/fake-registry/crestwood-internal-utils',
    objective: 'Attempt to resolve a reserved internal package from the fake registry path.',
    requestPreview: `GET /fake-registry/[reserved-internal-package]
install: disabled`,
    detection: 'Any request for the reserved fake package is inherently a decoy interaction.',
    artifactLabel: 'Package registry response',
  },
];

export const SCENARIO_CATEGORIES = SCENARIOS.reduce((categories, scenario) => {
  if (!categories.includes(scenario.category)) categories.push(scenario.category);
  return categories;
}, []);

export function findScenario(id) {
  return SCENARIOS.find((scenario) => scenario.id === id) || SCENARIOS[0];
}
