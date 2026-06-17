import { Link } from "react-router-dom";
import { useDeadlines } from "../../hooks/useDeadlines";
import DeadlineUrgencyBadge from "./DeadlineUrgencyBadge";
import Card from "../common/Card";

export default function UpcomingDeadlinesSidebar() {
  const { data: deadlines = [], isLoading } = useDeadlines({ unacknowledged: true, limit: 5 });

  if (isLoading) return null;

  return (
    <Card>
      <Card.Header>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Upcoming Deadlines</h3>
          <Link to="/admin/calendar" className="text-xs text-primary hover:underline">
            View all
          </Link>
        </div>
      </Card.Header>
      <Card.Body className="divide-y divide-gray-100 p-0">
        {deadlines.length === 0 ? (
          <p className="px-4 py-6 text-center text-sm text-gray-500">No urgent deadlines.</p>
        ) : (
          deadlines.map((d) => (
            <Link
              key={d.id}
              to={`/admin/cases/${d.case_id}`}
              className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{d.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{d.due_date}</p>
              </div>
              <DeadlineUrgencyBadge urgency={d.urgency} />
            </Link>
          ))
        )}
      </Card.Body>
    </Card>
  );
}
