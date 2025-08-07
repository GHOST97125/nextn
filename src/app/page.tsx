import SignalInspector from '@/components/signal-inspector';

export default function Home() {
  return (
    <div className="container mx-auto p-4 md:p-8">
      <header className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-black text-primary mb-2 font-headline">
          Guide d'Inspection par Itinéraire
        </h1>
        <p className="text-xl md:text-2xl font-semibold text-slate-600">
          Un outil terrain intelligent pour les tournées de maintenance.
        </p>
      </header>

      <main className="space-y-16">
        <SignalInspector />
      </main>

      <footer className="text-center mt-16 text-slate-500">
        <p>
          Cette maquette est une adaptation de l'Annexe Technique - Critères
          d'Inspection Visuelle.
        </p>
      </footer>
    </div>
  );
}

