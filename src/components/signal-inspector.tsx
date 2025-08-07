"use client";

import * as React from 'react';
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { Loader2, Copy as CopyIcon } from 'lucide-react';
import heic2any from 'heic2any';
import * as EXIF from 'exif-js';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import type { ImageData, ReportData } from '@/types';

import { analyzeSignImage } from '@/ai/flows/analyze-sign-image';
import { summarizeRouteCondition } from '@/ai/flows/summarize-route-condition';
import { generateRepairMaterialsList } from '@/ai/flows/generate-repair-materials-list';
import { suggestSafetyGuidelines } from '@/ai/flows/suggest-safety-guidelines';

const MapDisplay = dynamic(() => import('@/components/map-display'), {
  ssr: false,
  loading: () => <div className="h-[400px] w-full bg-muted rounded-lg flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>,
});

export default function SignalInspector() {
  const [images, setImages] = React.useState<ImageData[]>([]);
  const [observations, setObservations] = React.useState('');
  const [reportData, setReportData] = React.useState<ReportData | null>(null);
  const [materialList, setMaterialList] = React.useState('');
  const [safetyGuidelines, setSafetyGuidelines] = React.useState('');
  
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = React.useState(false);
  const [isGeneratingActions, setIsGeneratingActions] = React.useState(false);

  const { toast } = useToast();

  const dmsToDd = React.useCallback((dms: any, ref: any): number | null => {
    if (!dms || !Array.isArray(dms) || dms.length !== 3) return null;

    const degrees = dms[0].numerator ? dms[0].numerator / dms[0].denominator : dms[0];
    const minutes = dms[1].numerator ? dms[1].numerator / dms[1].denominator : dms[1];
    const seconds = dms[2].numerator ? dms[2].numerator / dms[2].denominator : dms[2];

    let dd = degrees + minutes / 60 + seconds / 3600;
    
    if (ref === "S" || ref === "W") {
        dd = dd * -1;
    }
    return dd;
  }, []);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    setImages([]);
    setObservations('');
    setReportData(null);
    setMaterialList('');
    setSafetyGuidelines('');

    const imagePromises = Array.from(files).map((file, index) => {
      return new Promise<ImageData | null>(async (resolve) => {
        let fileToProcess = file;
        const isHeic = file.type === 'image/heic' || file.type === 'image/heif' || /\.(heic|heif)$/i.test(file.name);
        
        if (isHeic) {
          try {
            const conversionResult = await heic2any({ blob: file, toType: "image/jpeg" });
            fileToProcess = Array.isArray(conversionResult) ? conversionResult[0] : conversionResult;
          } catch (e) {
            console.error("HEIC Conversion Error:", e);
            resolve(null);
            return;
          }
        }
        
        const reader = new FileReader();
        reader.onload = (e) => {
          const src = e.target?.result as string;
          const imageData: ImageData = {
            id: index,
            file: fileToProcess,
            src,
            base64: src.split(',')[1],
            lat: null,
            lon: null,
            panelId: ``,
            panelIdParts: { type: '', route: '', carrefour: '', ensemble: '' },
          };

          EXIF.getData(file as any, function(this: any) {
              const lat = EXIF.getTag(this, "GPSLatitude");
              const lon = EXIF.getTag(this, "GPSLongitude");
              const latRef = EXIF.getTag(this, "GPSLatitudeRef");
              const lonRef = EXIF.getTag(this, "GPSLongitudeRef");

              if (lat && lon && latRef && lonRef) {
                imageData.lat = dmsToDd(lat, latRef);
                imageData.lon = dmsToDd(lon, lonRef);
              }
              resolve(imageData);
          });
        };
        reader.readAsDataURL(fileToProcess);
      });
    });

    const results = await Promise.all(imagePromises);
    setImages(results.filter((img): img is ImageData => img !== null));
  };
  
  const updatePanelIdPart = (index: number, part: keyof ImageData['panelIdParts'], value: string) => {
    setImages(prev => prev.map((img, i) => i === index ? { ...img, panelIdParts: { ...img.panelIdParts, [part]: value } } : img));
  };
  
  const getPanelId = (parts: ImageData['panelIdParts'], index: number) => {
    const { type, route, carrefour, ensemble } = parts;
    if (type && route && carrefour && ensemble) {
      return `${type.toUpperCase()}${route.padStart(3, '0')}-${carrefour.padStart(3, '0')}_${ensemble.padStart(2, '0')}`;
    }
    return `Panneau ${index + 1}`;
  };

  const handleAnalyzeRoute = async () => {
    if (images.length === 0) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Veuillez télécharger au moins une image.' });
      return;
    }

    setIsAnalyzing(true);
    setObservations("Analyse en cours, veuillez patienter...");

    const updatedImages = images.map((img, index) => ({...img, panelId: getPanelId(img.panelIdParts, index)}));
    setImages(updatedImages);

    const analyses = await Promise.all(updatedImages.map(async (image) => {
      try {
        const result = await analyzeSignImage({ photoDataUri: image.src, panelId: image.panelId });
        return { ...image, analysis: result.analysis };
      } catch (error) {
        console.error(`Error analyzing image ${image.panelId}:`, error);
        return { ...image, analysis: "Erreur lors de l'analyse." };
      }
    }));
    
    setImages(analyses);
    setObservations(analyses.map(img => `- ${img.panelId}: ${img.analysis}`).join('\n'));
    setIsAnalyzing(false);
  };

  const handleGenerateReport = async () => {
    if (!observations.trim() || observations === "Analyse en cours, veuillez patienter...") {
       toast({ variant: 'destructive', title: 'Erreur', description: "Veuillez analyser les images pour obtenir une synthèse." });
      return;
    }
    setIsGeneratingReport(true);
    setReportData(null);
    try {
      const result = await summarizeRouteCondition({ observations });
      setReportData(result);
    } catch(error) {
      console.error("Error generating report:", error);
      toast({ variant: 'destructive', title: 'Erreur', description: "Impossible de générer le rapport. Veuillez réessayer." });
    } finally {
      setIsGeneratingReport(false);
    }
  };

  const handleActionGeneration = async (type: 'material' | 'safety') => {
    if (!reportData?.priorities || reportData.priorities.length === 0) {
      toast({ variant: 'destructive', title: 'Erreur', description: "Aucune action prioritaire à traiter." });
      return;
    }
    setIsGeneratingActions(true);
    setMaterialList('');
    setSafetyGuidelines('');

    const defects = reportData.priorities.join(', ');

    try {
      if (type === 'material') {
        const result = await generateRepairMaterialsList({ defects });
        setMaterialList(result.materials);
      } else {
        const result = await suggestSafetyGuidelines({ maintenanceTasks: defects });
        setSafetyGuidelines(result.safetyGuidelines);
      }
    } catch(error) {
      console.error(`Error generating ${type}:`, error);
      toast({ variant: 'destructive', title: 'Erreur', description: `Impossible de générer ${type === 'material' ? 'la liste de matériel' : 'les consignes'}.` });
    } finally {
      setIsGeneratingActions(false);
    }
  };

  const handleCopyReport = () => {
    if (!reportData) return;
    const { summary, recommendation, priorities } = reportData;
    let textToCopy = `RAPPORT DE TOURNEE\n\n`;
    textToCopy += `Résumé de l'itinéraire: ${summary}\n`;
    textToCopy += `Recommandation générale: ${recommendation}\n\n`;
    textToCopy += `Actions prioritaires:\n`;
    priorities.forEach(item => { textToCopy += `- ${item}\n` });

    if (materialList) {
      textToCopy += `\nMatériel Nécessaire:\n${materialList}\n`;
    }
    if (safetyGuidelines) {
      textToCopy += `\nConsignes de Sécurité:\n${safetyGuidelines}\n`;
    }

    navigator.clipboard.writeText(textToCopy).then(() => {
      toast({ title: 'Copié !', description: 'Le rapport complet a été copié dans le presse-papiers.' });
    }, (err) => {
      console.error('Could not copy text: ', err);
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de copier le rapport.' });
    });
  };
  
  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-3xl font-bold text-primary text-center">Génération de Rapport de Tournée</CardTitle>
      </CardHeader>
      <CardContent className="p-6 md:p-8 space-y-8">
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-primary">Étape 1 : Télécharger les photos et identifier les panneaux ✨</h3>
          <p className="text-slate-600">Sélectionnez les photos (JPEG, PNG, HEIC). Entrez l'identifiant pour chaque panneau.</p>
          <Input 
            type="file" 
            id="imageUpload" 
            accept="image/*,.heic,.heif" 
            multiple 
            onChange={handleImageUpload} 
            className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-accent file:text-accent-foreground hover:file:bg-destructive hover:file:text-destructive-foreground cursor-pointer"
          />
        </div>

        {images.length > 0 && (
          <div className="space-y-6">
            <div>
              <h4 className="font-semibold text-slate-700 mb-2">Galerie de l'itinéraire :</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {images.map((image, index) => (
                  <div key={image.id} className="space-y-2">
                    <Image src={image.src} alt={`Panneau ${image.id + 1}`} width={150} height={150} className="rounded-lg object-cover aspect-square" data-ai-hint="road sign" />
                    <div className="grid grid-cols-2 gap-1">
                      <Input type="text" value={image.panelIdParts.type} onChange={e => updatePanelIdPart(index, 'type', e.target.value)} placeholder="T" className="id-input" maxLength={2} />
                      <Input type="text" value={image.panelIdParts.route} onChange={e => updatePanelIdPart(index, 'route', e.target.value)} placeholder="Route" className="id-input" />
                      <Input type="text" value={image.panelIdParts.carrefour} onChange={e => updatePanelIdPart(index, 'carrefour', e.target.value)} placeholder="Carr." className="id-input" />
                      <Input type="text" value={image.panelIdParts.ensemble} onChange={e => updatePanelIdPart(index, 'ensemble', e.target.value)} placeholder="Ens." className="id-input" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="font-semibold text-slate-700 mb-2">Carte de l'itinéraire :</h4>
              <MapDisplay images={images} />
            </div>
          </div>
        )}

        <div className="space-y-4">
          <h3 className="text-xl font-bold text-primary">Étape 2 : Analyse par IA</h3>
          <Button onClick={handleAnalyzeRoute} disabled={images.length === 0 || isAnalyzing} className="w-full bg-primary text-primary-foreground font-bold py-3 px-6 text-base hover:bg-secondary hover:text-primary transition-all duration-300">
            {isAnalyzing && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
            Analyser l'Itinéraire
          </Button>
        </div>

        <div className="space-y-4">
          <h3 className="text-xl font-bold text-primary">Étape 3 : Synthèse des Observations</h3>
          <p className="text-slate-600">L'IA a résumé les défauts constatés. Vérifiez et complétez si nécessaire.</p>
          <Textarea 
            id="observations"
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
            className="h-32 focus:ring-2 focus:ring-ring"
            placeholder="La synthèse des analyses d'images apparaîtra ici..."
          />
        </div>
        
        <div className="space-y-4">
          <h3 className="text-xl font-bold text-primary">Étape 4 : Générer le Rapport de Tournée</h3>
          <Button onClick={handleGenerateReport} disabled={!observations || isGeneratingReport || isAnalyzing} className="w-full bg-primary text-primary-foreground font-bold py-3 px-6 text-base hover:bg-secondary hover:text-primary transition-all duration-300">
            {isGeneratingReport && <Loader2 className="mr-2 h-5 w-5 animate-spin" />}
            Générer le Rapport
          </Button>
        </div>

        {isGeneratingReport && <div className="flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>}

        {reportData && (
          <div className="mt-6 bg-slate-50 p-6 rounded-lg border">
            <h3 className="text-2xl font-bold text-primary mb-4">Rapport de Tournée Généré</h3>
            <div className="space-y-4">
              <div>
                <h4 className="font-bold text-slate-800">Résumé de l'Itinéraire :</h4>
                <p className="text-lg text-slate-700">{reportData.summary}</p>
              </div>
              <div>
                <h4 className="font-bold text-slate-800">Recommandation Générale :</h4>
                <p className="text-lg text-slate-700">{reportData.recommendation}</p>
              </div>
              <div>
                <h4 className="font-bold text-slate-800">Actions Prioritaires :</h4>
                <ul className="list-disc list-inside space-y-1 text-slate-700">
                  {reportData.priorities.map((item, i) => <li key={i}>{item}</li>)}
                </ul>
              </div>
            </div>

            <div className="mt-6 border-t pt-6 space-y-4">
                <h3 className="text-xl font-bold text-primary">Planification des Interventions ✨</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Button onClick={() => handleActionGeneration('material')} disabled={isGeneratingActions} className="bg-accent text-accent-foreground font-bold hover:bg-destructive hover:text-destructive-foreground transition-all duration-300">
                        {isGeneratingActions && materialList === '' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Lister le Matériel
                    </Button>
                    <Button onClick={() => handleActionGeneration('safety')} disabled={isGeneratingActions} className="bg-accent text-accent-foreground font-bold hover:bg-destructive hover:text-destructive-foreground transition-all duration-300">
                        {isGeneratingActions && safetyGuidelines === '' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Générer Consignes de Sécurité
                    </Button>
                </div>
                {isGeneratingActions && <div className="flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-accent" /></div>}
                
                <div className="space-y-4">
                  {materialList && (
                    <div className="bg-white p-4 rounded-lg">
                      <h4 className="font-bold text-slate-800">Matériel Nécessaire :</h4>
                      <p className="whitespace-pre-wrap">{materialList}</p>
                    </div>
                  )}
                  {safetyGuidelines && (
                    <div className="bg-white p-4 rounded-lg">
                      <h4 className="font-bold text-slate-800">Consignes de Sécurité :</h4>
                      <p className="whitespace-pre-wrap">{safetyGuidelines}</p>
                    </div>
                  )}
                </div>
            </div>

            <Button onClick={handleCopyReport} className="mt-6 w-full bg-secondary text-secondary-foreground font-bold py-3 px-6 text-base hover:bg-primary transition-all duration-300">
              <CopyIcon className="mr-2 h-5 w-5"/>
              Copier le Rapport Complet
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
