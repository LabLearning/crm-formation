'use client'

import { useState, useMemo, useEffect } from 'react'
import { Calculator, Building2, Users, AlertTriangle, FileText, RotateCcw, Check, X, UtensilsCrossed, Beef, Croissant, Cake, Coffee } from 'lucide-react'
import { Button, Badge, Modal } from '@/components/ui'
import { cn } from '@/lib/utils'

const CFG: Record<string, any> = {
  boucherie: { label: 'Boucherie / Charcuterie', opco: 'OPCO EP', idcc: 992, plafond: { '<11': 5000, '11-49': 5000 }, dirDefault: 'fafcea', contraintes: ['Pas de distanciel', 'Durée mini 4h'], cats: [{ id: 'bc-tech', nom: 'Stages techniques', r: 60, t: 'Métier' }, { id: 'bc-trac', nom: 'Traçabilité', r: 50, t: 'Métier' }, { id: 'bc-hyg', nom: 'Hygiène', r: 50, t: 'Métier' }, { id: 'bc-pms', nom: 'PMS / Sécurité', r: 50, t: 'Métier' }, { id: 'bc-mgt', nom: 'Management', r: 25, t: 'Transverse' }, { id: 'bc-ges', nom: 'Gestion', r: 25, t: 'Transverse' }, { id: 'bc-du', nom: 'Document unique', r: 20, t: 'Transverse' }] },
  boulangerie: { label: 'Boulangerie artisanale', opco: 'OPCO EP', idcc: 843, plafond: { default: 3500 }, dirDefault: 'fafcea', contraintes: [], cats: [{ id: 'bl-fab', nom: 'Techniques fabrication', r: 50, t: 'Métier' }, { id: 'bl-ven', nom: 'Vente / Communication', r: 40, t: 'Métier' }, { id: 'bl-ges', nom: 'Gestion', r: 40, t: 'Métier' }, { id: 'bl-hyg', nom: 'Hygiène & sécurité', r: 30, t: 'Métier' }, { id: 'bl-eco', nom: 'Transition écologique', r: 40, t: 'Métier' }, { id: 'bl-soc', nom: 'Formations socle', r: 25, t: 'Transverse' }] },
  patisserie: { label: 'Pâtisserie artisanale', opco: 'OPCO EP', idcc: 1267, plafond: { '<11': 2000, '11-49': 3000 }, dirDefault: 'fafcea', contraintes: ['Durée mini 4h', 'Aucun frais annexe'], cats: [{ id: 'pt-fab', nom: 'Fabrication', r: 50, t: 'Métier' }, { id: 'pt-hyg', nom: 'Hygiène', r: 30, t: 'Métier' }, { id: 'pt-eti', nom: 'Étiquetage', r: 50, t: 'Métier' }, { id: 'pt-dec', nom: 'Décoration', r: 50, t: 'Métier' }, { id: 'pt-ven', nom: 'Vente', r: 50, t: 'Métier' }, { id: 'pt-acc', nom: 'Accueil', r: 30, t: 'Métier' }, { id: 'pt-ges', nom: 'Gestion', r: 30, t: 'Transverse' }, { id: 'pt-mgt', nom: 'Management', r: 30, t: 'Transverse' }, { id: 'pt-info', nom: 'Informatique', r: 30, t: 'Transverse' }] },
  hcr: { label: 'HCR (Hôtellerie-Restauration)', opco: 'AKTO', idcc: 1979, plafond: { '<11': 2000, '11-49': 3000 }, dirDefault: 'agefice', contraintes: ['Forfait 1 000 €/jour', '<11 = max 2j', '11-49 = max 3j'], dayRate: 1000, cats: [] },
  restauration_rapide: { label: 'Restauration rapide', opco: 'AKTO', idcc: 1501, plafond: { '<11': 4000, '11-49': 9000 }, dirDefault: 'agefice', contraintes: ['Budget 2026', '25 €/h par personne'], rateH: 25, cats: [] },
}
const FAFCEA = { maxH: 54, rTech: 60, rTrans: 25 }
interface Formation { id: string; nm: string; h?: number; hOpt?: number[]; cat: string; fc?: string; grp: string; pri: number; isHyg7?: boolean; isHygLong?: boolean }
const CATA: Record<string, Formation[]> = {
  restauration_rapide: [
    { id:'rr-1',nm:'Hygiène alimentaire & bonnes pratiques',h:7,cat:'hygiene',grp:'conformite',pri:2,isHyg7:true },
    { id:'rr-2',nm:'Méthode HACCP & PMS',hOpt:[14,21],cat:'hygiene',grp:'conformite',pri:1,isHygLong:true },
    { id:'rr-3',nm:'SST – Sauveteur Secouriste du Travail',h:14,cat:'reglementaire',grp:'conformite',pri:2 },
    { id:'rr-4',nm:'Techniques culinaires en restauration rapide',h:7,cat:'metier',grp:'competence',pri:1 },
    { id:'rr-5',nm:'Élaboration et mise à jour du DUERP',h:7,cat:'reglementaire',grp:'conformite',pri:2 },
    { id:'rr-6',nm:'IA simplifiée pour fast-food',h:14,cat:'performance',grp:'competence',pri:3 },
    { id:'rr-7',nm:'Gestes & postures – Prévention TMS',h:7,cat:'reglementaire',grp:'conformite',pri:2 },
    { id:'rr-8',nm:'Organisation & management en service',h:14,cat:'management',grp:'competence',pri:3 },
    { id:'rr-9',nm:'Gestion des stocks & rentabilité',h:14,cat:'performance',grp:'competence',pri:3 },
    { id:'rr-10',nm:'Qualité de service & vente additionnelle',h:7,cat:'performance',grp:'competence',pri:3 },
    { id:'rr-11',nm:'Outils digitaux & IA',h:7,cat:'performance',grp:'competence',pri:4 },
    { id:'rr-12',nm:'Cadre légal restauration rapide',h:7,cat:'reglementaire',grp:'conformite',pri:2 },
    { id:'rr-13',nm:'Sécurité incendie et évacuation',h:4,cat:'reglementaire',grp:'conformite',pri:2 },
  ],
  hcr: [
    { id:'hcr-1',nm:'Hygiène alimentaire et bonnes pratiques',h:7,cat:'hygiene',grp:'conformite',pri:2,isHyg7:true },
    { id:'hcr-2',nm:'Hygiène alimentaire – HACCP et PMS',hOpt:[14,21],cat:'hygiene',grp:'conformite',pri:1,isHygLong:true },
    { id:'hcr-3',nm:'DUERP – Élaboration et mise à jour',h:7,cat:'reglementaire',grp:'conformite',pri:2 },
    { id:'hcr-4',nm:'Sécurité incendie et évacuation',h:3.5,cat:'reglementaire',grp:'conformite',pri:2 },
    { id:'hcr-5',nm:'Gestes et postures – Prévention TMS',h:7,cat:'reglementaire',grp:'conformite',pri:2 },
    { id:'hcr-6',nm:'SST – Sauveteur Secouriste du Travail',h:14,cat:'reglementaire',grp:'conformite',pri:2 },
    { id:'hcr-7',nm:'Management de proximité en restauration',h:14,cat:'management',grp:'competence',pri:3 },
    { id:'hcr-8',nm:'Organisation du service et gestion du rush',h:7,cat:'metier',grp:'competence',pri:1 },
    { id:'hcr-9',nm:'Gestion des stocks et rentabilité',h:14,cat:'performance',grp:'competence',pri:3 },
    { id:'hcr-10',nm:'Excellence du service client',h:21,cat:'performance',grp:'competence',pri:1 },
    { id:'hcr-11',nm:'Gestion du stress et des conflits',h:14,cat:'transverse',grp:'competence',pri:4 },
    { id:'hcr-12',nm:'Anglais professionnel en restauration',h:14,cat:'transverse',grp:'competence',pri:4 },
    { id:'hcr-13',nm:'Cadre légal restauration',h:7,cat:'reglementaire',grp:'conformite',pri:2 },
    { id:'hcr-14',nm:'IA simplifiée pour la restauration',h:14,cat:'performance',grp:'competence',pri:3 },
    { id:'hcr-15',nm:'Techniques culinaires classiques',h:14,cat:'metier',grp:'competence',pri:1 },
  ],
  boucherie: [
    { id:'bo-1',nm:'Découpe, désossage & parage',hOpt:[7,14,21],cat:'metier',fc:'bc-tech',grp:'competence',pri:1 },
    { id:'bo-2',nm:'Préparations bouchères & traiteur',hOpt:[7,14,21],cat:'metier',fc:'bc-tech',grp:'competence',pri:1 },
    { id:'bo-3',nm:'Organisation du laboratoire & flux',hOpt:[7,14,21],cat:'metier',fc:'bc-tech',grp:'competence',pri:1 },
    { id:'bo-4',nm:'Techniques de charcuterie artisanale',hOpt:[7,14,21],cat:'metier',fc:'bc-tech',grp:'competence',pri:1 },
    { id:'bo-5',nm:'HACCP & PMS en boucherie',hOpt:[7,14,21],cat:'hygiene',fc:'bc-pms',grp:'conformite',pri:2,isHygLong:true },
    { id:'bo-6',nm:'Plan de nettoyage-désinfection',hOpt:[7,14,21],cat:'hygiene',fc:'bc-hyg',grp:'conformite',pri:2 },
    { id:'bo-7',nm:'Chaîne du froid & maîtrise risques',hOpt:[7,14,21],cat:'hygiene',fc:'bc-hyg',grp:'conformite',pri:2 },
    { id:'bo-8',nm:'Traçabilité, DLC & retrait/rappel',hOpt:[7,14,21],cat:'reglementaire',fc:'bc-trac',grp:'conformite',pri:2 },
    { id:'bo-9',nm:'Étiquetage, allergènes & INCO',hOpt:[7,14,21],cat:'reglementaire',fc:'bc-trac',grp:'conformite',pri:2 },
    { id:'bo-10',nm:'Sécurité au poste : couteaux, scie',hOpt:[7,14,21],cat:'reglementaire',fc:'bc-tech',grp:'conformite',pri:2 },
    { id:'bo-11',nm:'Gestes et postures – TMS boucherie',hOpt:[7,14,21],cat:'reglementaire',fc:'bc-hyg',grp:'conformite',pri:2 },
    { id:'bo-12',nm:'DUERP – Risques professionnels',hOpt:[7,14,21],cat:'reglementaire',fc:'bc-du',grp:'conformite',pri:2 },
    { id:'bo-13',nm:'Vente-conseil au comptoir',hOpt:[7,14,21],cat:'performance',fc:'bc-ges',grp:'competence',pri:3 },
    { id:'bo-14',nm:'Merchandising vitrine',hOpt:[7,14,21],cat:'performance',fc:'bc-ges',grp:'competence',pri:3 },
    { id:'bo-15',nm:'Gestion des stocks & inventaires',hOpt:[7,14,21],cat:'performance',fc:'bc-ges',grp:'competence',pri:3 },
    { id:'bo-16',nm:'Pilotage : marge, rendement, pricing',hOpt:[7,14,21],cat:'performance',fc:'bc-ges',grp:'competence',pri:3 },
    { id:'bo-17',nm:"Management d'équipe & intégration",hOpt:[7,14,21],cat:'management',fc:'bc-mgt',grp:'competence',pri:3 },
    { id:'bo-18',nm:'SST + MAC SST',hOpt:[14,7],cat:'reglementaire',fc:'bc-hyg',grp:'conformite',pri:2 },
  ],
  boulangerie: [
    { id:'bl-1',nm:'Hygiène et Bonnes Pratiques',h:7,cat:'hygiene',fc:'bl-hyg',grp:'conformite',pri:2,isHyg7:true },
    { id:'bl-2',nm:'Traçabilité et Gestion Produits',h:7,cat:'reglementaire',fc:'bl-hyg',grp:'conformite',pri:2 },
    { id:'bl-3',nm:'Prévention Risques Professionnels',h:7,cat:'reglementaire',fc:'bl-hyg',grp:'competence',pri:2 },
    { id:'bl-4',nm:'Techniques de Vente',h:7,cat:'performance',fc:'bl-ven',grp:'competence',pri:3 },
    { id:'bl-5',nm:'Présentation Produits & Merchandising',h:7,cat:'performance',fc:'bl-ven',grp:'competence',pri:3 },
    { id:'bl-6',nm:'Connaissance des Produits',h:7,cat:'metier',fc:'bl-fab',grp:'competence',pri:1 },
    { id:'bl-7',nm:'Transition Écologique',h:14,cat:'transverse',fc:'bl-eco',grp:'competence',pri:4 },
    { id:'bl-8',nm:"Management d'équipe",h:14,cat:'management',fc:'bl-soc',grp:'competence',pri:3 },
    { id:'bl-9',nm:'Comptabilité, Gestion, Rentabilité',h:14,cat:'performance',fc:'bl-ges',grp:'competence',pri:3 },
  ],
  patisserie: [
    { id:'pa-1',nm:'Techniques de fabrication',hOpt:[7,14,21],cat:'metier',fc:'pt-fab',grp:'competence',pri:1 },
    { id:'pa-2',nm:'Hygiène & Sécurité alimentaire',hOpt:[7,14,21],cat:'hygiene',fc:'pt-hyg',grp:'conformite',pri:2,isHygLong:true },
    { id:'pa-3',nm:'Traçabilité & étiquetage',h:7,cat:'reglementaire',fc:'pt-eti',grp:'conformite',pri:2 },
    { id:'pa-4',nm:'Magasinage / décoration vitrine',h:7,cat:'performance',fc:'pt-dec',grp:'competence',pri:3 },
    { id:'pa-5',nm:'Label qualité / innovation',h:7,cat:'metier',fc:'pt-fab',grp:'competence',pri:3 },
    { id:'pa-6',nm:'Techniques de vente',h:7,cat:'performance',fc:'pt-ven',grp:'competence',pri:3 },
    { id:'pa-7',nm:"Pilotage d'entreprise",h:7,cat:'performance',fc:'pt-ges',grp:'competence',pri:3 },
    { id:'pa-8',nm:'Management',h:7,cat:'management',fc:'pt-mgt',grp:'competence',pri:3 },
    { id:'pa-9',nm:'Accueil / Communication',h:7,cat:'performance',fc:'pt-acc',grp:'competence',pri:3 },
    { id:'pa-10',nm:'Informatique / Réseaux sociaux',h:7,cat:'transverse',fc:'pt-info',grp:'competence',pri:4 },
    { id:'pa-11',nm:'Bureautique / Comptabilité',h:7,cat:'transverse',fc:'pt-info',grp:'competence',pri:4 },
    { id:'pa-12',nm:'Secourisme',h:7,cat:'reglementaire',fc:'pt-hyg',grp:'conformite',pri:2 },
  ],
}
const CAT_COLORS: Record<string,string> = { metier:'#195144', hygiene:'#047857', reglementaire:'#92400e', performance:'#9a3412', management:'#5b21b6', transverse:'#6b7280' }
const CAT_LABELS: Record<string,string> = { metier:'Métier', hygiene:'Hygiène', reglementaire:'Réglementaire', performance:'Performance', management:'Management', transverse:'Transverse' }
const ACT_ICON_MAP: Record<string, React.ReactNode> = {
  boucherie: <Beef className="h-7 w-7 text-surface-600" />,
  boulangerie: <Croissant className="h-7 w-7 text-surface-600" />,
  patisserie: <Cake className="h-7 w-7 text-surface-600" />,
  hcr: <UtensilsCrossed className="h-7 w-7 text-surface-600" />,
  restauration_rapide: <Coffee className="h-7 w-7 text-surface-600" />,
}
function getH(f:Formation){ return f.hOpt?f.hOpt[0]:f.h||7 }
function getRate(f:Formation,act:string){ if(act==='hcr')return 1000; if(act==='restauration_rapide')return 25; const c=CFG[act]; if(!c?.cats||!f.fc)return 0; const cat=c.cats.find((x:any)=>x.id===f.fc); return cat?cat.r:0 }
function getPlafond(act:string,tr:string){ const c=CFG[act]; if(!c)return 0; return c.plafond?.default||c.plafond?.[tr]||c.plafond?.['<11']||0 }
function getCost(h:number,f:Formation,act:string,nb:number){ if(act==='hcr')return Math.ceil(h/7)*1000; if(act==='restauration_rapide')return h*25*nb; const r=getRate(f,act); return h*r*nb }
const fmt=(n:number)=>new Intl.NumberFormat('fr-FR').format(Math.round(n))

interface Sel { lineId:string; id:string; nm:string; h:number; grp:string; cat:string; cost:number; nb:number }

export default function SimulateurBudgetPage(){
  const [act,setAct]=useState('')
  const [etab,setEtab]=useState('')
  const [effectif,setEffectif]=useState('')
  const [tranche,setTranche]=useState<'<11'|'11-49'>('<11')
  const [nbSal,setNbSal]=useState(1)
  const [hasDir,setHasDir]=useState(false)
  const [dirBudget,setDirBudget]=useState('fafcea')
  const [sel,setSel]=useState<Sel[]>([])
  const [showDevis,setShowDevis]=useState(false)
  const [filterGrp,setFilterGrp]=useState<'all'|'conformite'|'competence'>('all')
  const config=act?CFG[act]:null, catalog=CATA[act]||[]

  // Prefill from lead
  useEffect(()=>{
    try{
      const pf=localStorage.getItem('ll_prefill_simu')
      if(pf){const d=JSON.parse(pf);if(d.etabNom)setEtab(d.etabNom);if(d.effectif)handleEff(String(d.effectif));localStorage.removeItem('ll_prefill_simu')}
    }catch{}
  },[])

  function handleEff(v:string){ setEffectif(v); const n=parseInt(v); if(!isNaN(n)){setTranche(n<11?'<11':'11-49');setNbSal(n)} }
  const grouped=useMemo(()=>{
    const f=filterGrp==='all'?catalog:catalog.filter(x=>x.grp===filterGrp)
    const g:Record<string,Formation[]>={}
    f.forEach(x=>{const k=x.grp==='conformite'?'Conformité':(CAT_LABELS[x.cat]||'Autre');if(!g[k])g[k]=[];g[k].push(x)})
    return Object.entries(g).map(([l,items])=>({label:l,items}))
  },[catalog,filterGrp])

  function toggle(f:Formation){
    if(sel.some(s=>s.id===f.id)){setSel(p=>p.filter(s=>s.id!==f.id))}
    else{const h=getH(f),cost=getCost(h,f,act,nbSal);setSel(p=>[...p,{lineId:`l_${Date.now()}_${f.id}`,id:f.id,nm:f.nm,h,grp:f.grp,cat:f.cat,cost,nb:nbSal}])}
  }
  const totals=useMemo(()=>{
    const tC=sel.reduce((s,f)=>s+f.cost,0), tH=sel.reduce((s,f)=>s+f.h,0)
    const plaf=getPlafond(act,tranche), fin=Math.min(tC,plaf)
    let faf=0; if(hasDir)faf=Math.min(tH,54)*60
    const tF=fin+faf, rac=Math.max(0,tC-tF), tx=tC>0?Math.round((tF/tC)*100):0
    return {tC,tH,plaf,fin,faf,tF,rac,tx}
  },[sel,act,tranche,hasDir])

  function reset(){setAct('');setSel([]);setEtab('');setEffectif('');setNbSal(1);setHasDir(false)}

  if(!act) return (
    <div className="animate-fade-in max-w-4xl">
      <h1 className="text-2xl font-heading font-bold text-surface-900 tracking-heading mb-2">Simulateur Budget Formation</h1>
      <p className="text-surface-500 text-sm mb-8">Sélectionnez une activité pour accéder au catalogue et calculer le budget OPCO</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {Object.entries(CFG).filter(([k])=>CATA[k]).map(([key,c])=>(
          <button key={key} onClick={()=>{setAct(key);setDirBudget(c.dirDefault||'fafcea')}}
            className="card p-5 text-center hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer group">
            <div className="mb-3 flex justify-center">{ACT_ICON_MAP[key]}</div>
            <div className="text-sm font-heading font-semibold text-surface-900 group-hover:text-brand-600 transition-colors">{c.label}</div>
            <div className="text-[11px] text-surface-400 mt-1">{c.opco} — IDCC {c.idcc}</div>
            <div className="text-xs text-brand-600 font-semibold mt-2">{(CATA[key]||[]).length} formations</div>
          </button>
        ))}
      </div>
    </div>
  )
  return (
    <div className="animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
        <div className="flex items-center gap-3">
          <span>{ACT_ICON_MAP[act]}</span>
          <div><h1 className="text-xl font-heading font-bold text-surface-900 tracking-heading">{config?.label}</h1><div className="text-xs text-surface-400">{config?.opco} — IDCC {config?.idcc}</div></div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={reset} icon={<RotateCcw className="h-3.5 w-3.5" />}>Changer</Button>
          {sel.length>0&&<Button size="sm" onClick={()=>setShowDevis(true)} icon={<FileText className="h-3.5 w-3.5" />}>Voir le devis</Button>}
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="card p-4">
            <div className="grid grid-cols-3 gap-3">
              <div><label className="text-xs font-medium text-surface-500 mb-1 block">Établissement</label><input className="input-base text-sm" value={etab} onChange={e=>setEtab(e.target.value)} placeholder="Nom" /></div>
              <div><label className="text-xs font-medium text-surface-500 mb-1 block">Effectif</label><input className="input-base text-sm" type="number" value={effectif} onChange={e=>handleEff(e.target.value)} placeholder="Nb" /></div>
              <div><label className="text-xs font-medium text-surface-500 mb-1 block">Tranche</label><div className="flex gap-1.5">{(['<11','11-49'] as const).map(t=>(<button key={t} onClick={()=>setTranche(t)} className={cn('flex-1 px-2 py-2 rounded-lg text-xs font-medium transition-all',tranche===t?'bg-surface-900 text-white':'bg-surface-50 text-surface-600')}>{t}</button>))}</div></div>
            </div>
            <label className="flex items-center gap-2 mt-3 cursor-pointer"><input type="checkbox" checked={hasDir} onChange={e=>setHasDir(e.target.checked)} className="rounded border-surface-300" /><span className="text-xs text-surface-600">Inclure dirigeant ({config?.dirDefault==='fafcea'?'FAFCEA':'AGEFICE'})</span></label>
          </div>
          <div className="flex gap-1.5">
            {([{id:'all' as const,label:`Toutes (${catalog.length})`},{id:'conformite' as const,label:`Conformité (${catalog.filter(f=>f.grp==='conformite').length})`},{id:'competence' as const,label:`Compétences (${catalog.filter(f=>f.grp==='competence').length})`}]).map(f=>(<button key={f.id} onClick={()=>setFilterGrp(f.id)} className={cn('px-3 py-1.5 rounded-lg text-xs font-medium transition-all',filterGrp===f.id?'bg-surface-900 text-white':'bg-surface-100 text-surface-600 hover:bg-surface-200')}>{f.label}</button>))}
          </div>
          <div className="space-y-4">
            {grouped.map(group=>(<div key={group.label}><div className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-2">{group.label}</div><div className="grid grid-cols-1 sm:grid-cols-2 gap-2">{group.items.map(f=>{const isSel=sel.some(s=>s.id===f.id),h=getH(f),cost=getCost(h,f,act,nbSal);return(<button key={f.id} onClick={()=>toggle(f)} className={cn('text-left p-3 rounded-xl border transition-all duration-150',isSel?'bg-brand-50/50 border-brand-200 ring-1 ring-brand-200':'bg-white border-surface-200/80 hover:border-surface-300')}><div className="flex items-start justify-between gap-2"><div className="flex-1 min-w-0"><div className="text-sm font-medium text-surface-800 leading-tight">{f.nm}</div><div className="flex items-center gap-2 mt-1.5"><span className="text-[10px] px-1.5 py-0.5 rounded font-semibold text-white" style={{backgroundColor:CAT_COLORS[f.cat]||'#6b7280'}}>{CAT_LABELS[f.cat]}</span><span className="text-xs text-surface-400">{f.hOpt?f.hOpt.join('/')+'h':h+'h'}</span>{cost>0&&<span className="text-xs text-surface-500 font-medium">{fmt(cost)} €</span>}</div></div><div className={cn('h-5 w-5 rounded-md border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors',isSel?'bg-brand-600 border-brand-600':'border-surface-300')}>{isSel&&<Check className="h-3 w-3 text-white" />}</div></div></button>)})}</div></div>))}
          </div>
        </div>
        <div className="space-y-4">
          <div className="card p-5 sticky top-4">
            <div className="text-sm font-heading font-semibold text-surface-900 tracking-tight mb-4">Récapitulatif budget</div>
            <div className="text-center mb-4">
              <div className="text-xs text-surface-400 mb-1">Taux de couverture</div>
              <div className={cn('text-4xl font-heading font-bold',totals.tx>=80?'text-success-600':totals.tx>=50?'text-warning-600':totals.tx>0?'text-danger-600':'text-surface-300')}>{totals.tx}%</div>
              <div className="h-2 rounded-full bg-surface-100 mt-2 overflow-hidden"><div className={cn('h-full rounded-full transition-all duration-700',totals.tx>=80?'bg-success-500':totals.tx>=50?'bg-warning-500':'bg-danger-500')} style={{width:`${Math.min(totals.tx,100)}%`}} /></div>
              {totals.rac===0&&totals.tC>0&&<Badge variant="success" className="mt-2">Prise en charge 100%</Badge>}
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-surface-500">{sel.length} formation{sel.length>1?'s':''}</span><span className="font-medium text-surface-800">{totals.tH}h — {fmt(totals.tC)} €</span></div>
              <div className="flex justify-between"><span className="text-surface-500">Financement {config?.opco}</span><span className="font-medium text-success-600">{fmt(totals.fin)} €</span></div>
              {hasDir&&totals.faf>0&&<div className="flex justify-between"><span className="text-surface-500">{dirBudget==='fafcea'?'FAFCEA':'AGEFICE'}</span><span className="font-medium text-success-600">{fmt(totals.faf)} €</span></div>}
              <div className="flex justify-between"><span className="text-surface-500">Plafond annuel</span><span className="text-surface-400">{fmt(totals.plaf)} €</span></div>
              <div className="flex justify-between pt-2 border-t border-surface-100"><span className="text-surface-700 font-medium">Reste à charge</span><span className={cn('font-bold',totals.rac>0?'text-danger-600':'text-success-600')}>{totals.rac>0?fmt(totals.rac)+' €':'Aucun'}</span></div>
            </div>
            {config?.contraintes?.length>0&&<div className="mt-4 pt-3 border-t border-surface-100 space-y-1">{config.contraintes.map((c:string,i:number)=>(<div key={i} className="flex items-center gap-1.5 text-[11px] text-surface-400"><AlertTriangle className="h-3 w-3 text-warning-500 shrink-0" />{c}</div>))}</div>}
            {config?.cats?.length>0&&<div className="mt-4 pt-3 border-t border-surface-100"><div className="text-[11px] font-semibold text-surface-500 mb-2">Taux horaires</div>{config.cats.map((c:any)=>(<div key={c.id} className="flex items-center justify-between text-[11px] py-0.5"><span className="text-surface-500">{c.nom}</span><span className="font-medium text-surface-700">{c.r} €/h</span></div>))}</div>}
          </div>
          {sel.length>0&&<div className="card p-4"><div className="text-xs font-semibold text-surface-500 mb-2">Sélectionnées</div><div className="space-y-1.5">{sel.map(s=>(<div key={s.lineId} className="flex items-center justify-between p-2 rounded-lg bg-brand-50/30"><div className="flex-1 min-w-0"><div className="text-xs font-medium text-surface-800 truncate">{s.nm}</div><div className="text-[10px] text-surface-400">{s.h}h · {fmt(s.cost)} €</div></div><button onClick={()=>setSel(p=>p.filter(x=>x.lineId!==s.lineId))} className="p-1 text-surface-400 hover:text-danger-500 transition-colors shrink-0"><X className="h-3.5 w-3.5" /></button></div>))}</div></div>}
        </div>
      </div>
      <Modal isOpen={showDevis} onClose={()=>setShowDevis(false)} title="Devis informatif" size="lg">
        <div className="space-y-4">
          <div className="bg-surface-50 rounded-xl p-4"><div className="grid grid-cols-2 gap-4 text-sm"><div><span className="text-surface-400">Établissement :</span> <span className="font-medium text-surface-800">{etab||'—'}</span></div><div><span className="text-surface-400">Activité :</span> <span className="font-medium text-surface-800">{config?.label}</span></div><div><span className="text-surface-400">OPCO :</span> <span className="font-medium text-surface-800">{config?.opco}</span></div><div><span className="text-surface-400">Date :</span> <span className="font-medium text-surface-800">{new Date().toLocaleDateString('fr-FR')}</span></div></div></div>
          <table className="w-full text-sm"><thead><tr className="border-b border-surface-200"><th className="text-left py-2 text-xs text-surface-500 font-medium">Formation</th><th className="text-center py-2 text-xs text-surface-500 font-medium w-16">Durée</th><th className="text-center py-2 text-xs text-surface-500 font-medium w-16">Pers.</th><th className="text-right py-2 text-xs text-surface-500 font-medium w-24">Montant</th></tr></thead><tbody>{sel.map(s=>(<tr key={s.lineId} className="border-b border-surface-100"><td className="py-2 text-surface-800">{s.nm}</td><td className="py-2 text-center text-surface-600">{s.h}h</td><td className="py-2 text-center text-surface-600">{s.nb}</td><td className="py-2 text-right font-medium text-surface-800">{fmt(s.cost)} €</td></tr>))}</tbody>
          <tfoot><tr className="border-t-2 border-surface-300"><td colSpan={3} className="py-2 font-semibold text-surface-900">Total TTC</td><td className="py-2 text-right font-bold text-surface-900">{fmt(totals.tC)} €</td></tr><tr><td colSpan={3} className="py-1 text-success-600">Financement {config?.opco}</td><td className="py-1 text-right font-medium text-success-600">- {fmt(totals.fin)} €</td></tr>{hasDir&&totals.faf>0&&<tr><td colSpan={3} className="py-1 text-success-600">{dirBudget==='fafcea'?'FAFCEA':'AGEFICE'}</td><td className="py-1 text-right font-medium text-success-600">- {fmt(totals.faf)} €</td></tr>}<tr className="border-t border-surface-200"><td colSpan={3} className="py-2 font-bold text-surface-900">Reste à charge</td><td className={cn('py-2 text-right font-bold',totals.rac>0?'text-danger-600':'text-success-600')}>{totals.rac>0?fmt(totals.rac)+' €':'Prise en charge 100%'}</td></tr></tfoot></table>
          <div className="text-[10px] text-surface-400 italic">* Organisme exonéré de TVA — Art. 261-4-4° CGI. Devis informatif non contractuel.</div>
        </div>
      </Modal>
    </div>
  )
}
