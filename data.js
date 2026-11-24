'use strict';
const P = (id,name,group,sets,low,high,rest,inc,photo,tips,kind='weight',alt='') => ({id,name,group,sets,low,high,rest,inc,photo,tips,kind,alt});
window.ROUTINE = [
 {id:'mon',name:'Lunedì',short:'LUN',title:'Schiena e bicipiti',focus:'Schiena, bicipiti, push-up e corsa facile',duration:'75-90 min',accent:'mint',warmup:'5 min di cardio leggero + 2 serie progressive sul primo esercizio.',items:[
  P('pullups','Trazioni alla sbarra','Schiena',3,5,8,150,2.5,'Pullups',['Parti con le scapole attive, petto verso la sbarra.','Sali senza slancio e scendi controllando.','Se serve, usa una macchina assistita.'],'assist'),
  P('dbrow','Rematore con manubri','Schiena',3,6,8,120,2.5,'Bent_Over_Two-Dumbbell_Row',['Inclina il busto mantenendo la schiena neutra.','Tira i gomiti verso i fianchi senza dondolare.','Scendi lentamente.']),
  P('latclose','Lat machine presa stretta','Schiena',2,8,12,120,2.5,'Close-Grip_Front_Lat_Pulldown',['Mantieni il petto alto.','Porta la maniglia verso la parte alta del petto.','Evita di inclinarti molto all indietro.']),
  P('cablerow','Rematore al cavo seduto','Schiena',2,10,12,90,2.5,'Seated_Cable_Rows',['Siediti con il busto stabile e la schiena neutra.','Tira la maniglia verso il busto, senza slancio.','Ritorna lentamente mantenendo il controllo.']),
  P('ezcurl','Curl bilanciere EZ','Bicipiti',3,8,12,90,1,'Barbell_Curl',['Tieni i gomiti vicini al busto.','Non usare la schiena per aiutarti.','Controlla la discesa.']),
  P('hammercurl','Hammer curl','Bicipiti',2,10,12,75,1,'Hammer_Curls',['Palmi uno verso l altro.','Evita lo slancio.','Tieni fermi i gomiti.']),
  P('pushups','Push-up','Corpo libero',2,8,15,90,0,'Pushups',['Corpo allineato dalla testa ai piedi.','Scendi con controllo, spingendo tutto il corpo insieme.','Interrompi prima che ceda la tecnica.'],'bodyweight')
 ],activities:[{id:'run-mon',kind:'run',name:'Corsa facile',target:'12-15 minuti',minutes:15,desc:'Ritmo di conversazione, dopo i pesi.'}]},
 {id:'tue',name:'Martedì',short:'MAR',title:'Gambe A - forza',focus:'Quadricipiti, femorali e core',duration:'65-80 min',accent:'violet',warmup:'5-8 min cyclette, mobilità anche/caviglie e 2-3 serie progressive.',items:[
  P('squat','Squat con bilanciere','Gambe',3,4,6,180,5,'Barbell_Full_Squat',['Appoggia tutto il piede a terra.','Scendi fino alla profondità che controlli senza perdere assetto.','Risalita stabile, senza collassare con le ginocchia.']),
  P('rdl','Stacco rumeno','Femorali',3,6,8,150,5,'Romanian_Deadlift',['Ginocchia leggermente flesse.','Porta indietro le anche mantenendo la schiena neutra.','Bilanciere vicino alle gambe, risali spingendo le anche.'],'weight',''),
  P('legpress','Leg press','Gambe',2,8,10,120,5,'Leg_Press',['Schiena e bacino in appoggio.','Piedi stabili sulla pedana.','Non stendere le ginocchia a scatto.']),
  P('legcurl','Leg curl sdraiato','Femorali',2,10,12,90,2.5,'Lying_Leg_Curls',['Allinea il ginocchio al perno della macchina.','Avvicina i talloni con controllo.','Non sollevare il bacino.']),
  P('calf','Calf raise in piedi','Polpacci',3,10,15,75,2.5,'Standing_Calf_Raises',['Salita sulle punte, breve pausa.','Discesa lenta.','Evita di rimbalzare.']),
  P('plank','Plank','Core',3,30,45,60,0,'Plank',['Gomiti sotto le spalle.','Addome e glutei attivi.','Non inarcare la zona lombare.'],'seconds')
 ],activities:[]},
 {id:'wed',name:'Mercoledì',short:'MER',title:'Cardio e boxe',focus:'Resistenza, tecnica e mobilità',duration:'60-80 min',accent:'orange',warmup:'5 min camminata/corsa molto leggera e mobilità articolare.',items:[
   P('deadbug','Dead bug (per lato)','Core',2,10,10,45,0,'Dead_Bug',['Schiena bassa stabile a terra.','Allunga lentamente braccio e gamba opposti.','Alterna i lati, senza inarcare la schiena.'],'reps')
 ],activities:[
  {id:'run-wed',kind:'run',name:'Corsa facile',target:'25-30 minuti',minutes:25,desc:'Se serve alterna corsa e camminata; respirazione regolare.'},
  {id:'shadow',kind:'boxing',name:'Shadow boxing',target:'3 x 2 min',rounds:3,roundMinutes:2,desc:'Tecnica, guardia, jab-cross, spostamenti; pausa 45 s.'},
  {id:'bag-wed',kind:'boxing',name:'Sacco da boxe',target:'5 x 2 min',rounds:5,roundMinutes:2,desc:'Tecnica moderata, pausa 60 s; non colpire al massimo.'}
 ]},
 {id:'thu',name:'Giovedì',short:'GIO',title:'Petto, spalle e tricipiti',focus:'Solo spinta: petto, spalle e tricipiti',duration:'65-85 min',accent:'blue',warmup:'5 min generali, mobilità spalle e 2-3 serie leggere di panca.',items:[
  P('bench','Panca piana con bilanciere','Petto',3,4,6,180,2.5,'Barbell_Bench_Press_-_Medium_Grip',['Piedi stabili e scapole addotte sulla panca.','Scendi in controllo verso il petto.','Spingi senza rimbalzare.']),
  P('incline','Panca inclinata manubri','Petto',3,8,12,120,2,'Incline_Dumbbell_Press',['Panca a inclinazione moderata.','Scendi controllato, polsi neutri.','Evita di toccare i manubri con forza.']),
  P('shpress','Shoulder press manubri','Spalle',2,8,10,120,2,'Seated_Dumbbell_Press',['Seduto con schiena stabile.','Spingi sopra la testa senza inarcare troppo.','Scendi fino a una posizione confortevole.']),
  P('lateral','Alzate laterali','Spalle',2,12,15,75,1,'Side_Lateral_Raise',['Gomiti lievemente flessi.','Solleva fino a circa altezza spalle.','Niente slancio.']),
  P('cablefly','Croci ai cavi','Petto',2,12,15,75,1,'Cable_Crossover',['Braccia leggermente flesse.','Chiudi davanti al corpo senza forzare la spalla.','Ritorno lento.']),
  P('pushdown','Pushdown con corda','Tricipiti',3,10,15,75,1,'Triceps_Pushdown_-_Rope_Attachment',['Gomiti aderenti ai fianchi.','Estendi completamente senza muovere il busto.','Controlla il ritorno.'])
 ],activities:[]},
 {id:'fri',name:'Venerdì',short:'VEN',title:'Gambe B e sacco',focus:'Massa gambe + boxe tecnica',duration:'70-85 min',accent:'rose',warmup:'5-8 min cyclette e 2 serie progressive di leg press.',items:[
  P('legpress','Leg press','Gambe',3,10,12,120,5,'Leg_Press',['Movimento ampio ma controllato.','Bacino in appoggio.','Non bloccare le ginocchia.']),
  P('bulgarian','Bulgarian split squat','Gambe',2,8,10,105,2,'Split_Squat_with_Dumbbells',['Piede posteriore appoggiato su una panca bassa.','Scendi verticalmente controllando il ginocchio avanti.','Esegui tutte le ripetizioni per ogni lato.'],'weight',''),
  P('seatedcurl','Leg curl seduto','Femorali',3,10,15,90,2.5,'Seated_Leg_Curl',['Regola il sedile alla tua altezza.','Fletti le ginocchia senza sollevare il bacino.','Discesa controllata.']),
  P('extension','Leg extension','Quadricipiti',2,12,15,75,2.5,'Leg_Extensions',['Allinea il ginocchio al perno.','Estendi senza slancio.','Torna lentamente.']),
  P('calf','Calf raise in piedi','Polpacci',3,12,15,60,2.5,'Standing_Calf_Raises',['Salita sulle punte, breve pausa.','Discesa lenta e completa.','Evita il rimbalzo.']),
  P('knee-raise','Sollevamento ginocchia appeso','Core',3,8,12,60,0,'Hanging_Leg_Raise',['Appendi le braccia con spalle attive.','Piega e solleva le ginocchia senza dondolare.','Scendi lentamente.'],'bodyweight','La foto mostra una versione con gambe distese: tu puoi mantenerle piegate.')
 ],activities:[{id:'bag-fri',kind:'boxing',name:'Sacco - richiamo tecnico',target:'4 x 2 min',rounds:4,roundMinutes:2,desc:'Intensita leggera/moderata. Se le gambe sono stanche, riduci o salta.'}]}
];
window.FIT_BASELINE = {goal:'Massa e forza'};
