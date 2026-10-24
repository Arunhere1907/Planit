import React, { useState } from "react";
import {
  Sparkles,
  Bookmark,
  BookmarkCheck,
  RefreshCw,
  Plus,
  Trash2,
  Tag,
  Loader2,
  Filter,
} from "lucide-react";
import { IdeaItem, EventProfile } from "../types";

interface IdeasViewProps {
  ideas: IdeaItem[];
  profile: EventProfile;
  onUpdateIdeas: (ideas: IdeaItem[]) => void;
}

export const IdeasView: React.FC<IdeasViewProps> = ({ ideas, profile, onUpdateIdeas }) => {
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [showSavedOnly, setShowSavedOnly] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  const categories = [
    "Decor & Ambiance",
    "Catering & Menu",
    "Entertainment & Music",
    "Guest Experience",
    "Return Gifts & Favors",
  ];

  const handleToggleSave = (ideaId: string) => {
    const updated = ideas.map((idea) =>
      idea.id === ideaId ? { ...idea, saved: !idea.saved } : idea
    );
    onUpdateIdeas(updated);
  };

  const handleDismiss = (ideaId: string) => {
    onUpdateIdeas(ideas.filter((i) => i.id !== ideaId));
  };

  const handleGenerateFreshIdeas = async (focusCategory?: string) => {
    setIsGenerating(true);
    try {
      const res = await fetch("/api/ideas/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile,
          focusCategory: focusCategory === "all" ? undefined : focusCategory,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.ideas && data.ideas.length > 0) {
          onUpdateIdeas([...data.ideas, ...ideas]);
        }
      }
    } catch (e) {
      console.warn("Failed to generate ideas:", e);
    } finally {
      setIsGenerating(false);
    }
  };

  const filteredIdeas = ideas.filter((item) => {
    if (showSavedOnly && !item.saved) return false;
    if (activeCategory !== "all" && item.category !== activeCategory) return false;
    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Personalized Ideas & Concepts</h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
              Culturally Tailored for {profile.city}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Unique decor concepts, authentic regional food counters, guest experiential moments, and keepsake favors.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleGenerateFreshIdeas(activeCategory)}
            disabled={isGenerating}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-xl shadow-xs transition-colors"
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            <span>Generate More Ideas</span>
          </button>
        </div>
      </div>

      {/* Category Pills & Saved Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          <button
            onClick={() => setActiveCategory("all")}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-colors whitespace-nowrap ${
              activeCategory === "all"
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            All Themes ({ideas.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-colors whitespace-nowrap ${
                activeCategory === cat
                  ? "bg-rose-50 text-rose-700 border border-rose-200"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <button
          onClick={() => setShowSavedOnly(!showSavedOnly)}
          className={`px-3 py-1 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 ${
            showSavedOnly
              ? "bg-amber-100 text-amber-900 border-amber-300"
              : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
          }`}
        >
          <Bookmark className="w-3.5 h-3.5" />
          <span>Saved to Plan ({ideas.filter((i) => i.saved).length})</span>
        </button>
      </div>

      {/* Ideas Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredIdeas.map((idea) => (
          <div
            key={idea.id}
            className={`bg-white rounded-2xl border p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between space-y-3 ${
              idea.saved ? "border-amber-400 bg-amber-50/20" : "border-slate-200"
            }`}
          >
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                  {idea.category}
                </span>

                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    idea.effort_level === "Low"
                      ? "bg-emerald-100 text-emerald-800"
                      : idea.effort_level === "Medium"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-rose-100 text-rose-800"
                  }`}
                >
                  {idea.effort_level} Effort
                </span>
              </div>

              <h3 className="text-sm font-extrabold text-slate-900 leading-snug">{idea.title}</h3>

              <p className="text-xs text-slate-600 leading-relaxed font-light">{idea.description}</p>

              {/* Tags */}
              <div className="flex flex-wrap gap-1 pt-1">
                {idea.tags.map((t, idx) => (
                  <span
                    key={idx}
                    className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded flex items-center gap-0.5"
                  >
                    <Tag className="w-2.5 h-2.5" /> {t}
                  </span>
                ))}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
              <div className="text-xs font-bold text-slate-800 font-mono">
                {idea.cost_range}
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleToggleSave(idea.id)}
                  className={`p-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 ${
                    idea.saved
                      ? "bg-amber-500 text-white"
                      : "text-slate-500 hover:text-amber-700 hover:bg-amber-50"
                  }`}
                  title={idea.saved ? "Saved in your event blueprint" : "Save this idea"}
                >
                  {idea.saved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                  <span>{idea.saved ? "Saved" : "Save"}</span>
                </button>

                <button
                  onClick={() => handleDismiss(idea.id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                  title="Dismiss idea"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
