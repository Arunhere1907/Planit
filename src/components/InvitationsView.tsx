import React, { useState } from "react";
import {
  Copy,
  Check,
  Sparkles,
  Share2,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import type { InvitationItem, EventProfile } from "../types";
import { formatDate } from "../lib/formatters";

interface InvitationsViewProps {
  invitations: InvitationItem[];
  profile: EventProfile;
  venueName?: string;
  onUpdateInvitations: (invitations: InvitationItem[]) => void;
}

export const InvitationsView: React.FC<InvitationsViewProps> = ({
  invitations,
  profile,
  venueName = "The Green Pearl Heritage Resort, SG Highway",
  onUpdateInvitations,
}) => {
  const [selectedType, setSelectedType] = useState<string>("WhatsApp Invite");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("English");
  const [selectedTone, setSelectedTone] = useState<string>("Warm & Traditional");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const inviteTypes = [
    "WhatsApp Invite",
    "Formal Digital Card",
    "Save-the-Date Reminder",
    "RSVP Follow-up",
    "Post-Event Thank You Note",
    "Host Welcome Speech",
  ];

  const languages = ["English", "Hindi", "Gujarati"];
  const tones = ["Formal & Royal", "Warm & Traditional", "Lighthearted & Joyful", "Modern Minimalist"];

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const res = await fetch("/api/invitations/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: selectedType,
          language: selectedLanguage,
          tone: selectedTone,
          profile,
          venueName,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.variants && data.variants.length > 0) {
          onUpdateInvitations([...data.variants, ...invitations]);
        }
      }
    } catch (e) {
      console.warn("Error generating invitations:", e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleContentEdit = (id: string, newContent: string) => {
    onUpdateInvitations(
      invitations.map((inv) =>
        inv.id === id
          ? {
              ...inv,
              content: newContent,
              share_url: `https://wa.me/?text=${encodeURIComponent(newContent)}`,
            }
          : inv
      )
    );
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Main heading for invitations view */}
      <h1 className="sr-only" tabIndex={-1}>
        Invitations and Copy - {profile.title}
      </h1>
      
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Invitations & Copy Generator</h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Strict Fact Guardrails
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Dates, venues, and names are strictly locked to your verified event profile. Never hallucinated.
          </p>
        </div>

        <button
          onClick={handleGenerate}
          disabled={isGenerating}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-xl shadow-xs transition-colors"
        >
          {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          <span>Generate 3 Variations</span>
        </button>
      </div>

      {/* Control Bar: Type, Language & Tone */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label htmlFor="invite-type" className="block text-xs font-bold text-slate-700 mb-1">Message Type</label>
          <select
            id="invite-type"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 font-semibold rounded-xl px-3 py-2 text-xs text-slate-900"
          >
            {inviteTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="invite-language" className="block text-xs font-bold text-slate-700 mb-1">Language</label>
          <select
            id="invite-language"
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 font-semibold rounded-xl px-3 py-2 text-xs text-slate-900"
          >
            {languages.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="invite-tone" className="block text-xs font-bold text-slate-700 mb-1">Tone & Voice</label>
          <select
            id="invite-tone"
            value={selectedTone}
            onChange={(e) => setSelectedTone(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 font-semibold rounded-xl px-3 py-2 text-xs text-slate-900"
          >
            {tones.map((tone) => (
              <option key={tone} value={tone}>
                {tone}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Ground Truth Validation Box */}
      <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-700">Strict Fact Anchor:</span>
          <span className="bg-white px-2 py-0.5 rounded border border-slate-200 font-medium">
            🗓 {formatDate(profile.date)}
          </span>
          <span className="bg-white px-2 py-0.5 rounded border border-slate-200 font-medium">
            📍 {venueName}
          </span>
          <span className="bg-white px-2 py-0.5 rounded border border-slate-200 font-medium">
            👥 {profile.guest_count} Guests
          </span>
        </div>
        <span className="text-[11px] text-slate-400">All outputs editable inline</span>
      </div>

      {/* Generated Variations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {invitations.map((inv) => (
          <div
            key={inv.id}
            className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between space-y-3"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
                    {inv.type}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">• {inv.tone}</span>
                </div>
                <span className="text-[11px] font-bold text-slate-400">{inv.language}</span>
              </div>

              {/* Editable Text Area */}
              <textarea
                rows={9}
                value={inv.content}
                onChange={(e) => handleContentEdit(inv.id, e.target.value)}
                lang={inv.language === "Hindi" ? "hi" : inv.language === "Gujarati" ? "gu" : "en"}
                className="w-full p-3 bg-slate-50/70 hover:bg-white focus:bg-white border border-slate-200 focus:border-rose-500 rounded-xl text-xs sm:text-sm font-sans leading-relaxed text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-rose-500 transition-colors resize-y"
              />
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => handleCopy(inv.id, inv.content)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                {copiedId === inv.id ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span>Copy Text</span>
                  </>
                )}
              </button>

              <a
                href={inv.share_url || `https://wa.me/?text=${encodeURIComponent(inv.content)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-2xs transition-colors"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Share WhatsApp</span>
              </a>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
