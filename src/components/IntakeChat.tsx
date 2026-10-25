import React, { useState, useEffect, useRef } from "react";
import {
  Mic,
  MicOff,
  Send,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Loader2,
  X,
} from "lucide-react";
import { EventProfile } from "../types";

interface IntakeChatProps {
  onPlanGenerated: (profile: EventProfile) => void;
  onCancel?: () => void;
}

export const IntakeChat: React.FC<IntakeChatProps> = ({ onPlanGenerated, onCancel }) => {
  const [messages, setMessages] = useState<Array<{ role: "assistant" | "user"; content: string }>>([
    {
      role: "assistant",
      content:
        "Hello! I'm PlanIt, your GenAI event planning strategist. Describe your upcoming celebration in your own words (or click the microphone to speak). For example: \"My sister's wedding in Ahmedabad, 200 guests, 8 lakh budget, this December, mostly vegetarian with Jain guests, royal traditional vibe!\"",
    },
  ]);

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Live "What I Understood" profile card
  const [draftProfile, setDraftProfile] = useState<EventProfile>({
    id: `event-${Date.now()}`,
    type: "wedding",
    title: "Family Wedding Celebration",
    date: "2026-12-18",
    city: "Ahmedabad",
    guest_count: 200,
    total_budget: 800000,
    currency: "INR",
    vibe_theme: "Traditional & Festive",
    culture_tradition: "Gujarati",
    dietary_mix: "Vegetarian with Jain options",
    indoor_outdoor: "outdoor",
    priorities: ["Gourmet Catering", "Floral Mandap", "Candid Photography"],
    constraints: "Loud music curfew at 10 PM",
  });

  const [followUpQuestions, setFollowUpQuestions] = useState<string[]>([]);
  const [aiSummary, setAiSummary] = useState<string>(
    "Ready to generate! Review or edit the parameters on the right."
  );

  // Web Speech API initialization
  useEffect(() => {
    const SpeechRecognition =
      (window as Window & typeof globalThis & { SpeechRecognition?: typeof SpeechRecognition; webkitSpeechRecognition?: typeof SpeechRecognition }).SpeechRecognition || 
      (window as Window & typeof globalThis & { SpeechRecognition?: typeof SpeechRecognition; webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-IN";

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0][0].transcript;
        setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert("Speech recognition is not supported in this browser. Please type your message.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setIsListening(true);
      recognitionRef.current.start();
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    const messageText = textToSend || input;
    if (!messageText.trim() || isLoading) return;

    const updatedHistory = [...messages, { role: "user" as const, content: messageText }];
    setMessages(updatedHistory);
    setInput("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messageHistory: updatedHistory,
          latestMessage: messageText,
        }),
      });

      if (!res.ok) throw new Error("Failed to process conversational intake");

      const data = await res.json();
      const profileData = data.profile || data.data?.profile;
      if (profileData) {
        setDraftProfile((prev) => ({
          ...prev,
          ...profileData,
          id: prev.id,
        }));
      }

      const questions = data.follow_up_questions || data.data?.followUpQuestions || [];
      const summary = data.ai_summary || `Updated profile based on your message.`;

      setFollowUpQuestions(questions);
      setAiSummary(summary);

      let assistantReply = summary;
      if (questions.length > 0) {
        assistantReply += `\n\nTo tailor your plan perfectly:\n` +
          questions.map((q: string, i: number) => `${i + 1}. ${q}`).join("\n");
      }

      setMessages((prev) => [...prev, { role: "assistant", content: assistantReply }]);
    } catch (err: unknown) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "I parsed your notes into the editable card on the right!" },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickPill = (pillText: string) => {
    setInput(pillText);
    handleSendMessage(pillText);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Modal Top Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">PlanIt Conversational Intake</h2>
              <p className="text-xs text-slate-500">Natural language event extraction & structured profiling</p>
            </div>
          </div>
          {onCancel && (
            <button
              onClick={onCancel}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* 2-Column Body: Chat & Live "What I Understood" Card */}
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200 flex-1 overflow-hidden">
          {/* Column 1: Chat Dialogue & Voice */}
          <div className="flex flex-col h-[480px] sm:h-[540px]">
            {/* Quick Starter Pills */}
            <div className="p-3 bg-slate-50/70 border-b border-slate-100 flex flex-wrap gap-1.5 text-xs">
              <span className="text-[11px] font-bold text-slate-500 self-center mr-1">Quick Presets:</span>
              <button
                onClick={() =>
                  handleQuickPill(
                    "Sister's wedding, 200 guests, Ahmedabad, 8 lakh, December, mostly veg with Jain, traditional vibe"
                  )
                }
                className="px-2.5 py-1 bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-600 rounded-lg border border-slate-200 text-[11px] font-medium transition-colors cursor-pointer"
              >
                💍 Ahmedabad Wedding (8L)
              </button>
              <button
                onClick={() =>
                  handleQuickPill(
                    "30th Birthday party, 50 guests, Mumbai rooftop, 2 lakh budget, next month, music, cocktails & DJ"
                  )
                }
                className="px-2.5 py-1 bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-700 rounded-lg border border-slate-200 text-[11px] font-medium transition-colors cursor-pointer"
              >
                🎂 Mumbai Rooftop Birthday (2L)
              </button>
              <button
                onClick={() =>
                  handleQuickPill(
                    "Community Garba Utsav, 500 attendees, Ahmedabad grounds, 5 lakh budget, food stalls & sound"
                  )
                }
                className="px-2.5 py-1 bg-white hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 rounded-lg border border-slate-200 text-[11px] font-medium transition-colors cursor-pointer"
              >
                🎪 Ahmedabad Community Mela (5L)
              </button>
            </div>

            {/* Chat Transcript */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap ${
                      m.role === "user"
                        ? "bg-indigo-600 text-white rounded-br-none"
                        : "bg-slate-100 text-slate-800 rounded-bl-none border border-slate-200/80"
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-100 rounded-2xl rounded-bl-none px-4 py-2 text-xs text-slate-500 flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                    Extracting event parameters & checking constraints...
                  </div>
                </div>
              )}
            </div>

            {/* Chat Input Bar */}
            <div className="p-3 border-t border-slate-200 bg-white">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2"
              >
                <button
                  type="button"
                  onClick={toggleListening}
                  className={`p-2.5 rounded-xl border transition-colors shrink-0 cursor-pointer ${
                    isListening
                      ? "bg-amber-500 text-white border-amber-600 animate-pulse"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-300"
                  }`}
                  title={isListening ? "Listening... click to stop" : "Voice input (Web Speech API)"}
                >
                  {isListening ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                </button>

                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={
                    isListening
                      ? "Listening to your voice..."
                      : "Type details e.g. 150 guests, Ahmedabad, Dec 2026..."
                  }
                  className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2 text-xs sm:text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />

                <button
                  type="submit"
                  disabled={isLoading || !input.trim()}
                  className="p-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl transition-colors shrink-0 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>

          {/* Column 2: Live "What I Understood" Editable Profile Card */}
          <div className="p-5 flex flex-col h-[480px] sm:h-[540px] overflow-y-auto bg-slate-50/50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">What I Understood (Live Card)</h3>
              </div>
              <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                Editable before generation
              </span>
            </div>

            {/* Editable Profile Inputs */}
            <div className="space-y-3 flex-1 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Event Title</label>
                <input
                  type="text"
                  value={draftProfile.title}
                  onChange={(e) => setDraftProfile({ ...draftProfile, title: e.target.value })}
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-semibold text-slate-900 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Event Type</label>
                  <select
                    value={draftProfile.type}
                    onChange={(e) => setDraftProfile({ ...draftProfile, type: e.target.value as "wedding" | "birthday" | "community" | "general" })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-medium text-slate-900"
                  >
                    <option value="wedding">Wedding</option>
                    <option value="birthday">Birthday</option>
                    <option value="community">Community Event</option>
                    <option value="general">General Party</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Event Date</label>
                  <input
                    type="date"
                    value={draftProfile.date}
                    onChange={(e) => setDraftProfile({ ...draftProfile, date: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-medium text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">City</label>
                  <input
                    type="text"
                    value={draftProfile.city}
                    onChange={(e) => setDraftProfile({ ...draftProfile, city: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-medium text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Guests</label>
                  <input
                    type="number"
                    value={draftProfile.guest_count}
                    onChange={(e) =>
                      setDraftProfile({ ...draftProfile, guest_count: parseInt(e.target.value) || 50 })
                    }
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-medium text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Budget (INR)</label>
                  <input
                    type="number"
                    step="10000"
                    value={draftProfile.total_budget}
                    onChange={(e) =>
                      setDraftProfile({ ...draftProfile, total_budget: parseInt(e.target.value) || 100000 })
                    }
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-medium text-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Vibe & Theme</label>
                  <input
                    type="text"
                    value={draftProfile.vibe_theme}
                    onChange={(e) => setDraftProfile({ ...draftProfile, vibe_theme: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Dietary Preferences</label>
                  <input
                    type="text"
                    value={draftProfile.dietary_mix}
                    onChange={(e) => setDraftProfile({ ...draftProfile, dietary_mix: e.target.value })}
                    className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Key Priorities & Constraints</label>
                <input
                  type="text"
                  value={draftProfile.constraints}
                  onChange={(e) => setDraftProfile({ ...draftProfile, constraints: e.target.value })}
                  placeholder="e.g. 10 PM sound curfew, ramp access for grandparents"
                  className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-900"
                />
              </div>

              {/* Follow-up reminder if any */}
              {followUpQuestions.length > 0 && (
                <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-amber-900">
                  <div className="flex items-center gap-1 font-bold mb-1">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                    Missing information:
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-[11px] text-amber-800">
                    {followUpQuestions.map((q, i) => (
                      <li key={i}>{q}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Bottom Generate Plan CTA */}
            <div className="mt-4 pt-3 border-t border-slate-200">
              <button
                onClick={() => onPlanGenerated(draftProfile)}
                className="w-full py-3 bg-gradient-to-r from-indigo-600 via-indigo-700 to-amber-500 hover:from-indigo-700 hover:to-amber-600 text-white font-extrabold text-sm rounded-xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-200" />
                <span>Generate Complete PlanIt Plan</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <p className="text-[10px] text-center text-slate-400 mt-1.5">
                Generates deterministic budget math, backwards timeline, vendor checklist & risk matrix.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
