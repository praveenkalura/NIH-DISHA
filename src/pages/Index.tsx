import { Header } from '@/components/Header';
import { ProjectForm } from '@/components/ProjectForm';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <ProjectForm />
      </main>
    </div>
  );
};

export default Index;
