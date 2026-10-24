import { FullEventPlan } from "../types";

/**
 * Generates an RFC 5545 compliant .ics calendar string and triggers download
 */
export function exportToICS(plan: FullEventPlan) {
  const { profile, timeline } = plan;
  let icsContent = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//PlanIt Event Planning Assistant//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${profile.title}`,
  ];

  // Add the main event itself
  const mainEventDate = profile.date.replace(/-/g, "");
  icsContent.push(
    "BEGIN:VEVENT",
    `UID:main-${profile.id}@planit.ai`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`,
    `DTSTART;VALUE=DATE:${mainEventDate}`,
    `DTEND;VALUE=DATE:${mainEventDate}`,
    `SUMMARY:${profile.title}`,
    `DESCRIPTION:Event Type: ${profile.type} | Guests: ${profile.guest_count} | Location: ${profile.city}`,
    `LOCATION:${profile.city}`,
    "STATUS:CONFIRMED",
    "END:VEVENT"
  );

  // Add key tasks as milestones
  for (const task of timeline.tasks) {
    if (!task.due_date) continue;
    const taskDate = task.due_date.replace(/-/g, "");
    icsContent.push(
      "BEGIN:VEVENT",
      `UID:${task.id}@planit.ai`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").split(".")[0]}Z`,
      `DTSTART;VALUE=DATE:${taskDate}`,
      `DTEND;VALUE=DATE:${taskDate}`,
      `SUMMARY:[PlanIt] ${task.title}`,
      `DESCRIPTION:Assignee: ${task.assignee} | Priority: ${task.priority} | Notes: ${task.notes || "None"}`,
      `LOCATION:${profile.city}`,
      task.status === "completed" ? "STATUS:COMPLETED" : "STATUS:CONFIRMED",
      "END:VEVENT"
    );
  }

  icsContent.push("END:VCALENDAR");

  const blob = new Blob([icsContent.join("\r\n")], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", `${profile.title.replace(/\s+/g, "_")}_schedule.ics`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Exports Budget to CSV
 */
export function exportBudgetCSV(plan: FullEventPlan) {
  const headers = ["Category Name", "Allocated Amount (INR)", "Percent (%)", "Locked", "Reasoning"];
  const rows = plan.budget.categories.map((c) => [
    `"${c.name}"`,
    c.amount,
    `${c.percent}%`,
    c.is_locked ? "Yes" : "No",
    `"${c.reasoning.replace(/"/g, '""')}"`,
  ]);

  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  downloadBlob(csvContent, `${plan.profile.title.replace(/\s+/g, "_")}_budget.csv`, "text/csv;charset=utf-8;");
}

/**
 * Exports Vendor Checklist to CSV
 */
export function exportVendorsCSV(plan: FullEventPlan) {
  const headers = ["Vendor Name", "Category", "Status", "Quote (INR)", "Advance Paid", "Balance Due", "Payment Due Date", "Contact", "Notes"];
  const rows = plan.vendors.map((v) => [
    `"${v.name}"`,
    `"${v.category}"`,
    `"${v.status}"`,
    v.quote,
    v.advance_paid,
    v.balance,
    `"${v.due_date}"`,
    `"${v.contact.replace(/"/g, '""')}"`,
    `"${(v.notes || "").replace(/"/g, '""')}"`,
  ]);

  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  downloadBlob(csvContent, `${plan.profile.title.replace(/\s+/g, "_")}_vendors.csv`, "text/csv;charset=utf-8;");
}

function downloadBlob(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
