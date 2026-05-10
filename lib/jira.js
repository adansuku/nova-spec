'use strict';

const https = require('https');
const { URL } = require('url');

function basicAuth(email, token) {
  return Buffer.from(`${email}:${token}`).toString('base64');
}

function request({ url, method = 'GET', email, token, body = null }) {
  return new Promise((resolve, reject) => {
    let parsed;
    try {
      parsed = new URL(url);
    } catch (_) {
      return reject(new Error(`Invalid URL: ${url}`));
    }

    const options = {
      method,
      hostname: parsed.hostname,
      port: parsed.port || 443,
      path: parsed.pathname + parsed.search,
      headers: {
        Authorization: `Basic ${basicAuth(email, token)}`,
        Accept: 'application/json',
      },
    };

    if (body) {
      options.headers['Content-Type'] = 'application/json';
    }

    const req = https.request(options, (res) => {
      let data = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        const status = res.statusCode || 0;
        if (status >= 400) {
          const error = new Error(`Jira HTTP ${status}: ${data || res.statusMessage}`);
          error.status = status;
          return reject(error);
        }
        if (!data) return resolve(null);
        try {
          resolve(JSON.parse(data));
        } catch (err) {
          reject(new Error(`Invalid JSON from Jira: ${err.message}`));
        }
      });
    });

    req.on('error', (err) => reject(err));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function getIssueAsync({ url, email, token, ticket }) {
  const endpoint = `${url.replace(/\/$/, '')}/rest/api/3/issue/${encodeURIComponent(ticket)}`;
  return request({ url: endpoint, email, token });
}

async function listTransitionsAsync({ url, email, token, ticket }) {
  const endpoint = `${url.replace(/\/$/, '')}/rest/api/3/issue/${encodeURIComponent(ticket)}/transitions`;
  const response = await request({ url: endpoint, email, token });
  return (response && response.transitions) || [];
}

async function transitionAsync({ url, email, token, ticket, transitionId }) {
  const endpoint = `${url.replace(/\/$/, '')}/rest/api/3/issue/${encodeURIComponent(ticket)}/transitions`;
  return request({
    url: endpoint,
    method: 'POST',
    email,
    token,
    body: { transition: { id: String(transitionId) } },
  });
}

function runCli() {
  // CLI mode: node lib/jira.js <command> [args...]
  const [, , cmd, ...args] = process.argv;
  const { JIRA_URL, JIRA_EMAIL, JIRA_API_TOKEN } = process.env;

  if (!JIRA_URL || !JIRA_EMAIL || !JIRA_API_TOKEN) {
    console.error('Missing env vars: JIRA_URL, JIRA_EMAIL, JIRA_API_TOKEN');
    process.exit(2);
  }

  const baseArgs = { url: JIRA_URL, email: JIRA_EMAIL, token: JIRA_API_TOKEN };
  let promise;

  switch (cmd) {
    case 'get':
      if (!args[0]) {
        console.error('Usage: nova-jira get <TICKET>');
        process.exit(2);
      }
      promise = getIssueAsync({ ...baseArgs, ticket: args[0] });
      break;
    case 'transitions':
      if (!args[0]) {
        console.error('Usage: nova-jira transitions <TICKET>');
        process.exit(2);
      }
      promise = listTransitionsAsync({ ...baseArgs, ticket: args[0] });
      break;
    case 'transition':
      if (!args[0] || !args[1]) {
        console.error('Usage: nova-jira transition <TICKET> <TRANSITION_ID>');
        process.exit(2);
      }
      promise = transitionAsync({ ...baseArgs, ticket: args[0], transitionId: args[1] });
      break;
    default:
      console.error('Commands: get <TICKET> | transitions <TICKET> | transition <TICKET> <ID>');
      process.exit(2);
  }

  promise
    .then((r) => {
      if (r != null) console.log(JSON.stringify(r, null, 2));
    })
    .catch((err) => {
      console.error(err.message);
      process.exit(err.status === 401 ? 401 : err.status === 404 ? 404 : 1);
    });
}

if (require.main === module) runCli();

module.exports = {
  getIssueAsync,
  listTransitionsAsync,
  transitionAsync,
};
