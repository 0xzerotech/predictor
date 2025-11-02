import { Link } from "react-router-dom";
import { Compass, ArrowLeft } from "lucide-react";

export const NotFoundPage = () => (
  <div className="flex flex-col items-center justify-center gap-6 py-20 text-center">
    <div className="relative flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-white/10">
      <Compass className="h-7 w-7 text-neon" />
    </div>
    <div className="space-y-3">
      <h1 className="font-display text-4xl text-white">Signal lost in the hype field</h1>
      <p className="max-w-xl text-sm text-white/60">
        The view you were looking for has slipped into undiscovered territory. Jump back to the main console to continue exploring
        live prediction surfaces.
      </p>
    </div>
    <div className="flex flex-wrap items-center justify-center gap-3">
      <Link to="/" className="btn inline-flex items-center gap-2">
        <ArrowLeft className="h-4 w-4" />
        Return home
      </Link>
      <Link to="/markets" className="btn inline-flex items-center gap-2">
        Explore markets
      </Link>
    </div>
  </div>
);

export default NotFoundPage;

