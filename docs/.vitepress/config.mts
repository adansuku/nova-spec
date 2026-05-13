import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'nova-spec',
  description: 'Spec-Driven Development for Claude Code and OpenCode — from a ticket to a merged PR in explicit steps, with architectural memory that doesn\'t decay.',

  // GitHub Pages serves at https://<user>.github.io/nova-spec/
  base: '/nova-spec/',

  // Source content lives at the repo root in /docs/
  srcDir: '.',

  cleanUrls: true,
  lastUpdated: true,

  head: [
    ['link', { rel: 'icon', href: '/nova-spec/favicon.svg' }],
    ['meta', { name: 'theme-color', content: '#5C5CFF' }],
  ],

  themeConfig: {
    logo: undefined,

    nav: [
      { text: 'Getting started', link: '/getting-started' },
      { text: 'Flow', link: '/flow/overview' },
      { text: 'Customization', link: '/customization/overview' },
      { text: 'Reference', link: '/reference/config-yml' },
      { text: 'npm', link: 'https://www.npmjs.com/package/nova-spec' },
    ],

    sidebar: [
      { text: 'Welcome', link: '/' },
      { text: 'Getting started', link: '/getting-started' },

      {
        text: 'Flow',
        collapsed: false,
        items: [
          { text: 'Overview', link: '/flow/overview' },
          { text: '/nova-start', link: '/flow/nova-start' },
          { text: '/nova-spec', link: '/flow/nova-spec' },
          { text: '/nova-plan', link: '/flow/nova-plan' },
          { text: '/nova-build', link: '/flow/nova-build' },
          { text: '/nova-review', link: '/flow/nova-review' },
          { text: '/nova-wrap', link: '/flow/nova-wrap' },
          { text: '/nova-rework', link: '/flow/nova-rework' },
          { text: '/nova-status', link: '/flow/nova-status' },
          { text: '/nova-sync', link: '/flow/nova-sync' },
          { text: '/nova-diff', link: '/flow/nova-diff' },
          { text: '/nova-seed', link: '/flow/nova-seed' },
        ],
      },

      {
        text: 'Customization',
        collapsed: false,
        items: [
          { text: 'Overview', link: '/customization/overview' },
          { text: 'PR / MR template', link: '/customization/pr-template' },
          { text: 'Review checklist', link: '/customization/review-checklist' },
          { text: 'Commit format', link: '/customization/commit-format' },
          { text: 'Ticket system', link: '/customization/ticket-system' },
          { text: 'Stack & conventions', link: '/customization/stack-conventions' },
        ],
      },

      {
        text: 'Integrations',
        collapsed: true,
        items: [
          { text: 'Jira', link: '/integrations/jira' },
          { text: 'GitLab (rich skill)', link: '/integrations/gitlab' },
          { text: 'Forge (GitHub & GitLab — generic)', link: '/integrations/forge' },
        ],
      },

      {
        text: 'Reference',
        collapsed: true,
        items: [
          { text: 'config.yml', link: '/reference/config-yml' },
          { text: 'CLI', link: '/reference/cli' },
          { text: 'Manifest', link: '/reference/manifest' },
          { text: 'Guardrails', link: '/reference/guardrails' },
        ],
      },

      {
        text: 'Architecture',
        collapsed: true,
        items: [
          { text: 'Memory model', link: '/architecture/memory-model' },
          { text: 'Sync internals', link: '/architecture/sync-internals' },
          { text: 'Auto-sync hook', link: '/architecture/auto-sync-hook' },
        ],
      },

      { text: 'Troubleshooting', link: '/troubleshooting' },
      { text: 'Working as a team', link: '/teamwork' },
    ],

    socialLinks: [
      { icon: 'github', link: 'https://github.com/Adansuku/nova-spec' },
    ],

    editLink: {
      pattern: 'https://github.com/Adansuku/nova-spec/edit/main/docs/:path',
      text: 'Edit this page on GitHub',
    },

    search: {
      provider: 'local',
      options: {
        translations: {
          button: {
            buttonText: 'Search docs',
            buttonAriaLabel: 'Search docs',
          },
          modal: {
            displayDetails: 'Display detailed list',
            resetButtonTitle: 'Reset',
            backButtonTitle: 'Back',
            noResultsText: 'No results',
            footer: {
              selectText: 'to select',
              navigateText: 'to navigate',
              closeText: 'to close',
            },
          },
        },
      },
    },

    footer: {
      message: 'Released under the MIT License.',
      copyright: 'nova-spec',
    },
  },

  // Tighten the link checker — broken internal links should fail the build
  ignoreDeadLinks: false,
})
