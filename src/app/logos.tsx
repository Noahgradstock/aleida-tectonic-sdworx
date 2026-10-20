// Logos of the systems the brain connects to. Simplified marks, drawn inline so nothing loads from outside.

export function TeamsLogo() {
  return (
    <svg viewBox="0 0 32 32" className="h-7 w-7">
      <circle cx="23" cy="9" r="4" fill="#7b83eb" />
      <rect x="17" y="14" width="12" height="11" rx="3" fill="#7b83eb" />
      <circle cx="15" cy="8" r="5" fill="#5059c9" />
      <rect x="3" y="11" width="17" height="17" rx="3" fill="#4b53bc" />
      <path d="M7.5 15.5h8M11.5 15.5v9" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}

export function GmailLogo() {
  return (
    <svg viewBox="0 0 32 24" className="h-6 w-7">
      <path d="M2 6v15a2 2 0 0 0 2 2h4V10l8 6 8-6v13h4a2 2 0 0 0 2-2V6l-3-2-11 8L5 4z" fill="#ea4335" />
      <path d="M2 6l6 4.5V23H4a2 2 0 0 1-2-2z" fill="#4285f4" />
      <path d="M30 6l-6 4.5V23h4a2 2 0 0 0 2-2z" fill="#34a853" />
      <path d="M24 3.5v7L30 6V4.5a2.5 2.5 0 0 0-4-2z" fill="#fbbc04" />
      <path d="M8 3.5v7L2 6V4.5a2.5 2.5 0 0 1 4-2z" fill="#c5221f" />
    </svg>
  );
}

export function DatabaseLogo() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="#161616" strokeWidth="1.6">
      <ellipse cx="12" cy="5.5" rx="7.5" ry="2.8" />
      <path d="M4.5 5.5v13c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8v-13" />
      <path d="M4.5 12c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8" />
    </svg>
  );
}

export function DocsLogo() {
  return (
    <svg viewBox="0 0 32 32" className="h-7 w-7">
      <circle cx="14" cy="11" r="9" fill="#036c70" />
      <circle cx="21" cy="19" r="7" fill="#1a9ba1" />
      <circle cx="13" cy="23" r="6" fill="#37c6d0" />
      <rect x="3" y="9" width="15" height="15" rx="2.5" fill="#03787c" />
      <path d="M13.5 13.5c-.8-.8-4.5-1-4.5 1.2 0 2.3 4.8 1.4 4.8 3.8 0 2.2-3.8 2-5 1" stroke="#fff" strokeWidth="1.8" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function OutlookLogo() {
  return (
    <svg viewBox="0 0 32 32" className="h-7 w-7">
      <rect x="12" y="6" width="17" height="20" rx="2" fill="#0a64ad" />
      <path d="M12 12l8.5 6 8.5-6v12a2 2 0 0 1-2 2H14a2 2 0 0 1-2-2z" fill="#28a8ea" />
      <rect x="3" y="9" width="15" height="15" rx="2.5" fill="#0078d4" />
      <ellipse cx="10.5" cy="16.5" rx="3.6" ry="4.4" fill="none" stroke="#fff" strokeWidth="2" />
    </svg>
  );
}

// Microsoft Copilot, drawn simply: two soft ribbons in its blue-to-orange colours.
export function CopilotLogo() {
  return (
    <svg viewBox="0 0 32 32" className="h-7 w-7">
      <defs>
        <linearGradient id="copilot-a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2870ea" />
          <stop offset="55%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#e5489d" />
        </linearGradient>
        <linearGradient id="copilot-b" x1="1" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="60%" stopColor="#ef5d92" />
          <stop offset="100%" stopColor="#8b5cf6" />
        </linearGradient>
      </defs>
      <path d="M11.5 4h6.2c1.6 0 3 1.1 3.4 2.6L17 23.8c-.4 1.5-1.8 2.6-3.4 2.6H7.4c-2.3 0-3.9-2.2-3.3-4.4l4.1-15.4C8.6 5.1 10 4 11.5 4Z" fill="url(#copilot-a)" />
      <path d="M20.5 28h-6.2c-1.6 0-3-1.1-3.4-2.6L15 8.2c.4-1.5 1.8-2.6 3.4-2.6h6.2c2.3 0 3.9 2.2 3.3 4.4l-4.1 15.4c-.4 1.5-1.8 2.6-3.3 2.6Z" fill="url(#copilot-b)" opacity=".92" />
    </svg>
  );
}
