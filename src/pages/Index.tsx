import { LandingHeader } from "@/features/landing/components/LandingHeader";
import { Hero } from "@/features/landing/components/Hero";
import { SocialProof } from "@/features/landing/components/SocialProof";
import { Features } from "@/features/landing/components/Features";
import { Comparison } from "@/features/landing/components/Comparison";
import { HowItWorks } from "@/features/landing/components/HowItWorks";
import { CtaSection } from "@/features/landing/components/CtaSection";
import { LandingFooter } from "@/features/landing/components/LandingFooter";

const Index = () => {
  return (
    <main className="min-h-screen bg-background">
      <LandingHeader />
      <Hero />
      <SocialProof />
      <Features />
      <HowItWorks />
      <Comparison />
      <CtaSection />
      <LandingFooter />
    </main>
  );
};

export default Index;
