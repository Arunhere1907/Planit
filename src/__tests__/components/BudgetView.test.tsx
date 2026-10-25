import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BudgetView } from '../../components/BudgetView.js';
import type { BudgetCategory, Expense, EventProfile } from '../../shared/types/index.js';

describe('BudgetView Component', () => {
  const mockProfile: EventProfile = {
    id: 'event-1',
    type: 'wedding',
    title: 'Test Wedding',
    date: '2027-06-15',
    city: 'Mumbai',
    guest_count: 150,
    total_budget: 100000,
    currency: 'INR',
    vibe_theme: 'Traditional',
    culture_tradition: 'Indian',
    dietary_mix: 'Vegetarian',
    indoor_outdoor: 'outdoor',
    priorities: [],
    constraints: '',
  };

  const mockCategories: BudgetCategory[] = [
    {
      id: 'cat-1',
      name: 'Venue',
      amount: 50000,
      percent: 50,
      reasoning: 'Main hall',
      is_locked: false,
      source: 'ai',
      edited_at: '2026-01-01',
    },
    {
      id: 'cat-2',
      name: 'Catering',
      amount: 50000,
      percent: 50,
      reasoning: 'Food',
      is_locked: false,
      source: 'ai',
      edited_at: '2026-01-01',
    },
  ];

  const mockCallbacks = {
    onUpdateCategories: vi.fn(),
    onAddExpense: vi.fn(),
    onDeleteExpense: vi.fn(),
    onOpenOptimizerModal: vi.fn(),
    onExportCSV: vi.fn(),
  };

  it('should render category allocation by default', () => {
    render(
      <BudgetView
        categories={mockCategories}
        expenses={[]}
        profile={mockProfile}
        {...mockCallbacks}
      />
    );

    expect(screen.getByText(/AI Budget Planner/i)).toBeInTheDocument();
    expect(screen.getByText('Venue')).toBeInTheDocument();
    expect(screen.getByText('Catering')).toBeInTheDocument();
  });

  it('should show overspend warning when total expenses exceed budget', () => {
    const expenses: Expense[] = [
      {
        id: 'exp-1',
        category_id: 'cat-1',
        category_name: 'Venue',
        vendor_name: 'Test Vendor',
        amount: 120000, // Over budget
        date: '2026-12-01',
        status: 'paid',
      },
    ];

    render(
      <BudgetView
        categories={mockCategories}
        expenses={expenses}
        profile={mockProfile}
        {...mockCallbacks}
      />
    );

    expect(screen.getByText(/Budget Exceeded!/i)).toBeInTheDocument();
    expect(screen.getByText(/have exceeded your budget/i)).toBeInTheDocument();
  });

  it('should show amber warning when approaching budget limit (>=90%)', () => {
    const expenses: Expense[] = [
      {
        id: 'exp-1',
        category_id: 'cat-1',
        category_name: 'Venue',
        vendor_name: 'Test Vendor',
        amount: 92000, // 92% of budget
        date: '2026-12-01',
        status: 'paid',
      },
    ];

    render(
      <BudgetView
        categories={mockCategories}
        expenses={expenses}
        profile={mockProfile}
        {...mockCallbacks}
      />
    );

    expect(screen.getByText(/Approaching Budget Limit/i)).toBeInTheDocument();
  });

  it('should not show warnings when under 90% of budget', () => {
    const expenses: Expense[] = [
      {
        id: 'exp-1',
        category_id: 'cat-1',
        category_name: 'Venue',
        vendor_name: 'Test Vendor',
        amount: 50000, // 50% of budget
        date: '2026-12-01',
        status: 'paid',
      },
    ];

    render(
      <BudgetView
        categories={mockCategories}
        expenses={expenses}
        profile={mockProfile}
        {...mockCallbacks}
      />
    );

    expect(screen.queryByText(/Budget Exceeded!/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Approaching Budget Limit/i)).not.toBeInTheDocument();
  });

  it('should display correct total allocated amount', () => {
    render(
      <BudgetView
        categories={mockCategories}
        expenses={[]}
        profile={mockProfile}
        {...mockCallbacks}
      />
    );

    expect(screen.getAllByText(/₹1,00,000/i).length).toBeGreaterThan(0);
  });

  it('should call onUpdateCategories when amount is changed', () => {
    const { container } = render(
      <BudgetView
        categories={mockCategories}
        expenses={[]}
        profile={mockProfile}
        {...mockCallbacks}
      />
    );

    const inputs = container.querySelectorAll('input[type="number"]');
    const firstInput = inputs[0] as HTMLInputElement;

    fireEvent.change(firstInput, { target: { value: '60000' } });

    expect(mockCallbacks.onUpdateCategories).toHaveBeenCalled();
  });

  it('should toggle lock icon when clicked', () => {
    const { container } = render(
      <BudgetView
        categories={mockCategories}
        expenses={[]}
        profile={mockProfile}
        {...mockCallbacks}
      />
    );

    const lockButtons = container.querySelectorAll('button[title*="lock"]');
    const firstLockButton = lockButtons[0];

    fireEvent.click(firstLockButton);

    expect(mockCallbacks.onUpdateCategories).toHaveBeenCalled();
  });

  it('should call onOpenOptimizerModal when optimizer button clicked', () => {
    render(
      <BudgetView
        categories={mockCategories}
        expenses={[]}
        profile={mockProfile}
        {...mockCallbacks}
      />
    );

    const optimizerButton = screen.getByText(/AI Budget Optimizer/i);
    fireEvent.click(optimizerButton);

    expect(mockCallbacks.onOpenOptimizerModal).toHaveBeenCalled();
  });

  it('should call onExportCSV when export button clicked', () => {
    render(
      <BudgetView
        categories={mockCategories}
        expenses={[]}
        profile={mockProfile}
        {...mockCallbacks}
      />
    );

    const exportButton = screen.getByText(/Export CSV/i);
    fireEvent.click(exportButton);

    expect(mockCallbacks.onExportCSV).toHaveBeenCalled();
  });

  it('should switch to expenses tab when clicked', () => {
    render(
      <BudgetView
        categories={mockCategories}
        expenses={[]}
        profile={mockProfile}
        {...mockCallbacks}
      />
    );

    const expensesTab = screen.getByText(/Expense Tracker & Ledger/i);
    fireEvent.click(expensesTab);

    expect(screen.getByText(/Recorded Expenses & Invoices/i)).toBeInTheDocument();
  });

  it('should show "Add New Expense" button in expenses tab', () => {
    render(
      <BudgetView
        categories={mockCategories}
        expenses={[]}
        profile={mockProfile}
        {...mockCallbacks}
      />
    );

    const expensesTab = screen.getByText(/Expense Tracker & Ledger/i);
    fireEvent.click(expensesTab);

    expect(screen.getAllByText(/Add New Expense/i).length).toBeGreaterThan(0);
  });

  it('should display expenses in the table', () => {
    const expenses: Expense[] = [
      {
        id: 'exp-1',
        category_id: 'cat-1',
        category_name: 'Venue',
        vendor_name: 'Royal Palace',
        amount: 25000,
        date: '2026-12-01',
        status: 'paid',
        notes: 'Advance payment',
      },
    ];

    render(
      <BudgetView
        categories={mockCategories}
        expenses={expenses}
        profile={mockProfile}
        {...mockCallbacks}
      />
    );

    const expensesTab = screen.getByText(/Expense Tracker & Ledger/i);
    fireEvent.click(expensesTab);

    expect(screen.getByText('Royal Palace')).toBeInTheDocument();
    expect(screen.getByText(/₹25,000/i)).toBeInTheDocument();
    expect(screen.getByText(/PAID/i)).toBeInTheDocument();
  });

  it('should show empty state when no expenses', () => {
    render(
      <BudgetView
        categories={mockCategories}
        expenses={[]}
        profile={mockProfile}
        {...mockCallbacks}
      />
    );

    const expensesTab = screen.getByText(/Expense Tracker & Ledger/i);
    fireEvent.click(expensesTab);

    expect(screen.getByText(/No expenses recorded yet/i)).toBeInTheDocument();
  });

  it('should call onDeleteExpense when delete button clicked', () => {
    const expenses: Expense[] = [
      {
        id: 'exp-1',
        category_id: 'cat-1',
        category_name: 'Venue',
        vendor_name: 'Test Vendor',
        amount: 10000,
        date: '2026-12-01',
        status: 'paid',
      },
    ];

    const { container } = render(
      <BudgetView
        categories={mockCategories}
        expenses={expenses}
        profile={mockProfile}
        {...mockCallbacks}
      />
    );

    const expensesTab = screen.getByText(/Expense Tracker & Ledger/i);
    fireEvent.click(expensesTab);

    const deleteButtons = container.querySelectorAll('button[title*="Delete"]');
    fireEvent.click(deleteButtons[0]);

    expect(mockCallbacks.onDeleteExpense).toHaveBeenCalledWith('exp-1');
  });

  it('should calculate and display spending progress correctly', () => {
    const expenses: Expense[] = [
      {
        id: 'exp-1',
        category_id: 'cat-1',
        category_name: 'Venue',
        vendor_name: 'Test',
        amount: 25000, // 50% of 50000 allocation
        date: '2026-12-01',
        status: 'paid',
      },
    ];

    render(
      <BudgetView
        categories={mockCategories}
        expenses={expenses}
        profile={mockProfile}
        {...mockCallbacks}
      />
    );

    // Should show 50% progress for Venue category
    expect(screen.getByText(/50%/i)).toBeInTheDocument();
  });

  it('should show locked indicator for locked categories', () => {
    const lockedCategories: BudgetCategory[] = [
      {
        ...mockCategories[0],
        is_locked: true,
      },
      mockCategories[1],
    ];

    const { container } = render(
      <BudgetView
        categories={lockedCategories}
        expenses={[]}
        profile={mockProfile}
        {...mockCallbacks}
      />
    );

    // Check for lock icon (assuming it has a specific class or aria-label)
    const lockButtons = container.querySelectorAll('button[title*="locked"]');
    expect(lockButtons.length).toBeGreaterThan(0);
  });

  it('should show category count in tab', () => {
    render(
      <BudgetView
        categories={mockCategories}
        expenses={[]}
        profile={mockProfile}
        {...mockCallbacks}
      />
    );

    expect(screen.getByText(/Category Allocations \(2\)/i)).toBeInTheDocument();
  });

  it('should show expense count in tab', () => {
    const expenses: Expense[] = [
      {
        id: 'exp-1',
        category_id: 'cat-1',
        category_name: 'Venue',
        vendor_name: 'Test',
        amount: 10000,
        date: '2026-12-01',
        status: 'paid',
      },
    ];

    render(
      <BudgetView
        categories={mockCategories}
        expenses={expenses}
        profile={mockProfile}
        {...mockCallbacks}
      />
    );

    // Expense count badge
    const expenseTab = screen.getByText(/Expense Tracker & Ledger/i).closest('button');
    expect(expenseTab).toHaveTextContent('1');
  });
});
