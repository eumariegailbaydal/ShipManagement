@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --font-sans: "IBM Plex Sans", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "IBM Plex Mono", ui-monospace, monospace;
}

body {
  background-color: #fafaf8;
  color: #1a1a18;
}

.panel {
  background: #ffffff;
  border: 1px solid #e2e2de;
}

.data-label {
  font-family: var(--font-mono);
  letter-spacing: 0.02em;
}

table.log-table th {
  font-family: var(--font-mono);
  font-size: 0.7rem;
  letter-spacing: 0.04em;
  color: #5b6b75;
  text-align: left;
  font-weight: 500;
  border-bottom: 1px solid #e2e2de;
  padding: 0.5rem 0.75rem;
}

table.log-table td {
  padding: 0.6rem 0.75rem;
  border-bottom: 1px solid #eeeeeb;
  font-size: 0.875rem;
}

table.log-table tr:hover td {
  background: #fdfaf6;
}

/* --- Responsive adjustments for phone & tablet --- */
@media (max-width: 767px) {
  .grid-cols-2,
  .grid-cols-3,
  .grid-cols-4,
  .grid-cols-5 {
    grid-template-columns: 1fr !important;
  }
  .panel {
    overflow-x: auto;
  }
  main .p-8 {
    padding: 1rem !important;
  }
}

@media (min-width: 768px) and (max-width: 1023px) {
  .grid-cols-3,
  .grid-cols-4,
  .grid-cols-5 {
    grid-template-columns: repeat(2, 1fr) !important;
  }
  main .p-8 {
    padding: 1.5rem !important;
  }
}

@media (max-width: 767px) {
  table.log-table {
    min-width: 640px;
  }
}

/* --- Print utilities (usable on any page) --- */
@media print {
  aside,
  .print-hide {
    display: none !important;
  }
  .print-show {
    display: block !important;
  }
  main {
    width: 100% !important;
  }
  body {
    background: white !important;
  }
  .panel {
    border: 1px solid #ccc !important;
    overflow: visible !important;
  }
}
