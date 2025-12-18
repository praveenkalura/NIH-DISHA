import { Header } from '@/components/Header';
import { Dashboard } from '@/components/Dashboard';

const DashboardPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <Dashboard />
      </main>
    </div>
  );
};

export default DashboardPage;
