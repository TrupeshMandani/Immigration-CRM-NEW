import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import AdminLayout from "../../components/layout/AdminLayout";
import Card from "../../components/common/Card";
import Button from "../../components/common/Button";
import { useCreateStudent } from "../../hooks/useStudents";

const schema = z.object({
  name: z.string().min(1, "Full name is required"),
  email: z.string().email("Must be a valid email"),
  phone: z.string().optional(),
  message: z.string().optional(),
});

const CreateStudent = () => {
  const navigate = useNavigate();
  const createStudent = useCreateStudent();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async (values) => {
    try {
      const response = await createStudent.mutateAsync(values);
      toast.success("Student created successfully.");
      const studentId = response?.student?.id ?? response?.student?._id;
      navigate(studentId ? `/admin/students/${studentId}` : "/admin/students");
    } catch (err) {
      toast.error(err?.message || "Failed to create student.");
    }
  };

  return (
    <AdminLayout>
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Create New Student</h1>
          <p className="text-gray-600 mt-2">
            Add a new student to your immigration CRM system
          </p>
        </div>

        <Card>
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
            <Card.Header>
              <h2 className="text-xl font-semibold">Student Information</h2>
            </Card.Header>

            <Card.Body className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="name"
                    type="text"
                    {...register("name")}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                    placeholder="Enter full name"
                  />
                  {errors.name && (
                    <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="email"
                    type="email"
                    {...register("email")}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                    placeholder="Enter email address"
                  />
                  {errors.email && (
                    <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <input
                  id="phone"
                  type="tel"
                  {...register("phone")}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                  placeholder="Enter phone number"
                />
              </div>

              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
                  Initial Message
                </label>
                <textarea
                  id="message"
                  rows={3}
                  {...register("message")}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
                  placeholder="Enter any initial message or notes"
                />
              </div>

              <div className="border-t pt-6 text-sm text-gray-600">
                Login instructions are emailed to the student automatically once the profile is created.
              </div>
            </Card.Body>

            <Card.Footer>
              <div className="flex justify-end space-x-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/admin/students")}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  loading={isSubmitting}
                  disabled={isSubmitting}
                >
                  Create Student
                </Button>
              </div>
            </Card.Footer>
          </form>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default CreateStudent;
