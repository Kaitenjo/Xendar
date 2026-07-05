import { compile } from "@xaendar/compiler";
import { writeFileSync } from "fs";

const template = `
<aside class="{ collapsed() ? 'sidebar sidebar--collapsed' : 'sidebar'}">

  <div class="sidebar__brand">
    <div class="sidebar__logo">
      <svg viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="32" height="32" rx="9" fill="url(#brandGradient)" />
        <path d="M10 21L16 9L22 21" stroke="white" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M12.5 16.5H19.5" stroke="white" stroke-width="2.2" stroke-linecap="round" />
        <defs>
          <linearGradient id="brandGradient" x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
            <stop stop-color="#6366F1" />
            <stop offset="1" stop-color="#22D3B6" />
          </linearGradient>
        </defs>
      </svg>
    </div>
    @if (!collapsed()) {
      <span class="sidebar__brand-name">Nimbus</span>
    }
  </div>

  <nav class="sidebar__nav">
    @for (item of navItems(); track item.route) {
      <a class="sidebar__link" title="{item.label}">
        <span class="sidebar__icon">
          @switch (item.icon) {
            @case ('grid') {
              <svg viewBox="0 0 24 24" fill="none">
                <rect x="3" y="3" width="8" height="8" rx="2" stroke="currentColor" stroke-width="1.8" />
                <rect x="13" y="3" width="8" height="8" rx="2" stroke="currentColor" stroke-width="1.8" />
                <rect x="3" y="13" width="8" height="8" rx="2" stroke="currentColor" stroke-width="1.8" />
                <rect x="13" y="13" width="8" height="8" rx="2" stroke="currentColor" stroke-width="1.8" />
              </svg>
            }
            @case ('folder') {
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" />
              </svg>
            }
            @case ('check') {
              <svg viewBox="0 0 24 24" fill="none">
                <rect x="3" y="3" width="18" height="18" rx="4" stroke="currentColor" stroke-width="1.8" />
                <path d="M8 12.5l2.5 2.5L16 9.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            }
            @case ('users') {
              <svg viewBox="0 0 24 24" fill="none">
                <circle cx="9" cy="8" r="3" stroke="currentColor" stroke-width="1.8" />
                <path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
                <circle cx="17.5" cy="9" r="2.3" stroke="currentColor" stroke-width="1.6" />
                <path d="M15.5 20c.2-2.6 1.7-4.6 3.9-5.3" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" />
              </svg>
            }
            @case ('chart') {
              <svg viewBox="0 0 24 24" fill="none">
                <path d="M4 20V10M12 20V4M20 20v-6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
              </svg>
            }
            @case ('settings') {
              <svg viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.8" />
                <path d="M19.4 13a7.9 7.9 0 0 0 0-2l2-1.5-2-3.4-2.4 1a8 8 0 0 0-1.7-1L15 3h-6l-.3 2.6a8 8 0 0 0-1.7 1l-2.4-1-2 3.4L4.6 11a7.9 7.9 0 0 0 0 2l-2 1.5 2 3.4 2.4-1a8 8 0 0 0 1.7 1L9 21h6l.3-2.6a8 8 0 0 0 1.7-1l2.4 1 2-3.4-2-1.5Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" />
              </svg>
            }
          }
        </span>
        
        @if (!collapsed()) {
          <span class="sidebar__label">{ item.label }</span>
          @if (item.badge) {
            <span class="sidebar__badge">{ item.badge }</span>
          }
        }
      </a>
    }
  </nav>

  <button type="button" class="sidebar__collapse-btn" @click="toggle()" aria-label="Espandi menu">
    <svg viewBox="0 0 24 24" fill="none" [class.rotated]="collapsed">
      <path d="M15 6l-6 6 6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
    @if (!collapsed()) {
      <span>Comprimi</span>
    }
  </button>
</aside>
  `

const filePath = 'dist/compiled.js'
writeFileSync(filePath, compile(template));
