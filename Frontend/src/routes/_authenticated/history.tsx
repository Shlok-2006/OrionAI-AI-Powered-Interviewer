import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, Eye, Repeat, ChevronDown, Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from "lucide-react";
import GlassCard from "@/components/GlassCard";
import LoadingSpinner from "@/components/LoadingSpinner";
import api from "@/lib/api";

export const Route = createFileRoute("/_authenticated/history")({
  head: () => ({ meta: [{ title: "History — OrionAI" }] }),
  component: HistoryPage,
});

type Item = { id: string; type: string; rawType: string; score: number; createdAt: string };

const TYPES = ["all", "behavioral", "technical", "system-design", "hr"];

const formatFilterLabel = (val: string) => {
  switch (val) {
    case "all": return "All";
    case "behavioral": return "Behavioral";
    case "technical": return "Technical";
    case "system-design": return "System Design";
    case "hr": return "HR / Culture Fit";
    default:
      return val.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  }
};

const formatSortLabel = (val: string) => {
  switch (val) {
    case "recent": return "Most Recent";
    case "best": return "Highest Score";
    default: return val;
  }
};

function Dropdown({
  value,
  onChange,
  options,
  formatLabel,
  isOpen,
  onToggle,
}: {
  value: string;
  onChange: (val: string) => void;
  options: string[];
  formatLabel: (val: string) => string;
  isOpen: boolean;
  onToggle: (open: boolean) => void;
}) {
  useEffect(() => {
    if (!isOpen) return;
    const handle = () => onToggle(false);
    window.addEventListener("click", handle);
    return () => window.removeEventListener("click", handle);
  }, [isOpen, onToggle]);

  return (
    <div className="relative inline-block min-w-[160px]" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => onToggle(!isOpen)}
        className="glass flex w-full items-center justify-between gap-2 rounded-xl px-4 py-2.5 text-sm outline-none cursor-pointer hover:bg-white/5 transition-all text-left"
      >
        <span>{formatLabel(value)}</span>
        <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200" style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }} />
      </button>

      {isOpen && (
        <div className="absolute left-0 z-50 mt-2 w-full rounded-xl border border-white/10 bg-background/95 p-1.5 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-150">
          {options.map((opt, idx) => (
            <div key={opt}>
              <button
                onClick={() => {
                  onChange(opt);
                  onToggle(false);
                }}
                className={`flex w-full items-center rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-primary/10 hover:text-primary ${
                  value === opt ? "bg-primary/5 text-primary font-medium" : "text-foreground"
                }`}
              >
                {formatLabel(opt)}
              </button>
              {idx < options.length - 1 && <div className="my-1 border-b border-white/5" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function DateRangePicker({
  startDate,
  endDate,
  onChange,
  isOpen,
  onToggle,
}: {
  startDate: Date | null;
  endDate: Date | null;
  onChange: (start: Date | null, end: Date | null) => void;
  isOpen: boolean;
  onToggle: (open: boolean) => void;
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [hoveredDate, setHoveredDate] = useState<Date | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handle = () => onToggle(false);
    window.addEventListener("click", handle);
    return () => window.removeEventListener("click", handle);
  }, [isOpen, onToggle]);

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const firstDayIndex = new Date(year, month, 1).getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();

  const prevMonth = () => setCurrentMonth(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(year, month + 1, 1));

  const handleDateClick = (day: number) => {
    const clickedDate = new Date(year, month, day);
    if (!startDate || (startDate && endDate)) {
      onChange(clickedDate, null);
    } else {
      if (clickedDate < startDate) {
        onChange(clickedDate, null);
      } else {
        onChange(startDate, clickedDate);
        onToggle(false);
      }
    }
  };

  const isSelected = (day: number) => {
    const d = new Date(year, month, day);
    if (startDate && d.toDateString() === startDate.toDateString()) return "start";
    if (endDate && d.toDateString() === endDate.toDateString()) return "end";
    if (startDate && endDate && d > startDate && d < endDate) return "in-range";
    if (startDate && !endDate && hoveredDate && d > startDate && d <= hoveredDate) return "hover-range";
    return null;
  };

  const formatDateRangeLabel = () => {
    if (!startDate) return "Select Date Range";
    if (!endDate) return `${startDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ...`;
    return `${startDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
  };

  const days = Array.from({ length: totalDays }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDayIndex }, (_, i) => i);

  return (
    <div className="relative inline-block" onClick={(e) => e.stopPropagation()}>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onToggle(!isOpen)}
          className="glass flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm outline-none cursor-pointer hover:bg-white/5 transition-all"
        >
          <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          <span>{formatDateRangeLabel()}</span>
        </button>
        {(startDate || endDate) && (
          <button
            onClick={() => onChange(null, null)}
            className="glass flex h-10 w-10 items-center justify-center rounded-xl hover:bg-white/5 transition-all cursor-pointer text-muted-foreground hover:text-foreground"
            title="Clear Dates"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute right-0 md:left-0 z-50 mt-2 w-[300px] rounded-xl border border-white/10 bg-background/95 p-4 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-150 select-none">
          <div className="flex items-center justify-between mb-4">
            <button onClick={prevMonth} className="glass p-1.5 rounded-lg hover:bg-white/5 cursor-pointer">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="font-semibold text-sm">
              {currentMonth.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
            </span>
            <button onClick={nextMonth} className="glass p-1.5 rounded-lg hover:bg-white/5 cursor-pointer">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-muted-foreground uppercase mb-2">
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
              <div key={d}>{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {blanks.map((b) => (
              <div key={`b-${b}`} />
            ))}
            {days.map((day) => {
              const state = isSelected(day);
              const d = new Date(year, month, day);
              
              let dayClass = "hover:bg-white/5 text-foreground rounded-lg";
              if (state === "start") dayClass = "gradient-bg text-white rounded-l-lg font-bold";
              else if (state === "end") dayClass = "gradient-bg text-white rounded-r-lg font-bold";
              else if (state === "in-range") dayClass = "bg-primary/15 text-primary rounded-none";
              else if (state === "hover-range") dayClass = "bg-primary/10 text-primary rounded-none opacity-80";

              return (
                <button
                  key={day}
                  onClick={() => handleDateClick(day)}
                  onMouseEnter={() => setHoveredDate(d)}
                  onMouseLeave={() => setHoveredDate(null)}
                  className={`h-9 w-9 text-xs font-medium transition-all cursor-pointer flex items-center justify-center ${dayClass}`}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function HistoryPage() {
  const navigate = useNavigate();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState<"recent" | "best">("recent");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [activeDropdown, setActiveDropdown] = useState<"date" | "filter" | "sort" | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await api.get("/interview/history");
        if (alive) {
          const rawInterviews = Array.isArray(data) ? data : [];
          const sortedChronological = [...rawInterviews].sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );

          const typeCounts: Record<string, number> = {};
          const formatType = (type: string) => {
            switch (type) {
              case "TECHNICAL": return "Technical";
              case "BEHAVIORAL": return "Behavioral";
              case "SYSTEM_DESIGN": return "System Design";
              case "HR_CULTURE_FIT": return "HR / Culture Fit";
              default:
                return type.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
            }
          };

          const mappedItems: Item[] = sortedChronological.map((iv: any) => {
            const rawType = iv.type;
            typeCounts[rawType] = (typeCounts[rawType] || 0) + 1;
            const countStr = String(typeCounts[rawType]).padStart(2, "0");
            return {
              id: iv.id,
              rawType: rawType.toLowerCase().replace("_", "-"),
              type: `${formatType(rawType)} - ${countStr}`,
              score: iv.feedback?.overallScore ?? 0,
              createdAt: iv.createdAt,
            };
          });

          // Sort back to newest first
          const newestFirst = mappedItems.sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          setItems(newestFirst);
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const filtered = useMemo(() => {
    let xs = items;
    if (filter !== "all") xs = xs.filter((x) => x.rawType.includes(filter));
    if (q) xs = xs.filter((x) => x.type.toLowerCase().includes(q.toLowerCase()) || x.rawType.includes(q.toLowerCase()));
    
    // Date Filtering
    if (startDate) {
      xs = xs.filter((x) => new Date(x.createdAt).getTime() >= startDate.getTime());
    }
    if (endDate) {
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);
      xs = xs.filter((x) => new Date(x.createdAt).getTime() <= endOfDay.getTime());
    }

    xs = [...xs].sort((a, b) =>
      sort === "recent"
        ? new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        : b.score - a.score
    );
    return xs;
  }, [items, q, filter, sort, startDate, endDate]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">History</h1>
          <p className="text-muted-foreground">Review previous sessions, feedback, and performance insights.</p>
        </div>
        <Link to="/interview-types" className="gradient-bg rounded-xl px-4 py-2.5 text-sm font-medium text-white glow">
          New interview
        </Link>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <div className="glass flex flex-1 min-w-[220px] items-center gap-2 rounded-xl px-3 py-2.5">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by type"
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <DateRangePicker
          startDate={startDate}
          endDate={endDate}
          onChange={(start, end) => {
            setStartDate(start);
            setEndDate(end);
          }}
          isOpen={activeDropdown === "date"}
          onToggle={(open) => setActiveDropdown(open ? "date" : null)}
        />
        <Dropdown
          value={filter}
          onChange={setFilter}
          options={TYPES}
          formatLabel={formatFilterLabel}
          isOpen={activeDropdown === "filter"}
          onToggle={(open) => setActiveDropdown(open ? "filter" : null)}
        />
        <Dropdown
          value={sort}
          onChange={(val) => setSort(val as any)}
          options={["recent", "best"]}
          formatLabel={formatSortLabel}
          isOpen={activeDropdown === "sort"}
          onToggle={(open) => setActiveDropdown(open ? "sort" : null)}
        />
      </div>

      <div className="mt-6">
        {loading ? (
          <LoadingSpinner />
        ) : filtered.length === 0 ? (
          <GlassCard className="text-center text-muted-foreground">No interviews yet.</GlassCard>
        ) : (
          <div className="grid gap-3">
            {filtered.map((iv) => (
              <GlassCard key={iv.id} className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="font-semibold">{iv.type}</div>
                  <div className="text-xs text-muted-foreground">{new Date(iv.createdAt).toLocaleString()}</div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="gradient-text text-lg font-bold">{Math.round(iv.score)}%</div>
                  <Link to="/feedback/$id" params={{ id: iv.id }} className="glass inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm">
                    <Eye className="h-4 w-4" /> View
                  </Link>
                  <button
                    onClick={() => navigate({ to: "/waiting-room", search: { type: iv.type.toLowerCase() } })}
                    className="gradient-bg inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium text-white"
                  >
                    <Repeat className="h-4 w-4" /> Retake
                  </button>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}