import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="text-center rounded-2xl border border-border/80 bg-card/80 shadow-sm px-10 py-12">
        <h1 className="mb-3 text-4xl font-bold tracking-tight">404</h1>
        <p className="mb-6 text-muted-foreground">This page does not exist</p>
        <Link to="/" className="text-primary font-medium underline underline-offset-4 hover:text-primary/90">
          Return to Home
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
