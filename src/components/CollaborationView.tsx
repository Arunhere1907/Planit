import React, { useState } from "react";
import {
  UserPlus,
  Share2,
  Copy,
  Check,
  Activity,
  Trash2,
} from "lucide-react";
import { Collaborator, ActivityLogItem } from "../types";

interface CollaborationViewProps {
  collaborators: Collaborator[];
  activityLog: ActivityLogItem[];
  onAddCollaborator: (collaborator: Collaborator) => void;
  onRemoveCollaborator: (id: string) => void;
}

export const CollaborationView: React.FC<CollaborationViewProps> = ({
  collaborators,
  activityLog,
  onAddCollaborator,
  onRemoveCollaborator,
}) => {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<"editor" | "viewer">("editor");

  const [shareLinkActive, setShareLinkActive] = useState(true);
  const [copiedLink, setCopiedLink] = useState(false);

  const shareUrl = `${window.location.origin}/share/plan-preview-secret-key-99`;

  const handleCopyShareLink = () => {
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !newName) return;

    onAddCollaborator({
      id: `collab-${Date.now()}`,
      name: newName,
      email: newEmail,
      role: newRole,
    });

    setShowInviteModal(false);
    setNewName("");
    setNewEmail("");
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Team & Activity Feed</h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              Role-Based Access
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Coordinate with family, bridal party, and event coordinators with Owner, Editor, and Viewer permissions.
          </p>
        </div>

        <button
          onClick={() => setShowInviteModal(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-xs transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          <span>Invite Member</span>
        </button>
      </div>

      {/* 2-Column: Collaborator Cards & Activity Log */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 spans): Team Members & Public Read-Only Share Link */}
        <div className="lg:col-span-2 space-y-6">
          {/* Public Read-Only Share Link Card */}
          <div className="bg-gradient-to-r from-indigo-50 via-white to-indigo-50 p-5 rounded-2xl border border-indigo-200/80 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Share2 className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">Viewer-Only Public Share Link</h3>
              </div>
              <button
                onClick={() => setShareLinkActive(!shareLinkActive)}
                className={`text-[11px] font-bold px-2 py-0.5 rounded-md transition-colors ${
                  shareLinkActive
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-slate-200 text-slate-600"
                }`}
              >
                {shareLinkActive ? "Active (Link Enabled)" : "Revoked (Access Disabled)"}
              </button>
            </div>

            <p className="text-xs text-slate-600 font-light">
              Anyone with this link can view the live itinerary, budget status, and vendors in read-only mode without logging in.
            </p>

            {shareLinkActive && (
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  className="flex-1 bg-white border border-indigo-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 font-mono select-all"
                />
                <button
                  onClick={handleCopyShareLink}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1 shrink-0"
                >
                  {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedLink ? "Copied" : "Copy"}</span>
                </button>
              </div>
            )}
          </div>

          {/* Members Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Current Collaborators ({collaborators.length})</h3>
            </div>

            <div className="divide-y divide-slate-100 text-xs sm:text-sm">
              {collaborators.map((c) => (
                <div key={c.id} className="p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-xs">
                      {c.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900">{c.name}</div>
                      <div className="text-xs text-slate-500">{c.email}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full capitalize ${
                        c.role === "owner"
                          ? "bg-rose-100 text-rose-800"
                          : c.role === "editor"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {c.role}
                    </span>

                    {c.role !== "owner" && (
                      <button
                        onClick={() => onRemoveCollaborator(c.id)}
                        className="text-slate-400 hover:text-rose-600 p-1"
                        title="Remove member"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (1 span): Realtime Activity Feed */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-rose-600" />
            <h3 className="text-sm font-bold text-slate-900">Live Activity Feed</h3>
          </div>

          <div className="relative pl-5 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            {activityLog.map((log) => (
              <div key={log.id} className="relative group text-xs">
                <div className="absolute -left-5 top-1 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
                <div className="text-slate-900 font-semibold">
                  <span className="font-bold text-slate-900">{log.user}</span>{" "}
                  <span className="text-rose-600 font-medium">{log.action}</span>
                </div>
                <div className="text-slate-600 text-[11px] mt-0.5">{log.detail}</div>
                <div className="text-[10px] text-slate-400 mt-1">
                  {new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Invite Member Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6">
            <h3 className="text-base font-bold text-slate-900 mb-4">Invite Team Member</h3>
            <form onSubmit={handleInvite} className="space-y-3.5 text-xs sm:text-sm">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Diya Shah"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="diya@example.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Access Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as "owner" | "editor" | "viewer")}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-medium"
                >
                  <option value="editor">Editor (Can edit tasks, expenses & vendors)</option>
                  <option value="viewer">Viewer (Read-only review)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-xs"
                >
                  Send Invitation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
