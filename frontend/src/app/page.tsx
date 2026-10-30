import { AISection } from "@/components/landing/AISection";
import { CitySwitcher } from "@/components/landing/CitySwitcher";
import { CityTicker } from "@/components/landing/CityTicker";
import { FAQ } from "@/components/landing/FAQ";
import { Features } from "@/components/landing/Features";
import { FinalCTA } from "@/components/landing/FinalCTA";
import { Footer } from "@/components/landing/Footer";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Navbar } from "@/components/landing/Navbar";
import { Privacy } from "@/components/landing/Privacy";
import { ReportPreview } from "@/components/landing/ReportPreview";
import { MotionProvider } from "@/components/ui/Motion";

export default function LandingPage() {
  return (
    <MotionProvider>
      <Navbar />
      <main>
        <Hero />
        <CityTicker />
        <HowItWorks />
        <AISection />
        <CitySwitcher />
        <ReportPreview />
        <Features />
        <Privacy />
        <FAQ />
        <FinalCTA />
      </main>
      <Footer />
    </MotionProvider>
  );
}
