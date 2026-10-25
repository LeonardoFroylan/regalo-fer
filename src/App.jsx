import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Heart, Camera, Image as ImageIcon, Loader2, Plus, Sparkles, Trash2, Gift } from 'lucide-react';
import { collection, addDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from './firebase';

// --- CONFIGURACIÓN DE CLOUDINARY ---
const CLOUDINARY_CLOUD_NAME = 'w4aol92s'; 
const CLOUDINARY_UPLOAD_PRESET = 'regalo_fer'; 

const FadeInSection = ({ children, delay = 0 }) => (
  <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.6, delay }} className="w-full">
    {children}
  </motion.div>
);

const App = () => {
  const [timeTogether, setTimeTogether] = useState({ years: 0, months: 0, days: 0 });
  const [noPosition, setNoPosition] = useState({ x: 0, y: 0 });
  
  // --- ESTADOS DE LA NUEVA RULETA PROFESIONAL ---
  const [opcionesRuleta, setOpcionesRuleta] = useState(["Ir al cine", "Cena romántica", "Paseo nocturno", "Helados", "Quedarnos en casa"]);
  const [nuevaOpcion, setNuevaOpcion] = useState('');
  const [ruletaGirando, setRuletaGirando] = useState(false);
  const [citaElegida, setCitaElegida] = useState('');
  const [gradosRuleta, setGradosRuleta] = useState(0);
  
  const [fotosAlbum, setFotosAlbum] = useState([]);
  const [subiendo, setSubiendo] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const startDate = new Date('2023-01-07T00:00:00');
    const updateCounter = () => {
      const diff = new Date() - startDate;
      const dateDiff = new Date(diff);
      setTimeTogether({
        years: dateDiff.getUTCFullYear() - 1970,
        months: dateDiff.getUTCMonth(),
        days: dateDiff.getUTCDate() - 1
      });
    };
    updateCounter();
    const interval = setInterval(updateCounter, 86400000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'album_citas'), orderBy('fecha', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => setFotosAlbum(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))));
    return () => unsubscribe();
  }, []);

  const moveNoButton = () => setNoPosition({ x: (Math.random() * 150) - 75, y: (Math.random() * 150) - 75 });
  const handleSiClick = () => confetti({ particleCount: 300, spread: 100, origin: { y: 0.6 }, colors: ['#fb7185', '#e11d48', '#ffffff'] });
  
  // --- LÓGICA DE LA RULETA ---
  const agregarOpcionRuleta = () => {
    if (nuevaOpcion.trim() !== '') {
      setOpcionesRuleta([...opcionesRuleta, nuevaOpcion]);
      setNuevaOpcion('');
    }
  };

  const eliminarOpcion = (index) => {
    const nuevas = [...opcionesRuleta];
    nuevas.splice(index, 1);
    setOpcionesRuleta(nuevas);
  };

  const girarRuleta = () => {
    if (opcionesRuleta.length === 0) return;
    setRuletaGirando(true);
    setCitaElegida('');
    
    // Gira entre 5 y 10 vueltas completas + un giro aleatorio extra
    const girosExtra = (Math.floor(Math.random() * 5) + 5) * 360; 
    const gradosAleatorios = Math.floor(Math.random() * 360);
    const rotacionTotal = gradosRuleta + girosExtra + gradosAleatorios;
    
    setGradosRuleta(rotacionTotal);

    setTimeout(() => {
      const anguloPorOpcion = 360 / opcionesRuleta.length;
      // Calcula exactamente en qué opción se detuvo el puntero superior
      const gradosNormalizados = (360 - (rotacionTotal % 360)) % 360;
      const indiceGanador = Math.floor(gradosNormalizados / anguloPorOpcion);
      
      setCitaElegida(opcionesRuleta[indiceGanador]);
      setRuletaGirando(false);
      confetti({ particleCount: 150, spread: 70, colors: ['#e11d48', '#fda4af'] });
    }, 4000); // 4 segundos de animación fluida
  };

  // Generador de colores estilo casino para las rebanadas de la ruleta
  const coloresRuleta = ['#fda4af', '#fb7185', '#f43f5e', '#e11d48', '#be123c', '#9f1239'];
  const anguloPorSlice = 360 / opcionesRuleta.length;
  const backgroundRuleta = opcionesRuleta.length > 0 
    ? `conic-gradient(${opcionesRuleta.map((_, i) => `${coloresRuleta[i % coloresRuleta.length]} ${i * anguloPorSlice}deg ${(i + 1) * anguloPorSlice}deg`).join(', ')})`
    : '#e5e7eb';

  const handleSubirArchivo = async (e) => { /* Lógica Cloudinary sin cambios */
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    setSubiendo(true);
    try {
      for (const file of files) {
        const isVideo = file.type.startsWith('video/');
        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
        const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${isVideo?'video':'image'}/upload`, { method: 'POST', body: formData });
        const data = await res.json();
        if (data.secure_url) await addDoc(collection(db, 'album_citas'), { url: data.secure_url, tipo: isVideo?'video':'image', etiqueta: citaElegida || 'Nuestro recuerdo', fecha: new Date().toISOString() });
      }
    } catch (error) { console.error("Error:", error); } finally { setSubiendo(false); if(fileInputRef.current) fileInputRef.current.value = ''; }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 via-rose-50 to-pink-200 flex flex-col items-center py-10 px-4 sm:px-6 font-sans text-gray-800 overflow-x-hidden">
      <div className="w-full max-w-md space-y-12">
        
        {/* SECCIÓN 1: NUESTRA HISTORIA */}
        <FadeInSection>
          <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-xl p-8 text-center border border-white/50 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-rose-400 to-pink-500"></div>
            <h1 className="text-xs uppercase tracking-[0.2em] text-rose-500 font-bold mb-2">Todo comenzó un</h1>
            <h2 className="text-3xl font-extrabold text-rose-700 mb-6 drop-shadow-sm">7 de Enero, 2023</h2>
            <div className="w-full h-72 bg-gray-200 rounded-2xl overflow-hidden shadow-inner mb-6 relative">
              <img src="/IMG-20230107-WA0017.jpg" alt="Donde empezó todo" className="w-full h-full object-cover" onError={(e) => e.target.style.display = 'none'} />
              
            </div>
            <h1 className="text-xs uppercase tracking-[0.2em] text-rose-500 font-bold mb-2">Llevamos juntos</h1>
            <div className="text-2xl sm:text-3xl text-rose-600 font-black">
              {timeTogether.years} años, {timeTogether.months} meses <br/> <span className="text-rose-400">& {timeTogether.days} días</span>
            </div>
          </div>
        </FadeInSection>

        {/* SECCIÓN 2: RULETA PROFESIONAL */}
        <FadeInSection>
          <div className="bg-white/90 backdrop-blur-md rounded-3xl shadow-xl p-6 sm:p-8 text-center border border-rose-100">
            <h2 className="text-3xl font-extrabold text-rose-700 mb-2">Nuestra Ruleta</h2>
            <p className="text-sm text-gray-500 mb-8">Agrega las opciones y deja que el destino decida.</p>
            
            {/* Ruleta Visual Circular */}
            <div className="relative w-64 h-64 mx-auto mb-10">
              {/* Puntero Superior */}
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
                <div className="w-0 h-0 border-l-[15px] border-r-[15px] border-t-[25px] border-l-transparent border-r-transparent border-t-rose-800 drop-shadow-lg"></div>
              </div>
              
              {/* Círculo de Slices */}
              <div 
                className="w-full h-full rounded-full border-4 border-rose-100 shadow-2xl overflow-hidden relative"
                style={{ background: backgroundRuleta, transform: `rotate(${gradosRuleta}deg)`, transition: ruletaGirando ? 'transform 4s cubic-bezier(0.2, 0.8, 0.2, 1)' : 'none' }}
              >
                {opcionesRuleta.map((opcion, i) => {
                  // Calcular la rotación exacta del texto para que quede en el centro de su rebanada
                  const rotacionTexto = (i * anguloPorSlice) + (anguloPorSlice / 2);
                  return (
                    <div key={i} className="absolute top-1/2 left-1/2 w-[50%] h-0 origin-left flex items-center justify-start pointer-events-none"
                         style={{ transform: `translateY(-50%) rotate(${rotacionTexto - 90}deg)` }}>
                      <span className="ml-4 text-white font-bold drop-shadow-md text-sm truncate max-w-[80px]">
                        {opcion}
                      </span>
                    </div>
                  );
                })}
                {/* Centro de la ruleta */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-white rounded-full shadow-inner border-4 border-rose-200 z-10 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-rose-400" />
                </div>
              </div>
            </div>

            {/* Gestor de Opciones */}
            <div className="mb-6 space-y-2">
              <div className="flex bg-gray-50 rounded-full p-1 border border-gray-200 shadow-inner">
                <input type="text" value={nuevaOpcion} onChange={(e) => setNuevaOpcion(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && agregarOpcionRuleta()} placeholder="Ej. Ir por tacos..." className="flex-1 bg-transparent px-4 py-2 outline-none text-sm" />
                <button onClick={agregarOpcionRuleta} className="bg-rose-500 hover:bg-rose-600 text-white p-2 rounded-full transition-colors flex items-center justify-center"><Plus className="w-5 h-5" /></button>
              </div>
              
              {/* Lista de opciones actuales con botón de eliminar */}
              <div className="flex flex-wrap gap-2 justify-center mt-4">
                {opcionesRuleta.map((opc, i) => (
                  <span key={i} className="bg-rose-50 text-rose-600 text-xs py-1 px-3 rounded-full border border-rose-100 flex items-center gap-1">
                    {opc} <button onClick={() => eliminarOpcion(i)} className="text-rose-400 hover:text-rose-700"><Trash2 className="w-3 h-3" /></button>
                  </span>
                ))}
              </div>
            </div>

            {/* Resultado y Botón de Girar */}
            {citaElegida && (
              <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-gradient-to-r from-rose-100 to-pink-100 text-rose-700 font-black text-2xl py-3 px-6 rounded-2xl mb-6 shadow-sm inline-block border border-rose-200">
                🎉 ¡{citaElegida}!
              </motion.div>
            )}

            <button onClick={girarRuleta} disabled={ruletaGirando || opcionesRuleta.length === 0} className="w-full bg-gradient-to-r from-rose-500 to-pink-600 text-white py-4 rounded-2xl font-black tracking-wide text-lg shadow-lg hover:shadow-xl active:scale-95 transition-all disabled:opacity-50">
              {ruletaGirando ? 'GIRANDO...' : 'GIRAR RULETA'}
            </button>
          </div>
        </FadeInSection>

        {/* SECCIÓN 3: ÁLBUM ETERNO */}
        <FadeInSection>
          <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-xl p-6 sm:p-8 border border-white/50">
            <h3 className="text-2xl font-extrabold text-rose-700 mb-2 flex items-center justify-center gap-2"><ImageIcon className="w-7 h-7 text-rose-500" /> Álbum Eterno</h3>
            <p className="text-sm text-center text-gray-500 mb-6">Sube fotos o videos de nuestras citas.</p>
            <input type="file" accept="image/*,video/*" multiple className="hidden" ref={fileInputRef} onChange={handleSubirArchivo} />
            <button onClick={() => fileInputRef.current.click()} disabled={subiendo} className="w-full bg-rose-50 border-2 border-dashed border-rose-300 text-rose-600 font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-rose-100 transition-colors">
              {subiendo ? <Loader2 className="w-6 h-6 animate-spin" /> : <Camera className="w-6 h-6" />} {subiendo ? 'Guardando...' : 'Subir un recuerdo'}
            </button>
            <div className="grid grid-cols-2 gap-3 mt-6">
              {fotosAlbum.map((item) => (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} key={item.id} className="relative group aspect-square">
                  {item.tipo === 'video' ? <video src={item.url} controls className="w-full h-full object-cover rounded-xl shadow-md" /> : <img src={item.url} alt="Recuerdo" className="w-full h-full object-cover rounded-xl shadow-md" loading="lazy" />}
                  <span className="absolute bottom-2 left-2 bg-black/60 text-white text-[10px] px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition">{item.etiqueta}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </FadeInSection>

        {/* SECCIÓN 4: BOTÓN ESCURRIDIZO */}
        <FadeInSection>
          <div className="text-center py-10">
            <h2 className="text-3xl font-extrabold text-rose-800 mb-10 drop-shadow-sm">¿Me amas?</h2>
            <div className="flex justify-center items-center h-24 relative w-full max-w-[280px] mx-auto">
              <button onClick={handleSiClick} className="bg-gradient-to-r from-rose-500 to-pink-600 text-white px-10 py-3 rounded-full font-bold shadow-lg hover:shadow-xl active:scale-95 transition-transform z-10 text-lg">¡Sí!</button>
              <motion.button animate={{ x: noPosition.x, y: noPosition.y }} onMouseEnter={moveNoButton} onClick={moveNoButton} onTouchStart={moveNoButton} className="bg-white text-gray-400 px-8 py-3 rounded-full absolute ml-32 shadow-sm font-semibold border border-gray-100">No</motion.button>
            </div>
          </div>
        </FadeInSection>
        
        <footer className="text-center pb-8 text-rose-400/80 text-sm font-medium">
          <p>Hecho con amor, por todo lo que somos.</p>
          <p className="mt-1 font-bold">Leonardo ("bebe")</p>
          <p className="mt-1 font-bold">Desarrollado por TecnoFroy Dev®</p>
        </footer>

      </div>
    </div>
  );
};

export default App;