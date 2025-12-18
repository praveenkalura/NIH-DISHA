import { Header } from '@/components/Header';
import { SummaryTable } from '@/components/SummaryTable';

const SummaryPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <SummaryTable />
      </main>
    </div>
  );
};

export default SummaryPage;
