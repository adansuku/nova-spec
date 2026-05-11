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

module.exports = {
  getIssueAsync,
  listTransitionsAsync,
  transitionAsync,
};
