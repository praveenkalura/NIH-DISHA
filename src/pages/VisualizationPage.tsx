import { Header } from '@/components/Header';
import { Visualization } from '@/components/Visualization';

const VisualizationPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <Visualization />
      </main>
    </div>
  );
};

export default VisualizationPage;
