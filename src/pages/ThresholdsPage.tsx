import { Header } from '@/components/Header';
import { ThresholdsForm } from '@/components/ThresholdsForm';

const ThresholdsPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        <ThresholdsForm />
      </main>
    </div>
  );
};

export default ThresholdsPage;
