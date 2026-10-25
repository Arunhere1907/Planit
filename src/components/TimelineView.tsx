import React, { useState } from "react";
import {
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  List,
  Layers,
  Download,
  Plus,
  User,
  Trash2,
} from "lucide-react";
import confetti from "canvas-confetti";
import { Task, RunOfShowItem, EventProfile } from "../types";
import { formatDate } from "../lib/formatters";

interface TimelineViewProps {
  tasks: Task[];
  runOfShow: RunOfShowItem[];
  profile: EventProfile;
  onUpdateTasks: (tasks: Task[]) => void;
  onUpdateRunOfShow: (items: RunOfShowItem[]) => void;
  onExportICS: () => void;
  onOpenReplanModal: () => void;
}

export const TimelineView: React.FC<TimelineViewProps> = ({
  tasks,
  runOfShow,
  profile,
  onUpdateTasks,
  onUpdateRunOfShow,
  onExportICS,
  onOpenReplanModal,
}) => {
  const [viewMode, setViewMode] = useState<"phase" | "list" | "run_of_show">("phase");
  const [phaseFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // New Task form state
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskRole, setNewTaskRole] = useState("Host");
  const [newTaskPriority, setNewTaskPriority] = useState<"high" | "medium" | "low">("medium");
  const [newTaskDueDate, setNewTaskDueDate] = useState(
    new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0]
  );
  const [newTaskLinkedVendor, setNewTaskLinkedVendor] = useState("General");
  const [newTaskNotes, setNewTaskNotes] = useState("");

  // New Run of Show item form state
  const [showAddRos, setShowAddRos] = useState(false);
  const [rosTime, setRosTime] = useState("06:00 PM");
  const [rosTitle, setRosTitle] = useState("");
  const [rosOwner, setRosOwner] = useState("Event Coordinator");
  const [rosLocation, setRosLocation] = useState("Main Stage");
  const [rosNotes, setRosNotes] = useState("");

  const phases: Task["phase"][] = [
    "6+ months",
    "3 months",
    "1 month",
    "1 week",
    "Day before",
    "Day-of",
  ];

  const handleToggleStatus = (taskId: string) => {
    const updated = tasks.map((t) => {
      if (t.id === taskId) {
        const nextStatus: Task["status"] =
          t.status === "completed"
            ? "pending"
            : t.status === "pending"
            ? "in_progress"
            : "completed";

        if (nextStatus === "completed") {
          confetti({
            particleCount: 40,
            spread: 50,
            origin: { y: 0.7 },
          });
        }

        return {
          ...t,
          status: nextStatus,
          edited_at: new Date().toISOString(),
          source: "user" as const,
        };
      }
      return t;
    });

    onUpdateTasks(updated);
  };

  const handleDeleteTask = (taskId: string) => {
    onUpdateTasks(tasks.filter((t) => t.id !== taskId));
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle) return;

    const newTask: Task = {
      id: `task-custom-${Date.now()}`,
      title: newTaskTitle,
      due_date: newTaskDueDate,
      phase: "1 month",
      status: "pending",
      assignee: newTaskRole,
      linked_vendor: newTaskLinkedVendor,
      priority: newTaskPriority,
      notes: newTaskNotes,
      source: "user",
      edited_at: new Date().toISOString(),
    };

    onUpdateTasks([...tasks, newTask]);
    setShowAddTask(false);
    setNewTaskTitle("");
    setNewTaskNotes("");
  };

  const handleCreateRosItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rosTitle) return;

    const newItem: RunOfShowItem = {
      id: `ros-custom-${Date.now()}`,
      time: rosTime,
      title: rosTitle,
      owner: rosOwner,
      location: rosLocation,
      notes: rosNotes,
    };

    onUpdateRunOfShow([...runOfShow, newItem]);
    setShowAddRos(false);
    setRosTitle("");
    setRosNotes("");
  };

  const handleDeleteRosItem = (id: string) => {
    onUpdateRunOfShow(runOfShow.filter((r) => r.id !== id));
  };

  // Filter tasks
  const filteredTasks = tasks.filter((t) => {
    if (phaseFilter !== "all" && t.phase !== phaseFilter) return false;
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner with Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Timeline & Run-of-Show</h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              Deterministic Backwards Offset
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Target date: {formatDate(profile.date)}. Tasks automatically scale backwards and compress if the event date approaches.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onExportICS}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition-colors shadow-2xs"
            title="Download iCalendar file for Google Calendar or Apple Calendar"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export .ICS Calendar</span>
          </button>

          <button
            onClick={onOpenReplanModal}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition-colors"
          >
            <CalendarIcon className="w-4 h-4" />
            <span>Reschedule Date Diff</span>
          </button>

          {viewMode !== "run_of_show" ? (
            <button
              onClick={() => setShowAddTask(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Task</span>
            </button>
          ) : (
            <button
              onClick={() => setShowAddRos(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Run-of-Show Slot</span>
            </button>
          )}
        </div>
      </div>

      {/* View Switcher Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode("phase")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              viewMode === "phase"
                ? "bg-slate-900 text-white shadow-2xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Phases View ({tasks.length})</span>
          </button>

          <button
            onClick={() => setViewMode("list")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              viewMode === "list"
                ? "bg-slate-900 text-white shadow-2xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <List className="w-3.5 h-3.5" />
            <span>Master Checklist</span>
          </button>

          <button
            onClick={() => setViewMode("run_of_show")}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              viewMode === "run_of_show"
                ? "bg-rose-600 text-white shadow-2xs"
                : "text-rose-700 bg-rose-50 hover:bg-rose-100"
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Day-of Run of Show ({runOfShow.length})</span>
          </button>
        </div>

        {/* Filters if in task view */}
        {viewMode !== "run_of_show" && (
          <div className="hidden sm:flex items-center gap-2 text-xs">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-300 font-medium"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        )}
      </div>

      {/* VIEW 1: PHASE-GROUPED VIEW */}
      {viewMode === "phase" && (
        <div className="space-y-6">
          {phases.map((phase) => {
            const phaseTasks = filteredTasks.filter((t) => t.phase === phase);
            if (phaseTasks.length === 0) return null;

            return (
              <div key={phase} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    <h3 className="text-sm font-extrabold text-slate-900 tracking-tight uppercase">
                      {phase} Milestones
                    </h3>
                    <span className="text-xs text-slate-500 font-medium">({phaseTasks.length} tasks)</span>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {phaseTasks.map((task) => (
                    <div
                      key={task.id}
                      className={`p-3.5 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                        task.status === "completed"
                          ? "bg-slate-50/80 border-slate-200 opacity-70"
                          : "bg-white border-slate-200/90 hover:border-slate-300 hover:shadow-2xs"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          onClick={() => handleToggleStatus(task.id)}
                          className="mt-0.5 transition-transform active:scale-90"
                          title="Click to toggle status: Pending -> In Progress -> Completed"
                        >
                          {task.status === "completed" ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 fill-emerald-100" />
                          ) : task.status === "in_progress" ? (
                            <div className="w-5 h-5 rounded-full border-2 border-amber-500 bg-amber-100 flex items-center justify-center text-[10px] font-bold text-amber-700">
                              •
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded-full border-2 border-slate-300 hover:border-emerald-500" />
                          )}
                        </button>

                        <div className="space-y-1">
                          <div
                            className={`text-xs sm:text-sm font-bold text-slate-900 ${
                              task.status === "completed" ? "line-through text-slate-500" : ""
                            }`}
                          >
                            {task.title}
                          </div>

                          <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                            <span className="font-semibold text-slate-700 flex items-center gap-1">
                              <User className="w-3 h-3 text-slate-400" /> {task.assignee}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <CalendarIcon className="w-3 h-3 text-slate-400" /> Due {formatDate(task.due_date)}
                            </span>
                            <span>•</span>
                            <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-medium">
                              {task.linked_vendor}
                            </span>
                          </div>

                          {task.notes && (
                            <p className="text-xs text-slate-500 font-light mt-1 italic">{task.notes}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                            task.priority === "high"
                              ? "bg-rose-50 text-rose-700 border border-rose-200"
                              : task.priority === "medium"
                              ? "bg-amber-50 text-amber-800 border border-amber-200"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {task.priority}
                        </span>

                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 transition-colors"
                          title="Delete task"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW 2: FLAT MASTER LIST */}
      {viewMode === "list" && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-4 w-12 text-center">Status</th>
                <th className="py-3 px-4">Task Details</th>
                <th className="py-3 px-4">Phase</th>
                <th className="py-3 px-4">Assignee</th>
                <th className="py-3 px-4">Due Date</th>
                <th className="py-3 px-4">Priority</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTasks.map((task) => (
                <tr key={task.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4 text-center">
                    <button onClick={() => handleToggleStatus(task.id)}>
                      {task.status === "completed" ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-slate-300" />
                      )}
                    </button>
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-900">
                    <div className={task.status === "completed" ? "line-through text-slate-400" : ""}>
                      {task.title}
                    </div>
                    <div className="text-[11px] text-slate-400">{task.linked_vendor}</div>
                  </td>
                  <td className="py-3 px-4 text-slate-600">{task.phase}</td>
                  <td className="py-3 px-4 text-slate-700 font-medium">{task.assignee}</td>
                  <td className="py-3 px-4 text-slate-600 font-mono">{formatDate(task.due_date)}</td>
                  <td className="py-3 px-4">
                    <span
                      className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                        task.priority === "high"
                          ? "bg-rose-50 text-rose-600"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {task.priority}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="text-slate-400 hover:text-rose-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* VIEW 3: DAY-OF RUN OF SHOW (Hour-by-Hour) */}
      {viewMode === "run_of_show" && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-6">
          <div className="border-b border-slate-200 pb-4">
            <h3 className="text-base font-bold text-slate-900">Hour-by-Hour Run-of-Show Protocol</h3>
            <p className="text-xs text-slate-500">
              Synchronized timing for bride/groom prep, vendors arrivals, baraat, dining counters, and quiet curfew.
            </p>
          </div>

          <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-rose-200">
            {runOfShow.map((item, idx) => (
              <div key={item.id || idx} className="relative group bg-slate-50/60 p-4 rounded-xl border border-slate-200/80">
                <div className="absolute -left-6.5 top-5 w-3 h-3 rounded-full bg-rose-600 ring-4 ring-white" />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-black bg-rose-600 text-white px-2.5 py-1 rounded-md shadow-2xs">
                      {item.time}
                    </span>
                    <h4 className="text-sm font-bold text-slate-900">{item.title}</h4>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span className="font-semibold text-slate-700">📍 {item.location}</span>
                    <span>•</span>
                    <span className="italic font-medium text-slate-600">Owner: {item.owner}</span>
                    <button
                      onClick={() => handleDeleteRosItem(item.id)}
                      className="text-slate-400 hover:text-rose-600 ml-2"
                      title="Remove slot"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {item.notes && (
                  <p className="text-xs text-slate-600 mt-2 pl-1 border-l-2 border-amber-400 font-light">
                    {item.notes}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Task Modal */}
      {showAddTask && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6">
            <h3 className="text-base font-bold text-slate-900 mb-4">Add Custom Milestone Task</h3>
            <form onSubmit={handleCreateTask} className="space-y-3.5 text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Task Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Conduct sound check with sound technician"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Assignee Role</label>
                  <input
                    type="text"
                    required
                    value={newTaskRole}
                    onChange={(e) => setNewTaskRole(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Priority</label>
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value as "high" | "medium" | "low")}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-medium"
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Due Date</label>
                  <input
                    type="date"
                    required
                    value={newTaskDueDate}
                    onChange={(e) => setNewTaskDueDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Linked Category</label>
                  <input
                    type="text"
                    value={newTaskLinkedVendor}
                    onChange={(e) => setNewTaskLinkedVendor(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Operational Notes</label>
                <textarea
                  rows={2}
                  value={newTaskNotes}
                  onChange={(e) => setNewTaskNotes(e.target.value)}
                  placeholder="Notes, instructions or contact numbers"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddTask(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-xs"
                >
                  Add Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Run of Show Item Modal */}
      {showAddRos && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6">
            <h3 className="text-base font-bold text-slate-900 mb-4">Add Day-of Run of Show Slot</h3>
            <form onSubmit={handleCreateRosItem} className="space-y-3.5 text-xs sm:text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Time</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 05:45 PM"
                    value={rosTime}
                    onChange={(e) => setRosTime(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Location</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Main Gate / Mandap"
                    value={rosLocation}
                    onChange={(e) => setRosLocation(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Activity / Ceremony Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Groom Baraat Swagat & High Tea"
                  value={rosTitle}
                  onChange={(e) => setRosTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Owner / Lead Responsible</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bride's Brother & Emcee"
                  value={rosOwner}
                  onChange={(e) => setRosOwner(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Coordination Instructions</label>
                <input
                  type="text"
                  placeholder="e.g. Ensure flutist is seated before guests arrive"
                  value={rosNotes}
                  onChange={(e) => setRosNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddRos(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs"
                >
                  Save Run-of-Show Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
