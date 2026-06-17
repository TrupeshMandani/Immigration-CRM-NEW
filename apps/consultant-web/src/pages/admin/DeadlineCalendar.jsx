import { useState, useMemo } from "react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import AdminLayout from "../../components/layout/AdminLayout";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import Loading from "../../components/common/Loading";
import { useDeadlines } from "../../hooks/useDeadlines";
import { DEADLINE_TYPE_LABELS } from "../../components/admin/DeadlineTypeLabel";

const URGENCY_COLORS = {
  overdue:  "#ef4444",
  critical: "#f97316",
  warning:  "#ca8a04",
  upcoming: "#3b82f6",
  future:   "#9ca3af",
};

const URGENCY_TEXT_COLORS = {
  overdue:  "#ffffff",
  critical: "#ffffff",
  warning:  "#ffffff",
  upcoming: "#ffffff",
  future:   "#374151",
};

const URGENCY_TIERS = ["all", "overdue", "critical", "warning", "upcoming", "future"];

export default function DeadlineCalendar() {
  const navigate = useNavigate();
  const [urgencyFilter, setUrgencyFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("");
  const [showAcknowledged, setShowAcknowledged] = useState(false);

  const params = { limit: 500 };
  if (!showAcknowledged) params.unacknowledged = true;
  if (urgencyFilter !== "all") params.urgency = urgencyFilter;
  if (typeFilter) params.deadline_type = typeFilter;

  const { data: deadlines = [], isLoading } = useDeadlines(params);

  const overdueCount  = useMemo(() => deadlines.filter((d) => d.urgency === "overdue").length,  [deadlines]);
  const criticalCount = useMemo(() => deadlines.filter((d) => d.urgency === "critical").length, [deadlines]);

  const events = useMemo(
    () =>
      deadlines.map((d) => ({
        id:              d.id,
        title:           d.label,
        date:            d.due_date,
        backgroundColor: URGENCY_COLORS[d.urgency] ?? URGENCY_COLORS.future,
        borderColor:     URGENCY_COLORS[d.urgency] ?? URGENCY_COLORS.future,
        textColor:       URGENCY_TEXT_COLORS[d.urgency] ?? "#374151",
        extendedProps:   d,
      })),
    [deadlines],
  );

  const handleEventClick = ({ event }) => {
    const deadline = event.extendedProps;
    navigate(`/admin/cases/${deadline.case_id}#deadlines`);
  };

  const copyIcalLink = () => {
    const url = `${import.meta.env.VITE_API_URL ?? ""}/deadlines/ical?token=YOUR_FIRM_TOKEN`;
    navigator.clipboard.writeText(url).then(() => {
      toast.success("iCal URL copied — paste into Google Calendar or Outlook");
    });
  };

  return (
    <AdminLayout>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6 border-b border-gray-200 pb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Calendar &amp; Deadlines</h1>
            <p className="text-gray-500 mt-1 text-sm">
              {overdueCount > 0 && (
                <span className="text-red-600 font-medium">{overdueCount} overdue · </span>
              )}
              {criticalCount > 0 && (
                <span className="text-orange-600 font-medium">{criticalCount} critical this week · </span>
              )}
              {deadlines.length} total
            </p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <Button variant="outline" onClick={copyIcalLink}>
              Copy iCal Link
            </Button>
            <Button variant="primary" onClick={() => navigate("/admin/deadlines/create")}>
              Add Deadline
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6 shadow-sm">
          <Card.Body>
            <div className="flex flex-wrap items-center gap-4">
              {/* Urgency tier pills */}
              <div className="flex flex-wrap gap-2">
                {URGENCY_TIERS.map((tier) => (
                  <button
                    key={tier}
                    onClick={() => setUrgencyFilter(tier)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                      urgencyFilter === tier
                        ? "bg-gray-900 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    {tier === "all" ? "All" : tier.charAt(0).toUpperCase() + tier.slice(1)}
                  </button>
                ))}
              </div>

              {/* Deadline type dropdown */}
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">All Types</option>
                {Object.entries(DEADLINE_TYPE_LABELS).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>

              {/* Show acknowledged toggle */}
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showAcknowledged}
                  onChange={(e) => setShowAcknowledged(e.target.checked)}
                  className="rounded border-gray-300"
                />
                Show acknowledged
              </label>
            </div>
          </Card.Body>
        </Card>

        {/* Urgency legend */}
        <div className="flex flex-wrap gap-3 mb-4">
          {Object.entries(URGENCY_COLORS).map(([tier, color]) => (
            <div key={tier} className="flex items-center gap-1.5 text-xs text-gray-600">
              <span className="h-3 w-3 rounded-full inline-block" style={{ backgroundColor: color }} />
              {tier.charAt(0).toUpperCase() + tier.slice(1)}
            </div>
          ))}
        </div>

        {/* Calendar */}
        {isLoading ? (
          <div className="flex h-96 items-center justify-center">
            <Loading size="lg" text="Loading deadlines..." />
          </div>
        ) : (
          <Card className="shadow-sm overflow-hidden">
            <Card.Body className="p-4">
              <FullCalendar
                plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                headerToolbar={{
                  left:   "prev,next today",
                  center: "title",
                  right:  "dayGridMonth,timeGridWeek,listMonth",
                }}
                events={events}
                eventClick={handleEventClick}
                height="auto"
                dayMaxEvents={3}
                moreLinkClick="popover"
                nowIndicator
                eventTimeFormat={{ hour: undefined, minute: undefined, meridiem: false }}
              />
            </Card.Body>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
