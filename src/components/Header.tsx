import { Droplets } from 'lucide-react';

export function Header() {
  return (
    <header className="bg-primary text-primary-foreground shadow-lg">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary-foreground/10 rounded-full">
            <Droplets className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              NIH-DISHA
            </h1>
            <p className="text-sm text-primary-foreground/80">
              Dashboard for Irrigation Scheme Health Assessment
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
