import { useState, useEffect, useCallback } from "react";
import { Shell } from "./components/Shell";

// ─── Types ────────────────────────────────────────────────────────────────────

type Frequency = "once" | "weekly" | "monthly" | "yearly";
type Status = "upcoming" | "due-soon" | "overdue" | "paid";
type Page = "home" | "bills";
type Tab = "all" | "upcoming" | "overdue" | "paid";

interface Bill {
  id: string;
  name: string;
  amount: number;
  dueDate: string;
  frequency: Frequency;
  category: string;
  notes: string;
  paid: boolean;
  paidDate?: string;
  color: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = "billreminder_bills";

const CATEGORIES = [
  "Housing", "Utilities", "Insurance", "Subscriptions",
  "Loans", "Credit Card", "Phone", "Internet", "Food", "Other",
];

const CATEGORY_ICONS: Record<string, string> = {
  Housing: "🏠", Utilities: "💡", Insurance: "🛡️", Subscriptions: "📺",
  Loans: "🏦", "Credit Card": "💳", Phone: "📱", Internet: "🌐",
  Food: "🛒", Other: "📄",
};

const COLORS = [
  "#2563eb", "#16a34a", "#d97706", "#dc2626",
  "#9333ea", "#0891b2", "#db2777", "#65a30d",
];

const FREQ_LABELS: Record<Frequency, string> = {
  once: "One-time", weekly: "Weekly", monthly: "Monthly", yearly: "Yearly",
};

const TAB_LABELS: Record<Tab, string> = {
  all: "All", upcoming: "Upcoming", overdue: "Overdue", paid: "Paid",
};

// Common bill presets for quick-add
const BILL_PRESETS = [
  { name: "Rent", category: "Housing", color: "#2563eb", frequency: "monthly" as Frequency },
  { name: "Electricity", category: "Utilities", color: "#d97706", frequency: "monthly" as Frequency },
  { name: "Water", category: "Utilities", color: "#0891b2", frequency: "monthly" as Frequency },
  { name: "Internet", category: "Internet", color: "#9333ea", frequency: "monthly" as Frequency },
  { name: "Phone", category: "Phone", color: "#16a34a", frequency: "monthly" as Frequency },
  { name: "Netflix", category: "Subscriptions", color: "#dc2626", frequency: "monthly" as Frequency },
  { name: "Spotify", category: "Subscriptions", color: "#16a34a", frequency: "monthly" as Frequency },
  { name: "Car Insurance", category: "Insurance", color: "#65a30d", frequency: "monthly" as Frequency },
  { name: "Health Insurance", category: "Insurance", color: "#db2777", frequency: "monthly" as Frequency },
  { name: "Credit Card", category: "Credit Card", color: "#dc2626", frequency: "monthly" as Frequency },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function today(): string {
  return new Date().toISOString().split("T")[0];
}

function daysUntil(dateStr: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const due = new Date(dateStr + "T00:00:00");
  return Math.round((due.getTime() - now.getTime()) / 86400000);
}

function getStatus(bill: Bill): Status {
  if (bill.paid) return "paid";
  const d = daysUntil(bill.dueDate);
  if (d < 0) return "overdue";
  if (d <= 7) return "due-soon";
  return "upcoming";
}

function statusLabel(s: Status): string {
  return { paid: "Paid", "due-soon": "Due Soon", overdue: "Overdue", upcoming: "Upcoming" }[s];
}

function statusColor(s: Status): string {
  return {
    paid: "var(--success)",
    "due-soon": "var(--warning)",
    overdue: "var(--error)",
    upcoming: "var(--accent)",
  }[s];
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function formatCurrency(n: number): string {
  return n.toLocaleString(undefined, { style: "currency", currency: "USD", minimumFractionDigits: 2 });
}

function newId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function nextDueDate(bill: Bill): string {
  if (bill.frequency === "once") return bill.dueDate;
  const base = new Date(bill.dueDate + "T00:00:00");
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  while (base <= now) {
    if (bill.frequency === "weekly") base.setDate(base.getDate() + 7);
    else if (bill.frequency === "monthly") base.setMonth(base.getMonth() + 1);
    else if (bill.frequency === "yearly") base.setFullYear(base.getFullYear() + 1);
  }
  return base.toISOString().split("T")[0];
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}

// ─── Bill Modal ───────────────────────────────────────────────────────────────

interface ModalProps {
  bill?: Bill | null;
  preset?: Partial<Bill> | null;
  onSave: (b: Bill) => void;
  onClose: () => void;
}

function BillModal({ bill, preset, onSave, onClose }: ModalProps) {
  const isEdit = !!bill;
  const [name, setName] = useState(bill?.name ?? preset?.name ?? "");
  const [amount, setAmount] = useState(bill ? String(bill.amount) : "");
  const [dueDate, setDueDate] = useState(bill?.dueDate ?? today());
  const [frequency, setFrequency] = useState<Frequency>(bill?.frequency ?? preset?.frequency ?? "monthly");
  const [category, setCategory] = useState(bill?.category ?? preset?.category ?? "Other");
  const [notes, setNotes] = useState(bill?.notes ?? "");
  const [color, setColor] = useState(bill?.color ?? preset?.color ?? COLORS[0]);
  const [error, setError] = useState("");

  function handleSave() {
    if (!name.trim()) { setError("Bill name is required."); return; }
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt < 0) { setError("Enter a valid amount."); return; }
    if (!dueDate) { setError("Due date is required."); return; }
    onSave({
      id: bill?.id ?? newId(),
      name: name.trim(), amount: amt, dueDate, frequency,
      category, notes: notes.trim(), paid: bill?.paid ?? false,
      paidDate: bill?.paidDate, color,
    });
  }

  const inputStyle = {
    background: "var(--panel)", border: "1px solid var(--line)", color: "var(--ink)",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.45)" }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md rounded-[1.25rem] p-6 shadow-2xl flex flex-col gap-4"
        style={{ background: "var(--paper)", border: "1px solid var(--line)" }}>
        <h2 className="text-xl font-bold" style={{ fontFamily: "Fraunces, serif" }}>
          {isEdit ? "Edit Bill" : "Add Bill"}
        </h2>
        {error && (
          <p className="text-sm rounded-lg px-3 py-2" style={{ background: "rgba(220,38,38,0.1)", color: "var(--error)" }}>
            {error}
          </p>
        )}
        <div className="flex flex-col gap-1">
          <label className="text-sm font-semibold" style={{ color: "var(--muted)" }}>Bill Name</label>
          <input className="rounded-[0.75rem] px-3 py-2 text-sm outline-none" style={inputStyle}
            placeholder="e.g. Rent, Netflix…" value={name}
            onChange={e => { setName(e.target.value); setError(""); }} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold" style={{ color: "var(--muted)" }}>Amount ($)</label>
            <input type="number" min="0" step="0.01" className="rounded-[0.75rem] px-3 py-2 text-sm outline-none"
              style={inputStyle} placeholder="0.00" value={amount}
              onChange={e => { setAmount(e.target.value); setError(""); }} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold" style={{ color: "var(--muted)" }}>Category</label>
            <select className="rounded-[0.75rem] px-3 py-2 text-sm outline-none" style={inputStyle}
              value={category} onChange={e => setCategory(e.target.value)}>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold" style={{ color: "var(--muted)" }}>Due Date</label>
            <input type="date" className="rounded-[0.75rem] px-3 py-2 text-sm outline-none" style={inputStyle}
              value={dueDate} onChange={e => { setDueDate(e.target.value); setError(""); }} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-semibold" style={{ color: "var(--muted)" }}>Frequency</label>
            <select className="rounded-[0.75rem] px-3 py-2 text-sm outline-none" style={inputStyle}
              value={frequency} onChange={e => setFrequency(e.target.value as Frequency)}>
              {(Object.keys(FREQ_LABELS) as Frequency[]).map(f => (
                <option key={f} value={f}>{FREQ_LABELS[f]}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-semibold" style={{ color: "var(--muted)" }}>Color</label>
          <div className="flex gap-2 flex-wrap">
            {COLORS.map(c => (
              <button key={c} onClick={() => setColor(c)}
                className="w-7 h-7 rounded-full transition-transform"
                style={{
                  background: c,
                  outline: color === c ? "3px solid var(--ink)" : "3px solid transparent",
                  outlineOffset: "2px",
                  transform: color === c ? "scale(1.15)" : "scale(1)",
                }} />
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-semibold" style={{ color: "var(--muted)" }}>Notes (optional)</label>
          <textarea rows={2} className="rounded-[0.75rem] px-3 py-2 text-sm outline-none resize-none"
            style={inputStyle} placeholder="Account number, website, etc."
            value={notes} onChange={e => setNotes(e.target.value)} />
        </div>
        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 rounded-[0.75rem] py-2 text-sm font-semibold"
            style={{ border: "1px solid var(--line)", color: "var(--muted)" }}>
            Cancel
          </button>
          <button onClick={handleSave} className="flex-1 rounded-[0.75rem] py-2 text-sm font-bold text-white"
            style={{ background: color }}>
            {isEdit ? "Save Changes" : "Add Bill"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Bill Card ────────────────────────────────────────────────────────────────

interface BillCardProps {
  bill: Bill;
  onEdit: () => void;
  onDelete: () => void;
  onTogglePaid: () => void;
}

function BillCard({ bill, onEdit, onDelete, onTogglePaid }: BillCardProps) {
  const status = getStatus(bill);
  const days = daysUntil(bill.dueDate);
  let daysLabel = "";
  if (!bill.paid) {
    if (days === 0) daysLabel = "Due today!";
    else if (days === 1) daysLabel = "Due tomorrow";
    else if (days === -1) daysLabel = "1 day overdue";
    else if (days < 0) daysLabel = `${Math.abs(days)} days overdue`;
    else daysLabel = `In ${days} days`;
  } else {
    daysLabel = bill.paidDate ? `Paid on ${formatDate(bill.paidDate)}` : "Paid";
  }

  return (
    <div className="rounded-[1.25rem] p-4 flex flex-col gap-3 transition-shadow hover:shadow-md"
      style={{ background: "var(--paper)", border: "1px solid var(--line)", opacity: bill.paid ? 0.7 : 1 }}>
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl shrink-0"
          style={{ background: bill.color + "22" }}>
          {CATEGORY_ICONS[bill.category] ?? "📄"}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-base truncate" style={{
              fontFamily: "Fraunces, serif",
              textDecoration: bill.paid ? "line-through" : "none",
              color: bill.paid ? "var(--muted)" : "var(--ink)",
            }}>
              {bill.name}
            </h3>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0"
              style={{ background: statusColor(status) + "22", color: statusColor(status) }}>
              {statusLabel(status)}
            </span>
          </div>
          <p className="text-sm mt-0.5" style={{ color: "var(--muted)" }}>
            {bill.category} · {FREQ_LABELS[bill.frequency]}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="font-bold text-lg" style={{ color: bill.color }}>{formatCurrency(bill.amount)}</p>
          <p className="text-xs" style={{ color: "var(--muted)" }}>{formatDate(bill.dueDate)}</p>
        </div>
      </div>
      <div className="text-sm font-semibold px-3 py-1.5 rounded-lg text-center"
        style={{ background: statusColor(status) + "15", color: statusColor(status) }}>
        {daysLabel}
      </div>
      {bill.notes && (
        <p className="text-xs px-1" style={{ color: "var(--muted)" }}>📝 {bill.notes}</p>
      )}
      <div className="flex gap-2 pt-1">
        <button onClick={onTogglePaid}
          className="flex-1 rounded-[0.75rem] py-1.5 text-sm font-semibold transition-colors"
          style={{
            background: bill.paid ? "var(--panel)" : statusColor(status) + "18",
            color: bill.paid ? "var(--muted)" : statusColor(status),
            border: `1px solid ${bill.paid ? "var(--line)" : statusColor(status) + "44"}`,
          }}>
          {bill.paid ? "↩ Mark Unpaid" : "✓ Mark Paid"}
        </button>
        <button onClick={onEdit} className="px-3 rounded-[0.75rem] text-sm font-semibold border"
          style={{ border: "1px solid var(--line)", color: "var(--muted)" }}>
          Edit
        </button>
        <button onClick={onDelete} className="px-3 rounded-[0.75rem] text-sm font-semibold"
          style={{ background: "rgba(220,38,38,0.08)", color: "var(--error)" }}>
          ✕
        </button>
      </div>
    </div>
  );
}

// ─── Home Page ────────────────────────────────────────────────────────────────

interface HomePageProps {
  bills: Bill[];
  onGoToBills: () => void;
  onAddBill: () => void;
  onTogglePaid: (id: string) => void;
}

function HomePage({ bills, onGoToBills, onAddBill, onTogglePaid }: HomePageProps) {
  const unpaid = bills.filter(b => !b.paid);
  const overdue = unpaid.filter(b => daysUntil(b.dueDate) < 0);
  const dueSoon = unpaid.filter(b => { const d = daysUntil(b.dueDate); return d >= 0 && d <= 7; });
  const totalDue = unpaid.reduce((s, b) => s + b.amount, 0);
  const totalPaidThisMonth = bills
    .filter(b => b.paid && b.paidDate?.startsWith(new Date().toISOString().slice(0, 7)))
    .reduce((s, b) => s + b.amount, 0);

  const urgent = [...overdue, ...dueSoon].sort((a, b) => a.dueDate.localeCompare(b.dueDate)).slice(0, 4);

  const byCategory: Record<string, number> = {};
  unpaid.forEach(b => { byCategory[b.category] = (byCategory[b.category] ?? 0) + b.amount; });
  const topCategories = Object.entries(byCategory).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxCat = topCategories[0]?.[1] ?? 1;

  const monthName = new Date().toLocaleDateString(undefined, { month: "long", year: "numeric" });

  // Empty state — no bills added yet
  if (bills.length === 0) {
    return (
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold" style={{ fontFamily: "Fraunces, serif" }}>
            Good {getGreeting()} 👋
          </h1>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>Welcome to Bill Reminders</p>
        </div>

        <div className="rounded-[1.25rem] p-10 flex flex-col items-center gap-5 text-center"
          style={{ border: "2px dashed var(--line)" }}>
          <span className="text-6xl">💸</span>
          <div>
            <h2 className="text-xl font-bold" style={{ fontFamily: "Fraunces, serif" }}>No bills yet</h2>
            <p className="text-sm mt-1 max-w-xs mx-auto" style={{ color: "var(--muted)" }}>
              Add your first bill to start tracking due dates, get overdue alerts, and see your spending breakdown.
            </p>
          </div>
          <button onClick={onAddBill}
            className="px-6 py-3 rounded-[0.75rem] font-bold text-white text-sm shadow"
            style={{ background: "var(--accent)" }}>
            ➕ Add Your First Bill
          </button>
        </div>

        {/* Quick-add presets */}
        <div>
          <h2 className="font-bold text-lg mb-3" style={{ fontFamily: "Fraunces, serif" }}>
            ⚡ Quick Add Common Bills
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {BILL_PRESETS.map(p => (
              <button key={p.name} onClick={() => onAddBill()}
                className="flex items-center gap-2 px-3 py-2.5 rounded-[0.75rem] text-sm font-semibold text-left transition-opacity hover:opacity-80"
                style={{ background: "var(--panel)", border: "1px solid var(--line)" }}>
                <span className="text-lg">{CATEGORY_ICONS[p.category] ?? "📄"}</span>
                <span style={{ color: "var(--ink)" }}>{p.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      {/* Greeting */}
      <div>
        <h1 className="text-3xl font-bold" style={{ fontFamily: "Fraunces, serif" }}>
          Good {getGreeting()} 👋
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
          Here's your bill overview for {monthName}
        </p>
      </div>

      {/* Hero stat cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-[1.25rem] p-5 flex flex-col gap-1 col-span-2"
          style={{ background: "var(--accent)", color: "#fff" }}>
          <p className="text-sm font-semibold opacity-80">Total Outstanding</p>
          <p className="text-4xl font-bold" style={{ fontFamily: "Fraunces, serif" }}>
            {formatCurrency(totalDue)}
          </p>
          <p className="text-sm opacity-75">{unpaid.length} unpaid bill{unpaid.length !== 1 ? "s" : ""}</p>
        </div>

        <div className="rounded-[1.25rem] p-4 flex flex-col gap-1"
          style={{ background: overdue.length > 0 ? "rgba(220,38,38,0.08)" : "var(--panel)", border: "1px solid var(--line)" }}>
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: overdue.length > 0 ? "var(--error)" : "var(--muted)" }}>
            Overdue
          </p>
          <p className="text-3xl font-bold" style={{ fontFamily: "Fraunces, serif", color: overdue.length > 0 ? "var(--error)" : "var(--ink)" }}>
            {overdue.length}
          </p>
          <p className="text-xs" style={{ color: "var(--muted)" }}>
            {overdue.length === 0 ? "All clear!" : "Need attention"}
          </p>
        </div>

        <div className="rounded-[1.25rem] p-4 flex flex-col gap-1"
          style={{ background: dueSoon.length > 0 ? "rgba(217,119,6,0.08)" : "var(--panel)", border: "1px solid var(--line)" }}>
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: dueSoon.length > 0 ? "var(--warning)" : "var(--muted)" }}>
            Due This Week
          </p>
          <p className="text-3xl font-bold" style={{ fontFamily: "Fraunces, serif", color: dueSoon.length > 0 ? "var(--warning)" : "var(--ink)" }}>
            {dueSoon.length}
          </p>
          <p className="text-xs" style={{ color: "var(--muted)" }}>
            {dueSoon.length === 0 ? "Nothing urgent" : "Coming up soon"}
          </p>
        </div>

        <div className="rounded-[1.25rem] p-4 flex flex-col gap-1"
          style={{ background: "var(--panel)", border: "1px solid var(--line)" }}>
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>Paid This Month</p>
          <p className="text-2xl font-bold" style={{ fontFamily: "Fraunces, serif", color: "var(--success)" }}>
            {formatCurrency(totalPaidThisMonth)}
          </p>
        </div>

        <div className="rounded-[1.25rem] p-4 flex flex-col gap-1"
          style={{ background: "var(--panel)", border: "1px solid var(--line)" }}>
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>Total Bills</p>
          <p className="text-2xl font-bold" style={{ fontFamily: "Fraunces, serif" }}>{bills.length}</p>
          <p className="text-xs" style={{ color: "var(--muted)" }}>{bills.filter(b => b.paid).length} paid</p>
        </div>
      </div>

      {/* Urgent bills */}
      {urgent.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-lg" style={{ fontFamily: "Fraunces, serif" }}>
              🚨 Needs Attention
            </h2>
            <button onClick={onGoToBills} className="text-sm font-semibold" style={{ color: "var(--accent)" }}>
              View all →
            </button>
          </div>
          <div className="flex flex-col gap-2">
            {urgent.map(bill => {
              const status = getStatus(bill);
              const days = daysUntil(bill.dueDate);
              const daysLabel = days === 0 ? "Due today!" : days < 0 ? `${Math.abs(days)}d overdue` : `In ${days}d`;
              return (
                <div key={bill.id}
                  className="rounded-[1rem] p-3 flex items-center gap-3"
                  style={{ background: "var(--paper)", border: `1px solid ${statusColor(status)}44` }}>
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-lg shrink-0"
                    style={{ background: bill.color + "22" }}>
                    {CATEGORY_ICONS[bill.category] ?? "📄"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{bill.name}</p>
                    <p className="text-xs" style={{ color: statusColor(status) }}>{daysLabel}</p>
                  </div>
                  <p className="font-bold text-sm shrink-0" style={{ color: bill.color }}>
                    {formatCurrency(bill.amount)}
                  </p>
                  <button
                    onClick={() => onTogglePaid(bill.id)}
                    className="shrink-0 text-xs font-bold px-2.5 py-1 rounded-full"
                    style={{ background: statusColor(status) + "18", color: statusColor(status) }}>
                    Pay
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Spending by category */}
      {topCategories.length > 0 && (
        <div>
          <h2 className="font-bold text-lg mb-3" style={{ fontFamily: "Fraunces, serif" }}>
            📊 Spending Breakdown
          </h2>
          <div className="rounded-[1.25rem] p-4 flex flex-col gap-3"
            style={{ background: "var(--panel)", border: "1px solid var(--line)" }}>
            {topCategories.map(([cat, amt]) => (
              <div key={cat} className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold flex items-center gap-1.5">
                    <span>{CATEGORY_ICONS[cat] ?? "📄"}</span> {cat}
                  </span>
                  <span className="font-bold">{formatCurrency(amt)}</span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--line)" }}>
                  <div className="h-full rounded-full transition-all"
                    style={{ width: `${(amt / maxCat) * 100}%`, background: "var(--accent)" }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3 pb-4">
        <button onClick={onAddBill}
          className="rounded-[1.25rem] p-4 flex flex-col items-center gap-2 font-semibold text-sm transition-opacity hover:opacity-80"
          style={{ background: "var(--accent)", color: "#fff" }}>
          <span className="text-2xl">➕</span>
          Add New Bill
        </button>
        <button onClick={onGoToBills}
          className="rounded-[1.25rem] p-4 flex flex-col items-center gap-2 font-semibold text-sm transition-opacity hover:opacity-80"
          style={{ background: "var(--panel)", border: "1px solid var(--line)", color: "var(--ink)" }}>
          <span className="text-2xl">💸</span>
          Manage Bills
        </button>
      </div>
    </div>
  );
}

// ─── Bills Page ───────────────────────────────────────────────────────────────

interface BillsPageProps {
  bills: Bill[];
  onSave: (b: Bill) => void;
  onDelete: (id: string) => void;
  onTogglePaid: (id: string) => void;
  openAddModal: boolean;
  openPreset: Partial<Bill> | null;
  onClearOpenAdd: () => void;
}

function BillsPage({ bills, onSave, onDelete, onTogglePaid, openAddModal, openPreset, onClearOpenAdd }: BillsPageProps) {
  const [tab, setTab] = useState<Tab>("all");
  const [sortBy, setSortBy] = useState<"dueDate" | "amount" | "name">("dueDate");
  const [showModal, setShowModal] = useState(false);
  const [editBill, setEditBill] = useState<Bill | null>(null);
  const [activePreset, setActivePreset] = useState<Partial<Bill> | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    if (openAddModal) {
      setEditBill(null);
      setActivePreset(openPreset);
      setShowModal(true);
      onClearOpenAdd();
    }
  }, [openAddModal, openPreset, onClearOpenAdd]);

  const filtered = bills.filter(b => {
    const s = getStatus(b);
    if (tab === "all") return true;
    if (tab === "upcoming") return s === "upcoming" || s === "due-soon";
    if (tab === "overdue") return s === "overdue";
    if (tab === "paid") return s === "paid";
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "dueDate") return a.dueDate.localeCompare(b.dueDate);
    if (sortBy === "amount") return b.amount - a.amount;
    if (sortBy === "name") return a.name.localeCompare(b.name);
    return 0;
  });

  const tabCounts: Record<Tab, number> = {
    all: bills.length,
    upcoming: bills.filter(b => { const s = getStatus(b); return s === "upcoming" || s === "due-soon"; }).length,
    overdue: bills.filter(b => getStatus(b) === "overdue").length,
    paid: bills.filter(b => getStatus(b) === "paid").length,
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold" style={{ fontFamily: "Fraunces, serif" }}>All Bills</h1>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>Manage your recurring payments</p>
        </div>
        <button onClick={() => { setEditBill(null); setActivePreset(null); setShowModal(true); }}
          className="flex items-center gap-2 px-4 py-2 rounded-[0.75rem] font-bold text-white text-sm shadow"
          style={{ background: "var(--accent)" }}>
          <span className="text-lg leading-none">+</span> Add Bill
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 p-1 rounded-[1rem]" style={{ background: "var(--panel)" }}>
        {(Object.keys(TAB_LABELS) as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="flex-1 rounded-[0.75rem] py-1.5 text-sm font-semibold transition-colors"
            style={{
              background: tab === t ? "var(--paper)" : "transparent",
              color: tab === t ? "var(--ink)" : "var(--muted)",
              boxShadow: tab === t ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
            }}>
            {TAB_LABELS[t]}
            {tabCounts[t] > 0 && (
              <span className="ml-1.5 text-xs px-1.5 py-0.5 rounded-full font-bold"
                style={{
                  background: t === "overdue" && tabCounts[t] > 0 ? "var(--error)" : tab === t ? "var(--accent)" : "var(--line)",
                  color: (t === "overdue" && tabCounts[t] > 0) || tab === t ? "#fff" : "var(--muted)",
                }}>
                {tabCounts[t]}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Sort */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs font-semibold" style={{ color: "var(--muted)" }}>Sort:</span>
        {(["dueDate", "amount", "name"] as const).map(s => (
          <button key={s} onClick={() => setSortBy(s)}
            className="text-xs px-2.5 py-1 rounded-full font-semibold"
            style={{ background: sortBy === s ? "var(--accent)" : "var(--panel)", color: sortBy === s ? "#fff" : "var(--muted)" }}>
            {s === "dueDate" ? "Due Date" : s === "amount" ? "Amount" : "Name"}
          </button>
        ))}
      </div>

      {/* List */}
      {sorted.length === 0 ? (
        <div className="rounded-[1.25rem] p-12 text-center" style={{ border: "2px dashed var(--line)" }}>
          <p className="text-4xl mb-3">💸</p>
          <p className="font-semibold" style={{ fontFamily: "Fraunces, serif" }}>
            {tab === "all" ? "No bills yet" : `No ${TAB_LABELS[tab].toLowerCase()} bills`}
          </p>
          <p className="text-sm mt-1" style={{ color: "var(--muted)" }}>
            {tab === "all" ? "Tap + Add Bill to get started" : "Switch to another tab or add a new bill"}
          </p>
          {tab === "all" && (
            <button onClick={() => { setEditBill(null); setActivePreset(null); setShowModal(true); }}
              className="mt-4 px-5 py-2 rounded-[0.75rem] font-bold text-white text-sm"
              style={{ background: "var(--accent)" }}>
              ➕ Add Bill
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-3 pb-4">
          {sorted.map(bill => (
            <BillCard key={bill.id} bill={bill}
              onEdit={() => { setEditBill(bill); setActivePreset(null); setShowModal(true); }}
              onDelete={() => setDeleteConfirm(bill.id)}
              onTogglePaid={() => onTogglePaid(bill.id)} />
          ))}
        </div>
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.45)" }}>
          <div className="w-full max-w-sm rounded-[1.25rem] p-6 flex flex-col gap-4"
            style={{ background: "var(--paper)", border: "1px solid var(--line)" }}>
            <h2 className="text-lg font-bold" style={{ fontFamily: "Fraunces, serif" }}>Delete Bill?</h2>
            <p className="text-sm" style={{ color: "var(--muted)" }}>
              This will permanently remove the bill. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)}
                className="flex-1 rounded-[0.75rem] py-2 text-sm font-semibold"
                style={{ border: "1px solid var(--line)", color: "var(--muted)" }}>
                Cancel
              </button>
              <button onClick={() => { onDelete(deleteConfirm); setDeleteConfirm(null); }}
                className="flex-1 rounded-[0.75rem] py-2 text-sm font-bold text-white"
                style={{ background: "var(--error)" }}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <BillModal
          bill={editBill}
          preset={activePreset}
          onSave={b => { onSave(b); setShowModal(false); setEditBill(null); setActivePreset(null); }}
          onClose={() => { setShowModal(false); setEditBill(null); setActivePreset(null); }}
        />
      )}
    </div>
  );
}

// ─── App Root ─────────────────────────────────────────────────────────────────

export default function App() {
  const [bills, setBills] = useState<Bill[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });

  const [page, setPage] = useState<Page>("home");
  const [triggerAddModal, setTriggerAddModal] = useState(false);
  const [addPreset, setAddPreset] = useState<Partial<Bill> | null>(null);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bills));
  }, [bills]);

  // Auto-advance recurring bills
  useEffect(() => {
    setBills(prev => prev.map(b => {
      if (b.paid && b.frequency !== "once") {
        const next = nextDueDate(b);
        if (next !== b.dueDate) return { ...b, paid: false, paidDate: undefined, dueDate: next };
      }
      return b;
    }));
  }, []);

  const saveBill = useCallback((b: Bill) => {
    setBills(prev => {
      const idx = prev.findIndex(x => x.id === b.id);
      if (idx >= 0) { const n = [...prev]; n[idx] = b; return n; }
      return [...prev, b];
    });
  }, []);

  const deleteBill = useCallback((id: string) => {
    setBills(prev => prev.filter(b => b.id !== id));
  }, []);

  const togglePaid = useCallback((id: string) => {
    setBills(prev => prev.map(b => {
      if (b.id !== id) return b;
      const nowPaid = !b.paid;
      return { ...b, paid: nowPaid, paidDate: nowPaid ? today() : undefined };
    }));
  }, []);

  const handleAddBill = useCallback((preset?: Partial<Bill>) => {
    setAddPreset(preset ?? null);
    setPage("bills");
    setTriggerAddModal(true);
  }, []);

  return (
    <Shell page={page} onNavigate={setPage}>
      {page === "home" ? (
        <HomePage
          bills={bills}
          onGoToBills={() => setPage("bills")}
          onAddBill={() => handleAddBill()}
          onTogglePaid={togglePaid}
        />
      ) : (
        <BillsPage
          bills={bills}
          onSave={saveBill}
          onDelete={deleteBill}
          onTogglePaid={togglePaid}
          openAddModal={triggerAddModal}
          openPreset={addPreset}
          onClearOpenAdd={() => setTriggerAddModal(false)}
        />
      )}
    </Shell>
  );
}
