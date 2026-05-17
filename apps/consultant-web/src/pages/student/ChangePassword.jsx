import { useState } from "react";
import { useNavigate } from "react-router-dom";
import StudentLayout from "../../components/layout/StudentLayout";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "../../context/AuthContext";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const ChangePassword = () => {
  const { changePassword, updateUser, user } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (form.newPassword !== form.confirmPassword) {
      toast.error("The new passwords do not match.");
      return;
    }

    setSubmitting(true);
    const result = await changePassword(form.currentPassword, form.newPassword);

    if (result.success) {
      updateUser({ ...user, isFirstLogin: false });
      toast.success("Password updated. Redirecting to your dashboard…");
      setTimeout(() => navigate("/student/dashboard", { replace: true }), 1500);
    } else {
      toast.error(result.error || "Failed to change password.");
    }
    setSubmitting(false);
  };

  return (
    <StudentLayout>
      <div className="mx-auto w-full max-w-lg px-4 py-10 sm:px-6 lg:px-8">
        <Card>
          <CardHeader>
            <CardTitle>Update Your Password</CardTitle>
            <CardDescription>
              Your account uses a temporary password. Please create a permanent one
              to continue.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form id="change-password-form" className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-1">
                <Label htmlFor="currentPassword">
                  Current (Temporary) Password
                </Label>
                <Input
                  id="currentPassword"
                  name="currentPassword"
                  type="password"
                  required
                  value={form.currentPassword}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  required
                  minLength={6}
                  value={form.newPassword}
                  onChange={handleChange}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  minLength={6}
                  value={form.confirmPassword}
                  onChange={handleChange}
                />
              </div>
            </form>
          </CardContent>

          <CardFooter className="justify-end border-t pt-4">
            <Button
              type="submit"
              form="change-password-form"
              disabled={submitting}
            >
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Password
            </Button>
          </CardFooter>
        </Card>
      </div>
    </StudentLayout>
  );
};

export default ChangePassword;
