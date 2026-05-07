import { useEffect, useState } from "react";
import AdminLayout from "../../components/layout/AdminLayout";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import Loading from "../../components/common/Loading";
import { studentService } from "../../services/authService";

const ContactRequests = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [actionId, setActionId] = useState("");

  const fetchRequests = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await studentService.getPendingContacts();
      setRequests(data);
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Failed to load contact requests. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleApprove = async (id) => {
    setActionId(id);
    setFeedback(null);

    try {
      const response = await studentService.approveContactRequest(id);
      setRequests((prev) => prev.filter((request) => request._id !== id));
      const name =
        response.student.contactInfo?.name || response.student.email || "Client";
      setFeedback({
        type: "success",
        message: (
          <div className="space-y-2">
            <p>
              {name}&apos;s access has been approved. A welcome email with
              login instructions was sent automatically.
            </p>
            {!response.inviteSent && (
              <p className="text-sm text-gray-600">
                We couldn&apos;t deliver the email automatically. Ask the student to
                visit the login page and request a new sign-in link using their
                email address.
              </p>
            )}
          </div>
        ),
      });
    } catch (err) {
      const message =
        err.response?.data?.message ||
        "Failed to approve the request. Please try again.";
      setFeedback({ type: "error", message });
    } finally {
      setActionId("");
    }
  };

  return (
    <AdminLayout>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Contact Requests
          </h1>
          <p className="mt-2 text-gray-600">
            Review prospective student enquiries and grant access when they are
            ready to begin onboarding.
          </p>
        </div>

        {feedback && (
          <Card className="mb-6 border-gray-100">
            <Card.Body>
              <div
                className={`rounded-md border px-4 py-3 text-sm ${
                  feedback.type === "success"
                    ? "border-green-200 bg-green-50 text-green-700"
                    : "border-red-200 bg-red-50 text-red-700"
                }`}
              >
                {feedback.message}
              </div>
            </Card.Body>
          </Card>
        )}

        {loading ? (
          <div className="flex h-72 items-center justify-center">
            <Loading size="lg" text="Fetching contact requests..." />
          </div>
        ) : error ? (
          <Card className="border-red-200 bg-red-50">
            <Card.Body>
              <p className="text-sm text-red-700">{error}</p>
              <div className="mt-4">
                <Button variant="outline" onClick={fetchRequests}>
                  Retry
                </Button>
              </div>
            </Card.Body>
          </Card>
        ) : requests.length === 0 ? (
          <Card className="border-gray-100">
            <Card.Body className="text-center py-16">
              <h2 className="text-xl font-semibold text-gray-900">
                No pending contact requests
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                New enquiries submitted from the website will appear here for
                approval.
              </p>
            </Card.Body>
          </Card>
        ) : (
          <div className="grid gap-6">
            {requests.map((request) => (
              <Card key={request._id} className="border-gray-100">
                <Card.Body className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                        {request.contactInfo?.name
                          ?.split(" ")
                          .map((part) => part[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase() || "CL"}
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-gray-900">
                          {request.contactInfo?.name || "Unnamed Client"}
                        </p>
                        <p className="text-sm text-gray-500">
                          Submitted{" "}
                          {new Date(request.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 grid gap-3 text-sm text-gray-600 sm:grid-cols-2">
                      <div>
                        <p className="font-medium text-gray-900">Email</p>
                        <p>{request.contactInfo?.email}</p>
                      </div>
                      {request.contactInfo?.phone && (
                        <div>
                          <p className="font-medium text-gray-900">Phone</p>
                          <p>{request.contactInfo.phone}</p>
                        </div>
                      )}
                      {request.contactInfo?.message && (
                        <div className="sm:col-span-2">
                          <p className="font-medium text-gray-900">
                            Notes from client
                          </p>
                          <p className="mt-1 whitespace-pre-line">
                            {request.contactInfo.message}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <Button
                      variant="primary"
                      onClick={() => handleApprove(request._id)}
                      loading={actionId === request._id}
                      disabled={actionId === request._id}
                    >
                      Approve &amp; Send Access
                    </Button>
                    <p className="text-xs text-gray-500">
                      Approving sends login instructions to the email above.
                    </p>
                  </div>
                </Card.Body>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default ContactRequests;
