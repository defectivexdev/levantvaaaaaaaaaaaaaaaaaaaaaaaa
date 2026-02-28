import Navbar from '@/components/Navbar';
import Hero from '@/components/Hero';
import About from '@/components/About';
import Services from '@/components/Services';
import MapSection from '@/components/MapSection';
import Partners from '@/components/Partners';
import Community from '@/components/Community';
import Footer from '@/components/Footer';

export default function Home() {
    return (
        <main className="min-h-screen">
            <Navbar />
            <Hero />
            <About />
            <Services />
            <MapSection />
            <Partners />
            <Community />
            <Footer />
        </main>
    );
}
