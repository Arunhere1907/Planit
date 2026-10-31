import React, { useState, useEffect } from "react";
import {
  Store,
  Phone,
  Star,
  MapPin,
  ExternalLink,
  Plus,
  Scale,
  Sparkles,
  FileDown,
  Search,
  CheckCircle2,
  Trash2,
  Loader2,
} from "lucide-react";
import type { VendorItem, VendorPlace, VendorStatus, EventProfile } from "../types";
import { formatExactINR } from "../lib/formatters";

interface VendorsViewProps {
  vendors: VendorItem[];
  profile: EventProfile;
  onUpdateVendors: (vendors: VendorItem[]) => void;
  onExportCSV: () => void;
}

export const VendorsView: React.FC<VendorsViewProps> = ({
  vendors,
  profile,
  onUpdateVendors,
  onExportCSV,
}) => {
  const [activeTab, setActiveTab] = useState<"checklist" | "discovery">("checklist");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Vendor Discovery State
  const [discoverCategory, setDiscoverCategory] = useState<string>("Catering & Beverages");
  const [discoverCity, setDiscoverCity] = useState<string>(profile.city || "Ahmedabad");
  const [discoveredPlaces, setDiscoveredPlaces] = useState<VendorPlace[]>([]);
  const [isSearchingPlaces, setIsSearchingPlaces] = useState(false);
  const [placesSource, setPlacesSource] = useState<string>("");

  // Questions Modal State
  const [showQuestionsModal, setShowQuestionsModal] = useState(false);
  const [questionsCategory, setQuestionsCategory] = useState("");
  const [generatedQuestions, setGeneratedQuestions] = useState<Array<{
    category: string;
    question: string;
    why_it_matters: string;
  }>>([]);
  const [loadingQuestions, setLoadingQuestions] = useState(false);

  // Compare Modal State
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [compareSelectedIds, setCompareSelectedIds] = useState<string[]>([]);
  const [compareResult, setCompareResult] = useState<{
    comparison_table: Array<{
      vendor_name: string;
      estimated_price: string;
      pros: string[];
      cons: string[];
      score: number;
    }>;
    overall_recommendation: string;
    negotiation_leverage: string;
  } | null>(null);
  const [loadingCompare, setLoadingCompare] = useState(false);

  // New Vendor Form
  const [showAddVendor, setShowAddVendor] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("Catering & Beverages");
  const [newContact, setNewContact] = useState("");
  const [newQuote, setNewQuote] = useState<number>(50000);
  const [newAdvance, setNewAdvance] = useState<number>(10000);
  const [newDueDate, setNewDueDate] = useState(new Date().toISOString().split("T")[0]);
  const [newStatus, setNewStatus] = useState<VendorStatus>("contacted");
  const [newNotes, setNewNotes] = useState("");

  const categories = [
    "Venue & Facilities",
    "Catering & Beverages",
    "Decor & Floral Design",
    "Photography & Video",
    "Music, DJ & Entertainment",
    "Attire, Hair & Makeup",
    "Invitations & Stationery",
    "Transport & Logistics",
  ];

  // Fetch initial discovery vendors
  useEffect(() => {
    handleSearchVendors();
  }, [discoverCategory]);

  const handleSearchVendors = async () => {
    setIsSearchingPlaces(true);
    try {
      const res = await fetch("/api/vendors/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: discoverCategory,
          city: discoverCity,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setDiscoveredPlaces(data.vendors || []);
        setPlacesSource(data.source);
      }
    } catch (e) {
      console.warn("Error fetching places:", e);
    } finally {
      setIsSearchingPlaces(false);
    }
  };

  const handleAddDiscoveredToChecklist = (place: VendorPlace) => {
    const existing = vendors.find((v) => v.place_id === place.id || v.name === place.name);
    if (existing) {
      alert(`${place.name} is already in your vendor checklist!`);
      return;
    }

    const newVendor: VendorItem = {
      id: `v-disc-${Date.now()}`,
      name: place.name,
      category: place.category,
      contact: `${place.address} (${place.phone})`,
      quote: place.approx_cost || 100000,
      advance_paid: 0,
      balance: place.approx_cost || 100000,
      due_date: new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0],
      status: "contacted",
      place_id: place.id,
      notes: `Imported from Google Places. Rating: ${place.rating} (${place.user_ratings_total} reviews).`,
      source: "user",
      edited_at: new Date().toISOString(),
    };

    onUpdateVendors([...vendors, newVendor]);
    setActiveTab("checklist");
  };

  const handleStatusChange = (vendorId: string, status: VendorStatus) => {
    const updated = vendors.map((v) => {
      if (v.id === vendorId) {
        return {
          ...v,
          status,
          edited_at: new Date().toISOString(),
          source: "user" as const,
        };
      }
      return v;
    });
    onUpdateVendors(updated);
  };

  const handleDeleteVendor = (id: string) => {
    onUpdateVendors(vendors.filter((v) => v.id !== id));
  };

  // Trigger Questions Generator
  const handleOpenQuestions = async (category: string) => {
    setQuestionsCategory(category);
    setShowQuestionsModal(true);
    setLoadingQuestions(true);
    try {
      const res = await fetch("/api/vendors/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, profile }),
      });
      if (res.ok) {
        const data = await res.json();
        setGeneratedQuestions(data.questions || []);
      }
    } catch (e) {
      console.warn("Failed to generate questions:", e);
    } finally {
      setLoadingQuestions(false);
    }
  };

  // Trigger Compare Vendors
  const handleStartCompare = async () => {
    if (compareSelectedIds.length < 2) {
      alert("Please select at least 2 vendors to compare side-by-side.");
      return;
    }

    setShowCompareModal(true);
    setLoadingCompare(true);

    const selectedVendors = vendors.filter((v) => compareSelectedIds.includes(v.id));

    try {
      const res = await fetch("/api/vendors/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: selectedVendors[0]?.category || "General",
          vendors: selectedVendors,
          profile,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setCompareResult(data);
      }
    } catch (e) {
      console.warn("Compare failed:", e);
    } finally {
      setLoadingCompare(false);
    }
  };

  const handleSaveCustomVendor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName) return;

    const newV: VendorItem = {
      id: `v-custom-${Date.now()}`,
      name: newName,
      category: newCategory,
      contact: newContact,
      quote: newQuote,
      advance_paid: newAdvance,
      balance: Math.max(0, newQuote - newAdvance),
      due_date: newDueDate,
      status: newStatus,
      notes: newNotes,
      source: "user",
      edited_at: new Date().toISOString(),
    };

    onUpdateVendors([...vendors, newV]);
    setShowAddVendor(false);
    setNewName("");
    setNewContact("");
    setNewNotes("");
  };

  const filteredVendors = vendors.filter((v) => {
    if (categoryFilter !== "all" && v.category !== categoryFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Main heading for vendors view */}
      <h1 className="sr-only" tabIndex={-1}>
        Vendors and Places - {profile.title}
      </h1>
      
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Vendors & Local Discovery</h2>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              Google Maps & Places Integrated
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage your pipeline status, generate sharp interview questions, compare quotes, and discover top-rated local services.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition-colors shadow-2xs"
          >
            <FileDown className="w-4 h-4 text-slate-500" />
            <span>Export CSV</span>
          </button>

          {compareSelectedIds.length >= 2 && (
            <button
              onClick={handleStartCompare}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-amber-900 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-xl transition-colors animate-pulse"
            >
              <Scale className="w-4 h-4 text-amber-600" />
              <span>Compare Selected ({compareSelectedIds.length})</span>
            </button>
          )}

          <button
            onClick={() => setShowAddVendor(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Vendor</span>
          </button>
        </div>
      </div>

      {/* Tabs: Checklist vs Google Maps Discovery */}
      <div className="flex border-b border-slate-200 pb-2">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("checklist")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "checklist"
                ? "bg-slate-900 text-white shadow-2xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <Store className="w-4 h-4" />
            <span>My Vendor Checklist ({vendors.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("discovery")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === "discovery"
                ? "bg-rose-600 text-white shadow-2xs"
                : "text-rose-700 bg-rose-50 hover:bg-rose-100"
            }`}
          >
            <MapPin className="w-4 h-4" />
            <span>Discover Local Vendors (Places API)</span>
          </button>
        </div>
      </div>

      {/* TAB 1: MY VENDOR CHECKLIST */}
      {activeTab === "checklist" && (
        <div className="space-y-4">
          {/* Category filter pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
            <button
              onClick={() => setCategoryFilter("all")}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-colors whitespace-nowrap ${
                categoryFilter === "all"
                  ? "bg-rose-50 text-rose-700 border border-rose-200"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              All Categories
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-colors whitespace-nowrap ${
                  categoryFilter === cat
                    ? "bg-rose-50 text-rose-700 border border-rose-200"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Vendors Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredVendors.map((vendor) => {
              const isSelectedForCompare = compareSelectedIds.includes(vendor.id);

              return (
                <div
                  key={vendor.id}
                  className={`bg-white rounded-2xl border p-5 shadow-2xs hover:shadow-xs transition-all space-y-3 ${
                    isSelectedForCompare ? "border-amber-400 ring-2 ring-amber-100" : "border-slate-200"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          {vendor.category}
                        </span>
                        {vendor.place_id && (
                          <span className="text-[10px] text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded font-semibold">
                            Google Verified
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-extrabold text-slate-900 tracking-tight">{vendor.name}</h3>
                      <div className="text-xs text-slate-500 flex items-center gap-1.5">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{vendor.contact || "No contact logged"}</span>
                      </div>
                    </div>

                    {/* Compare Checkbox & Delete */}
                    <div className="flex items-center gap-2">
                      <label
                        className="text-[11px] font-semibold text-slate-600 flex items-center gap-1 cursor-pointer bg-slate-50 px-2 py-1 rounded-lg border border-slate-200"
                        title="Select to compare"
                      >
                        <input
                          type="checkbox"
                          checked={isSelectedForCompare}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setCompareSelectedIds([...compareSelectedIds, vendor.id]);
                            } else {
                              setCompareSelectedIds(compareSelectedIds.filter((id) => id !== vendor.id));
                            }
                          }}
                          className="rounded text-amber-600 focus:ring-amber-500"
                        />
                        <span>Compare</span>
                      </label>

                      <button
                        onClick={() => handleDeleteVendor(vendor.id)}
                        className="text-slate-400 hover:text-rose-600 p-1"
                        title="Remove vendor"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Financial Details */}
                  <div className="grid grid-cols-3 gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-center">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold">Total Quote</span>
                      <div className="text-xs font-bold text-slate-900 font-mono">
                        {formatExactINR(vendor.quote)}
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold">Advance Paid</span>
                      <div className="text-xs font-bold text-emerald-600 font-mono">
                        {formatExactINR(vendor.advance_paid)}
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-bold">Balance Due</span>
                      <div className="text-xs font-bold text-rose-600 font-mono">
                        {formatExactINR(vendor.balance)}
                      </div>
                    </div>
                  </div>

                  {/* Status Pipeline Dropdown */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-600">Status:</span>
                      <select
                        value={vendor.status}
                        onChange={(e) => handleStatusChange(vendor.id, e.target.value as VendorStatus)}
                        className="text-xs font-bold px-2 py-1 rounded-lg border border-slate-300 bg-white"
                      >
                        <option value="not_started">Not Started</option>
                        <option value="contacted">Contacted</option>
                        <option value="quote_received">Quote Received</option>
                        <option value="booked">Booked</option>
                        <option value="paid">Fully Paid</option>
                      </select>
                    </div>

                    {/* Questions Generator Button */}
                    <button
                      onClick={() => handleOpenQuestions(vendor.category)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg transition-colors"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Interview Questions</span>
                    </button>
                  </div>

                  {vendor.notes && (
                    <div className="text-[11px] text-slate-500 bg-amber-50/60 p-2 rounded-lg border border-amber-100">
                      <strong>Notes:</strong> {vendor.notes}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: LOCAL DISCOVERY VIA GOOGLE MAPS / PLACES API */}
      {activeTab === "discovery" && (
        <div className="space-y-6">
          {/* Search Controls */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm">
              <span className="font-bold text-slate-700">Category:</span>
              <select
                value={discoverCategory}
                onChange={(e) => setDiscoverCategory(e.target.value)}
                className="bg-slate-50 border border-slate-300 font-semibold rounded-xl px-3 py-1.5 text-xs text-slate-900"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>

              <span className="font-bold text-slate-700 ml-2">City:</span>
              <input
                type="text"
                value={discoverCity}
                onChange={(e) => setDiscoverCity(e.target.value)}
                placeholder="City"
                className="bg-slate-50 border border-slate-300 font-semibold rounded-xl px-3 py-1 text-xs text-slate-900 w-32"
              />

              <button
                onClick={handleSearchVendors}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs flex items-center gap-1 shadow-2xs transition-colors"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Search</span>
              </button>
            </div>

            <div className="text-[11px] font-semibold text-slate-500">
              {placesSource === "google_places_api" ? (
                <span className="text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Live Google Places (New) API
                </span>
              ) : (
                <span className="text-slate-500">Curated Local Reference Dataset</span>
              )}
            </div>
          </div>

          {/* Results Grid */}
          {isSearchingPlaces ? (
            <div className="py-16 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
              <Loader2 className="w-7 h-7 animate-spin text-rose-500" />
              <span>Fetching verified places, ratings and client reviews...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {discoveredPlaces.map((place) => (
                <div
                  key={place.id}
                  className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs hover:shadow-md transition-shadow flex flex-col justify-between"
                >
                  <div>
                    {/* Place Photo */}
                    <div className="h-44 w-full bg-slate-100 relative overflow-hidden">
                      <img
                        loading="lazy"
                        src={place.image}
                        alt={place.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute top-2.5 right-2.5 bg-white/90 backdrop-blur-xs px-2 py-0.5 rounded-full text-xs font-bold text-amber-700 flex items-center gap-1 shadow-xs">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <span>{place.rating}</span>
                        <span className="text-[10px] text-slate-400">({place.user_ratings_total})</span>
                      </div>
                      <div className="absolute bottom-2.5 left-2.5 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-md">
                        {place.area}
                      </div>
                    </div>

                    <div className="p-4 space-y-2.5">
                      <h4 className="font-extrabold text-sm text-slate-900 leading-snug">{place.name}</h4>
                      <p className="text-xs text-slate-500 line-clamp-2">{place.address}</p>

                      {place.phone && (
                        <div className="text-xs font-medium text-slate-700 flex items-center gap-1.5">
                          <Phone className="w-3 h-3 text-slate-400" /> {place.phone}
                        </div>
                      )}

                      {/* Top Review Highlight */}
                      {place.reviews && place.reviews.length > 0 && (
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs text-slate-600 italic">
                          "{place.reviews[0].text.slice(0, 110)}..."
                          <div className="text-[10px] text-slate-400 not-italic font-semibold mt-1">
                            — {place.reviews[0].author}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Bottom CTA */}
                  <div className="p-4 pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                    <a
                      href={place.google_maps_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1"
                    >
                      <span>Google Maps</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>

                    <button
                      onClick={() => handleAddDiscoveredToChecklist(place)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-2xs transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add to Checklist</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* QUESTIONS TO ASK MODAL */}
      {showQuestionsModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-xl w-full p-6 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-rose-500 rounded-xl text-white">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Questions to Ask: {questionsCategory}
                  </h3>
                  <p className="text-xs text-slate-500">Sharp negotiation & logistical verification checklist</p>
                </div>
              </div>
              <button
                onClick={() => setShowQuestionsModal(false)}
                className="text-slate-400 hover:text-slate-700 text-xs font-bold"
              >
                Close
              </button>
            </div>

            <div className="my-4 max-h-[60vh] overflow-y-auto space-y-3 pr-1">
              {loadingQuestions ? (
                <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-rose-500" />
                  <span>Generating tailored questions for {questionsCategory}...</span>
                </div>
              ) : (
                generatedQuestions.map((q, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded">
                        {q.category}
                      </span>
                    </div>
                    <div className="text-xs sm:text-sm font-bold text-slate-900">{q.question}</div>
                    <div className="text-[11px] text-slate-500">
                      <strong>Why it matters:</strong> {q.why_it_matters}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="text-right pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowQuestionsModal(false)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VENDOR COMPARISON MODAL */}
      {showCompareModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-3xl w-full p-6 my-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <Scale className="w-5 h-5 text-amber-600" />
                <h3 className="text-base font-bold text-slate-900">Side-by-Side Vendor Comparison</h3>
              </div>
              <button
                onClick={() => setShowCompareModal(false)}
                className="text-slate-400 hover:text-slate-700 text-xs font-bold"
              >
                Close
              </button>
            </div>

            <div className="my-4 max-h-[65vh] overflow-y-auto space-y-4">
              {loadingCompare ? (
                <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
                  <span>Synthesizing quotes, reviews, and host priorities...</span>
                </div>
              ) : compareResult ? (
                <>
                  {/* Recommendation Card */}
                  <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 space-y-1.5">
                    <div className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-600" />
                      AI Recommendation:
                    </div>
                    <p className="text-xs text-amber-950 leading-relaxed font-medium">
                      {compareResult.overall_recommendation}
                    </p>
                    <div className="text-[11px] text-amber-800 pt-1">
                      <strong>Negotiation Leverage:</strong> {compareResult.negotiation_leverage}
                    </div>
                  </div>

                  {/* Comparison Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {compareResult.comparison_table?.map((item, i: number) => (
                      <div key={i} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="font-bold text-xs text-slate-900">{item.vendor_name}</h4>
                          <span className="font-mono text-xs font-black text-rose-600">{item.estimated_price}</span>
                        </div>

                        <div className="space-y-1">
                          <div className="text-[11px] font-bold text-emerald-700">Pros:</div>
                          <ul className="text-[11px] text-slate-600 space-y-0.5 list-disc list-inside">
                            {item.pros?.map((p: string, pIdx: number) => (
                              <li key={pIdx}>{p}</li>
                            ))}
                          </ul>
                        </div>

                        <div className="space-y-1">
                          <div className="text-[11px] font-bold text-rose-700">Cons:</div>
                          <ul className="text-[11px] text-slate-600 space-y-0.5 list-disc list-inside">
                            {item.cons?.map((c: string, cIdx: number) => (
                              <li key={cIdx}>{c}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : null}
            </div>

            <div className="text-right pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowCompareModal(false)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
              >
                Close Comparison
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD VENDOR MODAL */}
      {showAddVendor && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6">
            <h3 className="text-base font-bold text-slate-900 mb-4">Add Vendor to Checklist</h3>
            <form onSubmit={handleSaveCustomVendor} className="space-y-3.5 text-xs sm:text-sm">
              <div>
                <label htmlFor="vendor-name" className="block text-xs font-bold text-slate-700 mb-1">Vendor Name</label>
                <input
                  id="vendor-name"
                  type="text"
                  required
                  placeholder="e.g. Drishti Candid Photography"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-medium"
                />
              </div>

              <div>
                <label htmlFor="vendor-category" className="block text-xs font-bold text-slate-700 mb-1">Category</label>
                <select
                  id="vendor-category"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-medium"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="vendor-contact" className="block text-xs font-bold text-slate-700 mb-1">Contact / Phone / Email</label>
                <input
                  id="vendor-contact"
                  type="text"
                  placeholder="+91 98980 00000"
                  value={newContact}
                  onChange={(e) => setNewContact(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="vendor-quote" className="block text-xs font-bold text-slate-700 mb-1">Quote (INR)</label>
                  <input
                    id="vendor-quote"
                    type="number"
                    step="1000"
                    required
                    value={newQuote}
                    onChange={(e) => setNewQuote(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold"
                  />
                </div>

                <div>
                  <label htmlFor="vendor-advance" className="block text-xs font-bold text-slate-700 mb-1">Advance Paid (INR)</label>
                  <input
                    id="vendor-advance"
                    type="number"
                    step="1000"
                    required
                    value={newAdvance}
                    onChange={(e) => setNewAdvance(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="vendor-due-date" className="block text-xs font-bold text-slate-700 mb-1">Due Date</label>
                  <input
                    id="vendor-due-date"
                    type="date"
                    required
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-medium"
                  />
                </div>

                <div>
                  <label htmlFor="vendor-status" className="block text-xs font-bold text-slate-700 mb-1">Initial Status</label>
                  <select
                    id="vendor-status"
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as VendorStatus)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-medium"
                  >
                    <option value="not_started">Not Started</option>
                    <option value="contacted">Contacted</option>
                    <option value="quote_received">Quote Received</option>
                    <option value="booked">Booked</option>
                    <option value="paid">Paid</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="vendor-notes" className="block text-xs font-bold text-slate-700 mb-1">Notes</label>
                <input
                  id="vendor-notes"
                  type="text"
                  placeholder="e.g. Includes drone aerial coverage and leather album"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddVendor(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-xs"
                >
                  Save Vendor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
