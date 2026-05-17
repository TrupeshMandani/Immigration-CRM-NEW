import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const NotFound = () => (
  <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
    <div className="max-w-md text-center">
      <p className="text-6xl font-bold text-primary">404</p>
      <h1 className="mt-4 text-2xl font-semibold text-foreground">
        Page Not Found
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <div className="mt-8">
        <Button asChild>
          <Link to="/">Return Home</Link>
        </Button>
      </div>
    </div>
  </div>
);

export default NotFound;
