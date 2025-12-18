import { useParams } from 'react-router-dom';
import { Header } from '@/components/Header';
import { IndicatorDetail } from '@/components/IndicatorDetail';
import { AdequacyDetail } from '@/components/AdequacyDetail';
import { ProductivityDetail } from '@/components/ProductivityDetail';
import { CroppingIntensityDetail } from '@/components/CroppingIntensityDetail';

const IndicatorPage = () => {
  const { indicatorId } = useParams<{ indicatorId: string }>();
  
  // Use specialized components for specific indicators
  const isAdequacy = indicatorId === 'adequacy';
  const isProductivity = indicatorId === 'productivity';
  const isCroppingIntensity = indicatorId === 'cropping_intensity';

  const renderContent = () => {
    if (isAdequacy) return <AdequacyDetail />;
    if (isProductivity) return <ProductivityDetail />;
    if (isCroppingIntensity) return <CroppingIntensityDetail />;
    return <IndicatorDetail />;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-5xl">
        {renderContent()}
      </main>
    </div>
  );
};

export default IndicatorPage;
