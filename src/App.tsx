import { useState, useEffect } from "react";
import { Header } from "./components/Header";
import { DashboardView } from "./components/DashboardView";
import { IntakeChat } from "./components/IntakeChat";
import { BudgetView } from "./components/BudgetView";
import { TimelineView } from "./components/TimelineView";
import { VendorsView } from "./components/VendorsView";
import { IdeasView } from "./components/IdeasView";
import { InvitationsView } from "./components/InvitationsView";
import { RiskAdvisorView } from "./components/RiskAdvisorView";
import { CollaborationView } from "./components/CollaborationView";
import { BudgetOptimizerModal } from "./components/BudgetOptimizerModal";
import { NotificationCenter } from "./components/NotificationCenter";
import { ReplanModal } from "./components/ReplanModal";
import { PrintablePlanModal } from "./components/PrintablePlanModal";
import { FullEventPlan, EventProfile, BudgetCategory, Task, Expense, VendorItem, IdeaItem, RiskItem, InvitationItem, Collaborator } from "./types";
import { exportToICS, exportBudgetCSV, exportVendorsCSV } from "./lib/exportUtils";
import { eventApi } from "./client/services/api/event-api.js";
import { DemoUserProvider } from "./client/context/DemoUserContext.js";
import seedWeddingData from "../data/seed_wedding.json";

// Additional preset demo events for easy testing
const DEMO_EVENTS: FullEventPlan[] = [
  seedWeddingData as FullEventPlan,
  {
    profile: {
      id: "event-birthday-mum",
      title: "Arjun's 30th Rooftop Milestone",
      type: "birthday",
      date: "2026-11-20",
      city: "Mumbai",
      guest_count: 50,
      total_budget: 200000,
      currency: "INR",
      vibe_theme: "Sunset Rooftop Cocktails, Neon & Deep House",
      culture_tradition: "Contemporary",
      dietary_mix: "Gourmet Finger Foods & Signature Cocktail Bar",
      indoor_outdoor: "outdoor",
      priorities: ["Stellar DJ sound", "Artisanal cocktails", "Custom neon photo booth"],
      constraints: "Elevator access only up to 14th floor",
    },
    budget: {
      total_budget: 200000,
      currency: "INR",
      categories: [
        { id: "b-mum-1", name: "Venue & Space Rental", amount: 56000, percent: 28.0, reasoning: "Bandra rooftop lounge rental with private bar.", is_locked: true, source: "ai", edited_at: "2026-10-24T08:00:00Z" },
        { id: "b-mum-2", name: "Food, Cake & Drinks", amount: 70000, percent: 35.0, reasoning: "Sushi platters, sliders, mixologist and 2-tier custom cake.", is_locked: false, source: "ai", edited_at: "2026-10-24T08:00:00Z" },
        { id: "b-mum-3", name: "Themed Decor & Balloons", amount: 30000, percent: 15.0, reasoning: "Custom neon signage and chrome black/gold balloon garland.", is_locked: false, source: "ai", edited_at: "2026-10-24T08:00:00Z" },
        { id: "b-mum-4", name: "Entertainment & Games", amount: 20000, percent: 10.0, reasoning: "House DJ setup and party host.", is_locked: false, source: "ai", edited_at: "2026-10-24T08:00:00Z" },
        { id: "b-mum-5", name: "Photography & Reels", amount: 12000, percent: 6.0, reasoning: "Party content creator for Instagram reels.", is_locked: false, source: "ai", edited_at: "2026-10-24T08:00:00Z" },
        { id: "b-mum-6", name: "Favors & Return Gifts", amount: 8000, percent: 4.0, reasoning: "Custom engraved hip flasks.", is_locked: false, source: "ai", edited_at: "2026-10-24T08:00:00Z" },
        { id: "b-mum-7", name: "Contingency Buffer", amount: 4000, percent: 2.0, reasoning: "Bar overtime buffer.", is_locked: false, source: "ai", edited_at: "2026-10-24T08:00:00Z" },
      ],
      expenses: [
        { id: "e-mum-1", category_id: "b-mum-1", category_name: "Venue & Space Rental", vendor_name: "SkyLounge Bandra", amount: 25000, date: "2026-10-18", status: "paid", notes: "Booking token" },
      ],
    },
    timeline: {
      tasks: [
        { id: "t-mum-1", title: "Reserve Bandra Rooftop Lounge", due_date: "2026-10-25", phase: "1 month", status: "completed", assignee: "Host", linked_vendor: "Venue", priority: "high", notes: "Token deposit paid." },
        { id: "t-mum-2", title: "Order Custom Black & Gold 30th Birthday Cake", due_date: "2026-11-05", phase: "1 week", status: "pending", assignee: "Host", linked_vendor: "Bakery", priority: "high", notes: "Flavor: Belgian Dark Chocolate." },
        { id: "t-mum-3", title: "Send WhatsApp RSVP Link with Music Request Field", due_date: "2026-11-01", phase: "1 month", status: "in_progress", assignee: "Host", linked_vendor: "Invitations", priority: "high", notes: "Collect cocktail choices." },
      ],
      run_of_show: [
        { id: "ros-mum-1", time: "07:30 PM", title: "Rooftop Welcome Drinks & Sundowner", owner: "Mixologist", location: "Terrace Bar", notes: "Signature smoked whiskey cocktail." },
        { id: "ros-mum-2", time: "09:30 PM", title: "Cake Cutting Ceremony & Speeches", owner: "Friends & Family", location: "Neon Backdrop", notes: "Champagne toast." },
      ],
    },
    vendors: [
      { id: "v-mum-1", name: "SkyLounge Rooftop Bandra", category: "Venue & Space Rental", contact: "Manager (+91 98200 44556)", quote: 56000, advance_paid: 25000, balance: 31000, due_date: "2026-11-15", status: "booked", notes: "Private bar." },
    ],
    ideas: [
      { id: "idea-mum-1", category: "Entertainment & Music", title: "Live Vinyl Saxophone & DJ Set", description: "Saxophonist improvising live over deep house electronic beats during sunset hours.", cost_range: "₹18,000 - ₹25,000", effort_level: "Low", tags: ["Vibe", "Music", "Rooftop"], saved: true },
    ],
    risks: [
      { id: "risk-mum-1", title: "High Rooftop Wind Gusts", severity: "medium", likelihood: "medium", category: "Weather", why: "Evening coastal breeze can topple lightweight balloon pillars and paper tableware.", mitigation: "Anchor heavy brass bases on balloon stands and use weighted acrylic glassware.", backup_plan: "Move bar stations under the covered canopy pergola." },
    ],
    invitations: [
      { id: "inv-mum-1", type: "WhatsApp Invite", language: "English", tone: "Lighthearted & Joyful", content: "🥂 The 20s were fun, but the 30s are going to be legendary! 🥂\n\nJoin us for Arjun's 30th Birthday Sunset Soirée\n\n📅 Date: Friday, 20th November 2026\n📍 Venue: SkyLounge Rooftop, Bandra, Mumbai\n⏰ Time: 07:30 PM onwards\n\nDress code: Smart Chic & Dancing Shoes 🕺\nRSVP: +91 98200 44556", share_url: "https://wa.me/?text=" },
    ],
    collaborators: [
      { id: "c-mum-1", name: "Arjun (Host)", email: "arjun@example.com", role: "owner" },
      { id: "c-mum-2", name: "Riya (Co-host)", email: "riya@example.com", role: "editor" },
    ],
    activity_log: [
      { id: "act-mum-1", user: "Arjun", action: "created", detail: "Created 30th birthday blueprint", timestamp: "2026-10-18T10:00:00Z" },
    ],
  },
];

export default function App() {
  const [plans, setPlans] = useState<FullEventPlan[]>(DEMO_EVENTS);
  const [currentPlanId, setCurrentPlanId] = useState<string>(DEMO_EVENTS[0].profile.id);
  const [activeTab, setActiveTab] = useState<string>("dashboard");

  // Modals state
  const [showIntakeModal, setShowIntakeModal] = useState<boolean>(false);
  const [showReplanModal, setShowReplanModal] = useState<boolean>(false);
  const [showPrintModal, setShowPrintModal] = useState<boolean>(false);
  const [showNotificationModal, setShowNotificationModal] = useState<boolean>(false);
  const [showOptimizerModal, setShowOptimizerModal] = useState<boolean>(false);
  const [_showAddExpenseDirectly, _setShowAddExpenseDirectly] = useState<boolean>(false);

  // Active plan
  const activePlan = plans.find((p) => p.profile.id === currentPlanId) || plans[0];

  const updateCurrentPlan = (updater: (prev: FullEventPlan) => FullEventPlan) => {
    setPlans((prevPlans) =>
      prevPlans.map((p) => (p.profile.id === currentPlanId ? updater(p) : p))
    );
  };

  // Sync with seeded backend in-memory repository on mount
  useEffect(() => {
    eventApi.getAllEvents()
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setPlans(data);
          setCurrentPlanId(data[0].profile.id);
        }
      })
      .catch(() => {
        // Keeps DEMO_EVENTS on any fetch failure
      });
  }, []);

  // 1. Intake creation of a completely new plan
  const handleIntakeGenerated = async (newProfile: EventProfile) => {
    setShowIntakeModal(false);

    try {
      const [budgetData, timelineData, riskData] = await Promise.all([
        eventApi.generateBudget(newProfile).catch(() => ({ categories: [] })),
        eventApi.generateTimeline(newProfile).catch(() => ({ tasks: [], run_of_show: [] })),
        eventApi.analyzeRisks(newProfile).catch(() => ({ risks: [] })),
      ]);

      const newFullPlan: FullEventPlan = {
        profile: newProfile,
        budget: {
          total_budget: newProfile.total_budget,
          currency: newProfile.currency || "INR",
          categories: budgetData.categories || [],
          expenses: [],
        },
        timeline: {
          tasks: timelineData.tasks || [],
          run_of_show: timelineData.run_of_show || [],
        },
        vendors: [],
        ideas: [
          {
            id: `idea-${Date.now()}-1`,
            category: "Decor & Ambiance",
            title: "Heritage Marigold & Ambient Lanterns",
            description: "Warm festive entryway styling crafted specifically for " + newProfile.city,
            cost_range: "₹15,000 - ₹25,000",
            effort_level: "Low",
            tags: ["Traditional", "Aesthetic"],
            saved: true,
          },
        ],
        risks: riskData.risks || [],
        invitations: [
          {
            id: `inv-${Date.now()}-1`,
            type: "WhatsApp Invite",
            language: "English",
            tone: "Warm & Traditional",
            content: `🌸 Save the Date! 🌸\n\nJoin us for ${newProfile.title} in ${newProfile.city}!\n\n📅 Date: ${newProfile.date}\n👥 Guests: ${newProfile.guest_count}\n\nRSVP to confirm your presence!`,
            share_url: `https://wa.me/?text=${encodeURIComponent(newProfile.title)}`,
          },
        ],
        collaborators: [
          { id: `c-${Date.now()}`, name: "Host Organizer", email: "host@example.com", role: "owner" },
        ],
        activity_log: [
          { id: `act-${Date.now()}`, user: "PlanIt AI", action: "generated", detail: "Generated custom event plan", timestamp: new Date().toISOString() },
        ],
      };

      setPlans((prev) => [newFullPlan, ...prev]);
      setCurrentPlanId(newFullPlan.profile.id);
      setActiveTab("dashboard");
    } catch (e) {
      console.warn("Error bootstrapping new plan from API:", e);
    }
  };

  // 2. Budget Category updates
  const handleUpdateCategories = (categories: BudgetCategory[]) => {
    updateCurrentPlan((prev) => ({
      ...prev,
      budget: { ...prev.budget, categories },
      activity_log: [
        {
          id: `act-${Date.now()}`,
          user: "Host",
          action: "rebalanced",
          detail: "Rebalanced budget categories",
          timestamp: new Date().toISOString(),
        },
        ...prev.activity_log,
      ],
    }));
  };

  // 3. Expenses updates
  const handleAddExpense = (expense: Expense) => {
    updateCurrentPlan((prev) => ({
      ...prev,
      budget: {
        ...prev.budget,
        expenses: [expense, ...prev.budget.expenses],
      },
      activity_log: [
        {
          id: `act-${Date.now()}`,
          user: "Host",
          action: "added expense",
          detail: `₹${expense.amount.toLocaleString("en-IN")} for ${expense.vendor_name}`,
          timestamp: new Date().toISOString(),
        },
        ...prev.activity_log,
      ],
    }));
  };

  const handleDeleteExpense = (expenseId: string) => {
    updateCurrentPlan((prev) => ({
      ...prev,
      budget: {
        ...prev.budget,
        expenses: prev.budget.expenses.filter((e) => e.id !== expenseId),
      },
    }));
  };

  // 4. Tasks & Run of Show
  const handleUpdateTasks = (tasks: Task[]) => {
    updateCurrentPlan((prev) => ({
      ...prev,
      timeline: { ...prev.timeline, tasks },
    }));
  };

  const handleToggleTaskStatus = (taskId: string) => {
    updateCurrentPlan((prev) => {
      const updatedTasks = prev.timeline.tasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              status: t.status === "completed" ? ("pending" as const) : ("completed" as const),
              edited_at: new Date().toISOString(),
            }
          : t
      );
      return {
        ...prev,
        timeline: { ...prev.timeline, tasks: updatedTasks },
      };
    });
  };

  const handleUpdateRunOfShow = (runOfShow: Array<{
    id?: string;
    time: string;
    title: string;
    owner: string;
    location: string;
    notes: string;
  }>) => {
    const itemsWithIds = runOfShow.map((item, idx) => ({
      ...item,
      id: item.id || `ros-${Date.now()}-${idx}`,
    }));
    updateCurrentPlan((prev) => ({
      ...prev,
      timeline: { ...prev.timeline, run_of_show: itemsWithIds },
    }));
  };

  // 5. Vendors
  const handleUpdateVendors = (vendors: VendorItem[]) => {
    updateCurrentPlan((prev) => ({
      ...prev,
      vendors,
    }));
  };

  // 6. Ideas
  const handleUpdateIdeas = (ideas: IdeaItem[]) => {
    updateCurrentPlan((prev) => ({
      ...prev,
      ideas,
    }));
  };

  // 7. Invitations
  const handleUpdateInvitations = (invitations: InvitationItem[]) => {
    updateCurrentPlan((prev) => ({
      ...prev,
      invitations,
    }));
  };

  // 8. Risks
  const handleUpdateRisks = (risks: RiskItem[]) => {
    updateCurrentPlan((prev) => ({
      ...prev,
      risks,
    }));
  };

  // 9. Collaborators
  const handleAddCollaborator = (collab: Collaborator) => {
    updateCurrentPlan((prev) => ({
      ...prev,
      collaborators: [...prev.collaborators, collab],
      activity_log: [
        {
          id: `act-${Date.now()}`,
          user: "Owner",
          action: "invited",
          detail: `Invited ${collab.name} as ${collab.role}`,
          timestamp: new Date().toISOString(),
        },
        ...prev.activity_log,
      ],
    }));
  };

  const handleRemoveCollaborator = (id: string) => {
    updateCurrentPlan((prev) => ({
      ...prev,
      collaborators: prev.collaborators.filter((c) => c.id !== id),
    }));
  };

  // 10. Replan Apply Pipeline
  const handleApplyReplan = (
    updatedProfile: EventProfile,
    updatedCategories: BudgetCategory[],
    updatedTasks: Task[]
  ) => {
    updateCurrentPlan((prev) => ({
      ...prev,
      profile: updatedProfile,
      budget: {
        ...prev.budget,
        total_budget: updatedProfile.total_budget,
        categories: updatedCategories,
      },
      timeline: {
        ...prev.timeline,
        tasks: updatedTasks,
      },
      activity_log: [
        {
          id: `act-${Date.now()}`,
          user: "Host",
          action: "replanned event",
          detail: `Updated date to ${updatedProfile.date} & budget to ₹${updatedProfile.total_budget.toLocaleString("en-IN")}`,
          timestamp: new Date().toISOString(),
        },
        ...prev.activity_log,
      ],
    }));
  };

  const handleResetDatabase = async () => {
    try {
      await eventApi.resetDatabase();
      const fresh = await eventApi.getAllEvents();
      if (Array.isArray(fresh) && fresh.length > 0) {
        setPlans(fresh);
        setCurrentPlanId(fresh[0].profile.id);
      } else {
        setPlans(DEMO_EVENTS);
        setCurrentPlanId(DEMO_EVENTS[0].profile.id);
      }
    } catch {
      setPlans(DEMO_EVENTS);
      setCurrentPlanId(DEMO_EVENTS[0].profile.id);
    }
  };

  return (
    <DemoUserProvider>
      <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Top Header */}
      <Header
        currentProfile={activePlan.profile}
        eventsList={plans.map((p) => p.profile)}
        onSelectEvent={(id) => setCurrentPlanId(id)}
        onOpenNewEventModal={() => setShowIntakeModal(true)}
        onOpenReplanModal={() => setShowReplanModal(true)}
        onOpenPrintModal={() => setShowPrintModal(true)}
        onOpenNotificationModal={() => setShowNotificationModal(true)}
        onResetDatabase={handleResetDatabase}
        unreadNotificationsCount={2}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Tab Views */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 w-full">
        {activeTab === "dashboard" && (
          <DashboardView
            plan={activePlan}
            onNavigateTab={setActiveTab}
            onToggleTaskStatus={handleToggleTaskStatus}
            onOpenAddExpenseModal={() => {
              setActiveTab("budget");
            }}
          />
        )}

        {activeTab === "budget" && (
          <BudgetView
            categories={activePlan.budget.categories}
            expenses={activePlan.budget.expenses}
            profile={activePlan.profile}
            onUpdateCategories={handleUpdateCategories}
            onAddExpense={handleAddExpense}
            onDeleteExpense={handleDeleteExpense}
            onOpenOptimizerModal={() => setShowOptimizerModal(true)}
            onExportCSV={() => exportBudgetCSV(activePlan)}
          />
        )}

        {activeTab === "timeline" && (
          <TimelineView
            tasks={activePlan.timeline.tasks}
            runOfShow={activePlan.timeline.run_of_show}
            profile={activePlan.profile}
            onUpdateTasks={handleUpdateTasks}
            onUpdateRunOfShow={handleUpdateRunOfShow}
            onExportICS={() => exportToICS(activePlan)}
            onOpenReplanModal={() => setShowReplanModal(true)}
          />
        )}

        {activeTab === "vendors" && (
          <VendorsView
            vendors={activePlan.vendors}
            profile={activePlan.profile}
            onUpdateVendors={handleUpdateVendors}
            onExportCSV={() => exportVendorsCSV(activePlan)}
          />
        )}

        {activeTab === "ideas" && (
          <IdeasView
            ideas={activePlan.ideas}
            profile={activePlan.profile}
            onUpdateIdeas={handleUpdateIdeas}
          />
        )}

        {activeTab === "invitations" && (
          <InvitationsView
            invitations={activePlan.invitations}
            profile={activePlan.profile}
            onUpdateInvitations={handleUpdateInvitations}
          />
        )}

        {activeTab === "risks" && (
          <RiskAdvisorView
            risks={activePlan.risks}
            profile={activePlan.profile}
            totalBudget={activePlan.budget.total_budget}
            onUpdateRisks={handleUpdateRisks}
          />
        )}

        {activeTab === "collaborators" && (
          <CollaborationView
            collaborators={activePlan.collaborators}
            activityLog={activePlan.activity_log}
            onAddCollaborator={handleAddCollaborator}
            onRemoveCollaborator={handleRemoveCollaborator}
          />
        )}
      </main>

      {/* MODALS */}

      {/* 1. Conversational Intake Modal */}
      {showIntakeModal && (
        <IntakeChat
          onPlanGenerated={handleIntakeGenerated}
          onCancel={() => setShowIntakeModal(false)}
        />
      )}

      {/* 2. Budget Optimizer Modal */}
      {showOptimizerModal && (
        <BudgetOptimizerModal
          categories={activePlan.budget.categories}
          profile={activePlan.profile}
          onApplyScenario={handleUpdateCategories}
          onClose={() => setShowOptimizerModal(false)}
        />
      )}

      {/* 3. Replan Modal */}
      {showReplanModal && (
        <ReplanModal
          plan={activePlan}
          onApplyReplan={handleApplyReplan}
          onClose={() => setShowReplanModal(false)}
        />
      )}

      {/* 4. Notification Center Slide-out */}
      {showNotificationModal && (
        <NotificationCenter
          plan={activePlan}
          onClose={() => setShowNotificationModal(false)}
          onMarkTaskDone={handleToggleTaskStatus}
        />
      )}

      {/* 5. Printable / PDF Dossier Modal */}
      {showPrintModal && (
        <PrintablePlanModal
          plan={activePlan}
          onClose={() => setShowPrintModal(false)}
        />
      )}
      </div>
    </DemoUserProvider>
  );
}
