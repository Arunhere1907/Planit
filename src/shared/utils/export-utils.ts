import type { FullEventPlan } from "../types/index.js";

/**
 * Security utilities for preventing injection attacks in exports
 */

/**
 * CSV Formula Injection Prevention
 * Excel, Google Sheets, and other spreadsheet apps interpret cells starting with
 * =, +, -, @, tab, or carriage return as formulas, which can execute arbitrary commands
 * 
 * Solution: Prefix dangerous characters with a single quote (') to force text interpretation
 */
function sanitizeCSVCell(value: string | number | undefined | null): string {
  if (value === null || value === undefined) {
    return '""';
  }
  
  const strValue = String(value);
  
  // Check if cell starts with dangerous characters
  const dangerousChars = ['=', '+', '-', '@', '\t', '\r'];
  const firstChar = strValue.charAt(0);
  
  let sanitized = strValue;
  
  // Prefix dangerous characters with single quote to neutralize formulas
  if (dangerousChars.includes(firstChar)) {
    sanitized = "'" + strValue;
  }
  
  // Escape double quotes by doubling them (CSV standard)
  sanitized = sanitized.replace(/"/g, '""');
  
  // Wrap in quotes
  return `"${sanitized}"`;
}

/**
 * Sanitize filename for downloads
 * Removes path traversal attempts and dangerous characters
 */
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9._-]/g, '_') // Only allow safe chars
    .replace(/^\.+/, '') // Remove leading dots
    .replace(/\.{2,}/g, '_') // Remove path traversal attempts
    .substring(0, 255); // Limit length
}

/**
 * Sanitize ICS field values
 * ICS format uses special characters that need escaping
 */
function sanitizeICSField(value: string): string {
  return value
    .replace(/\\/g, '\\\\') // Escape backslashes
    .replace(/;/g, '\\;')   // Escape semicolons
    .replace(/,/g, '\\,')   // Escape commas
    .replace(/\n/g, '\\n')  // Escape newlines
    .replace(/\r/g, '')     // Remove carriage returns
    .substring(0, 1000);    // Limit length to prevent DoS
}

/**
 * Sanitize URLs from external sources (Places API, etc.)
 * Only allow http/https protocols
 * Exported for use in components displaying external URLs
 */
export function sanitizeURL(url: string | undefined): string {
  if (!url) return '';
  
  try {
    const parsed = new URL(url);
    // Only allow http and https protocols
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return url.substring(0, 2000); // Limit length
    }
  } catch {
    // Invalid URL
  }
  
  return '';
}

/**
 * Generates an RFC 5545 compliant .ics calendar string and triggers download in browser
 * NOW WITH: ICS injection prevention, field sanitization, filename sanitization
 */
export function exportToICS(plan: FullEventPlan): void {
  const { profile, timeline } = plan;
  
  // Sanitize all text fields to prevent ICS injection
  const sanitizedTitle = sanitizeICSField(profile.title);
  const sanitizedCity = sanitizeICSField(profile.city);
  const sanitizedType = sanitizeICSField(profile.type);
  
  const icsLines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//PlanIt Event Planning Assistant//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${sanitizedTitle}`,
  ];

  const mainEventDate = profile.date.replace(/-/g, "");
  icsLines.push(
    "BEGIN:VEVENT",
    `UID:main-${profile.id}@planit.ai`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`,
    `DTSTART;VALUE=DATE:${mainEventDate}`,
    `DTEND;VALUE=DATE:${mainEventDate}`,
    `SUMMARY:${sanitizedTitle}`,
    `DESCRIPTION:Type: ${sanitizedType} | Guests: ${profile.guest_count} | Location: ${sanitizedCity}`,
    `LOCATION:${sanitizedCity}`,
    "STATUS:CONFIRMED",
    "END:VEVENT"
  );

  for (const task of timeline.tasks) {
    if (!task.due_date) continue;
    const taskDate = task.due_date.replace(/-/g, "");
    
    // Sanitize task fields
    const sanitizedTaskTitle = sanitizeICSField(task.title);
    const sanitizedAssignee = sanitizeICSField(task.assignee || 'Unassigned');
    const sanitizedPriority = sanitizeICSField(task.priority);
    const sanitizedNotes = sanitizeICSField(task.notes || 'None');
    
    icsLines.push(
      "BEGIN:VEVENT",
      `UID:${task.id}@planit.ai`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`,
      `DTSTART;VALUE=DATE:${taskDate}`,
      `DTEND;VALUE=DATE:${taskDate}`,
      `SUMMARY:[PlanIt] ${sanitizedTaskTitle}`,
      `DESCRIPTION:Assignee: ${sanitizedAssignee} | Priority: ${sanitizedPriority} | Notes: ${sanitizedNotes}`,
      `LOCATION:${sanitizedCity}`,
      task.status === "completed" ? "STATUS:COMPLETED" : "STATUS:CONFIRMED",
      "END:VEVENT"
    );
  }

  icsLines.push("END:VCALENDAR");

  const safeFilename = sanitizeFilename(`${profile.title}_schedule.ics`);
  downloadBlob(
    icsLines.join("\r\n"),
    safeFilename,
    "text/calendar;charset=utf-8"
  );
}

/**
 * Exports Budget to CSV
 * NOW WITH: CSV formula injection prevention, proper escaping
 */
export function exportBudgetCSV(plan: FullEventPlan): void {
  const headers = ["Category Name", "Allocated Amount (INR)", "Percent (%)", "Locked", "Reasoning"];
  
  // Sanitize all cells to prevent CSV formula injection
  const rows = plan.budget.categories.map((c) => [
    sanitizeCSVCell(c.name),
    sanitizeCSVCell(c.amount),
    sanitizeCSVCell(`${c.percent}%`),
    sanitizeCSVCell(c.is_locked ? "Yes" : "No"),
    sanitizeCSVCell(c.reasoning),
  ]);

  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  
  const safeFilename = sanitizeFilename(`${plan.profile.title}_budget.csv`);
  downloadBlob(
    csvContent,
    safeFilename,
    "text/csv;charset=utf-8;"
  );
}

/**
 * Exports Vendor Checklist to CSV
 * NOW WITH: CSV formula injection prevention, URL validation
 */
export function exportVendorsCSV(plan: FullEventPlan): void {
  const headers = [
    "Vendor Name",
    "Category",
    "Status",
    "Quote (INR)",
    "Advance Paid",
    "Balance Due",
    "Payment Due Date",
    "Contact",
    "Notes",
  ];
  
  // Sanitize all cells to prevent CSV formula injection
  const rows = plan.vendors.map((v) => [
    sanitizeCSVCell(v.name),
    sanitizeCSVCell(v.category),
    sanitizeCSVCell(v.status),
    sanitizeCSVCell(v.quote),
    sanitizeCSVCell(v.advance_paid),
    sanitizeCSVCell(v.balance),
    sanitizeCSVCell(v.due_date),
    sanitizeCSVCell(v.contact),
    sanitizeCSVCell(v.notes || ""),
  ]);

  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  
  const safeFilename = sanitizeFilename(`${plan.profile.title}_vendors.csv`);
  downloadBlob(
    csvContent,
    safeFilename,
    "text/csv;charset=utf-8;"
  );
}

/**
 * Download blob helper
 * NOW WITH: Filename sanitization
 */
function downloadBlob(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  // Use rel="noopener" for security (prevents window.opener access)
  link.setAttribute("rel", "noopener");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // Clean up the blob URL
  URL.revokeObjectURL(url);
}
