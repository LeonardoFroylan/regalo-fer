import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { Heart, Camera, Image as ImageIcon, Loader2, Plus, Sparkles, Trash2, Clock, Calendar } from 'lucide-react';
import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc } from 'firebase/firestore';
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
  
  // --- ESTADOS DE LA RULETA (CONECTADOS A FIREBASE) ---
  const [opcionesRuleta, setOpcionesRuleta] = useState([]);
  const [nuevaOpcion, setNuevaOpcion] = useState('');
  const [ruletaGirando, setRuletaGirando] = useState(false);
  const [citaElegida, setCitaElegida] = useState('');
  const [gradosRuleta, setGradosRuleta] = useState(0);
  
  const [fotosAlbum, setFotosAlbum] = useState([]);
  const [historialCitas, setHistorialCitas] = useState([]);
  const [subiendo, setSubiendo] = useState(false);
  const fileInputRef = useRef(null);

  // Contador de tiempo
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

  // Sincronizar Álbum, Historial y Opciones de Ruleta desde Firebase en tiempo real
  useEffect(() => {
    // 1. Álbum
    const qAlbum = query(collection(db, 'album_citas'), orderBy('fecha', 'desc'));
    const unsubAlbum = onSnapshot(qAlbum, (snapshot) => {
      setFotosAlbum(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // 2. Historial de citas sorteadas
    const qHistorial = query(collection(db, 'historial_citas'), orderBy('fecha', 'desc'));
    const unsubHistorial = onSnapshot(qHistorial, (snapshot) => {
      setHistorialCitas(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // 3. Opciones de la Ruleta (Sincronizadas en la nube)
    const qRuleta = query(collection(db, 'ruleta_opciones'), orderBy('fecha', 'asc'));
    const unsubRuleta = onSnapshot(qRuleta, async (snapshot) => {
      const fetched = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      if (fetched.length === 0) {
        // Opciones por defecto si la base de datos está vacía
        const iniciales = ["Ir al cine", "Cena romántica", "Paseo nocturno", "Helados", "Quedarnos en casa"];
        for (const texto of iniciales) {
          await addDoc(collection(db, 'ruleta_opciones'), { texto, fecha: new Date().toISOString() });
        }
      } else {
        setOpcionesRuleta(fetched);
      }
    });

    return () => {
      unsubAlbum();
      unsubHistorial();
      unsubRuleta();
    };
  }, []);

  const moveNoButton = () => setNoPosition({ x: (Math.random() * 150) - 75, y: (Math.random() * 150) - 75 });
  const handleSiClick = () => confetti({ particleCount: 300, spread: 100, origin: { y: 0.6 }, colors: ['#8B3A3A', '#D4AF37', '#5C1D24'] });
  
  // --- LÓGICA DE LA RULETA EN FIREBASE ---
  const agregarOpcionRuleta = async () => {
    if (nuevaOpcion.trim() !== '') {
      try {
        await addDoc(collection(db, 'ruleta_opciones'), {
          texto: nuevaOpcion.trim(),
          fecha: new Date().toISOString()
        });
        setNuevaOpcion('');
      } catch (error) {
        console.error("Error al agregar opción:", error);
      }
    }
  };

  const eliminarOpcion = async (id) => {
    try {
      await deleteDoc(doc(db, 'ruleta_opciones', id));
    } catch (error) {
      console.error("Error al eliminar opción:", error);
    }
  };

  const girarRuleta = async () => {
    if (opcionesRuleta.length === 0) return;
    setRuletaGirando(true);
    setCitaElegida('');
    
    const girosExtra = (Math.floor(Math.random() * 5) + 5) * 360; 
    const gradosAleatorios = Math.floor(Math.random() * 360);
    const rotacionTotal = gradosRuleta + girosExtra + gradosAleatorios;
    
    setGradosRuleta(rotacionTotal);

    setTimeout(async () => {
      const anguloPorOpcion = 360 / opcionesRuleta.length;
      const gradosNormalizados = (360 - (rotacionTotal % 360)) % 360;
      const indiceGanador = Math.floor(gradosNormalizados / anguloPorOpcion);
      const seleccion = opcionesRuleta[indiceGanador].texto;
      
      setCitaElegida(seleccion);
      setRuletaGirando(false);
      confetti({ particleCount: 150, spread: 70, colors: ['#8B3A3A', '#D4AF37'] });

      // Guardar en el historial de Firestore
      try {
        await addDoc(collection(db, 'historial_citas'), {
          titulo: seleccion,
          fecha: new Date().toISOString()
        });
      } catch (error) {
        console.error("Error al guardar historial:", error);
      }
    }, 4000);
  };

  const coloresRuleta = ['#5C1D24', '#7A2E36', '#8B3A3A', '#A34848', '#B85C5C'];
  const anguloPorSlice = opcionesRuleta.length > 0 ? 360 / opcionesRuleta.length : 360;
  const backgroundRuleta = opcionesRuleta.length > 0 
    ? `conic-gradient(${opcionesRuleta.map((_, i) => `${coloresRuleta[i % coloresRuleta.length]} ${i * anguloPorSlice}deg ${(i + 1) * anguloPorSlice}deg`).join(', ')})`
    : '#e5e7eb';

  const handleSubirArchivo = async (e) => {
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
        if (data.secure_url) {
          await addDoc(collection(db, 'album_citas'), { 
            url: data.secure_url, 
            tipo: isVideo ? 'video' : 'image', 
            etiqueta: citaElegida || 'Nuestro recuerdo', 
            fecha: new Date().toISOString() 
          });
        }
      }
    } catch (error) { console.error("Error:", error); } finally { setSubiendo(false); if(fileInputRef.current) fileInputRef.current.value = ''; }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FAF7F2] via-[#F3ECE1] to-[#EAE0D0] flex flex-col items-center py-10 px-4 sm:px-6 font-sans text-stone-800 overflow-x-hidden">
      <div className="w-full max-w-md space-y-12">
        
        {/* SECCIÓN 1: NUESTRA HISTORIA */}
        <FadeInSection>
          <div className="bg-white/90 backdrop-blur-md rounded-3xl shadow-xl p-8 text-center border border-[#D4AF37]/30 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-[#8B3A3A] via-[#D4AF37] to-[#5C1D24]"></div>
            <h1 className="text-xs uppercase tracking-[0.2em] text-[#8B3A3A] font-bold mb-2">Todo comenzó un</h1>
            <h2 className="text-3xl font-extrabold text-[#5C1D24] mb-6 drop-shadow-sm font-serif">7 de Enero, 2023</h2>
            <div className="w-full h-72 bg-stone-100 rounded-2xl overflow-hidden shadow-inner mb-6 relative border border-stone-200">
              <img src="/IMG-20230107-WA0017.jpg" alt="Donde empezó todo" className="w-full h-full object-cover" onError={(e) => e.target.style.display = 'none'} />
            </div>
            <h1 className="text-xs uppercase tracking-[0.2em] text-[#8B3A3A] font-bold mb-2">Llevamos juntos</h1>
            <div className="text-2xl sm:text-3xl text-[#5C1D24] font-black font-serif">
              {timeTogether.years} años, {timeTogether.months} meses <br/> <span className="text-[#8B3A3A]">& {timeTogether.days} días</span>
            </div>
          </div>
        </FadeInSection>

        {/* SECCIÓN 2: RULETA Y OPCIONES SINCRONIZADAS */}
        <FadeInSection>
          <div className="bg-white/95 backdrop-blur-md rounded-3xl shadow-xl p-6 sm:p-8 text-center border border-[#8B3A3A]/20">
            <h2 className="text-3xl font-extrabold text-[#5C1D24] mb-2 font-serif">Nuestra Ruleta</h2>
            <p className="text-sm text-stone-500 mb-8">Agrega o elimina opciones en tiempo real.</p>
            
            {/* Ruleta Visual Circular */}
            <div className="relative w-64 h-64 mx-auto mb-10">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-20">
                <div className="w-0 h-0 border-l-[15px] border-r-[15px] border-t-[25px] border-l-transparent border-r-transparent border-t-[#5C1D24] drop-shadow-lg"></div>
              </div>
              
              <div 
                className="w-full h-full rounded-full border-4 border-[#F3ECE1] shadow-2xl overflow-hidden relative"
                style={{ background: backgroundRuleta, transform: `rotate(${gradosRuleta}deg)`, transition: ruletaGirando ? 'transform 4s cubic-bezier(0.2, 0.8, 0.2, 1)' : 'none' }}
              >
                {opcionesRuleta.map((opcion, i) => {
                  const rotacionTexto = (i * anguloPorSlice) + (anguloPorSlice / 2);
                  return (
                    <div key={opcion.id} className="absolute top-1/2 left-1/2 w-[50%] h-0 origin-left flex items-center justify-start pointer-events-none"
                         style={{ transform: `translateY(-50%) rotate(${rotacionTexto - 90}deg)` }}>
                      <span className="ml-4 text-white font-bold drop-shadow-md text-sm truncate max-w-[80px]">
                        {opcion.texto}
                      </span>
                    </div>
                  );
                })}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-white rounded-full shadow-inner border-4 border-[#8B3A3A]/30 z-10 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-[#8B3A3A]" />
                </div>
              </div>
            </div>

            {/* Gestor de Opciones */}
            <div className="mb-6 space-y-2">
              <div className="flex bg-stone-50 rounded-full p-1 border border-stone-200 shadow-inner">
                <input type="text" value={nuevaOpcion} onChange={(e) => setNuevaOpcion(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && agregarOpcionRuleta()} placeholder="Ej. Ir por tacos..." className="flex-1 bg-transparent px-4 py-2 outline-none text-sm text-stone-700" />
                <button onClick={agregarOpcionRuleta} className="bg-[#8B3A3A] hover:bg-[#5C1D24] text-white p-2 rounded-full transition-colors flex items-center justify-center"><Plus className="w-5 h-5" /></button>
              </div>
              
              <div className="flex flex-wrap gap-2 justify-center mt-4">
                {opcionesRuleta.map((opc) => (
                  <span key={opc.id} className="bg-[#F3ECE1] text-[#5C1D24] text-xs py-1 px-3 rounded-full border border-[#8B3A3A]/20 flex items-center gap-1 font-medium">
                    {opc.texto} <button onClick={() => eliminarOpcion(opc.id)} className="text-stone-400 hover:text-[#8B3A3A]"><Trash2 className="w-3 h-3" /></button>
                  </span>
                ))}
              </div>
            </div>

            {citaElegida && (
              <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-gradient-to-r from-[#F3ECE1] to-[#EAE0D0] text-[#5C1D24] font-black text-2xl py-3 px-6 rounded-2xl mb-6 shadow-sm inline-block border border-[#8B3A3A]/30 font-serif">
                🎉 ¡{citaElegida}!
              </motion.div>
            )}

            <button onClick={girarRuleta} disabled={ruletaGirando || opcionesRuleta.length === 0} className="w-full bg-gradient-to-r from-[#8B3A3A] to-[#5C1D24] text-white py-4 rounded-2xl font-black tracking-wide text-lg shadow-lg hover:shadow-xl active:scale-95 transition-all disabled:opacity-50">
              {ruletaGirando ? 'GIRANDO...' : 'GIRAR RULETA'}
            </button>

            {/* Historial de Citas */}
            <div className="mt-10 pt-6 border-t border-stone-200 text-left">
              <h3 className="text-lg font-bold text-[#5C1D24] mb-3 flex items-center gap-2 font-serif">
                <Clock className="w-5 h-5 text-[#8B3A3A]" /> Historial de Citas Elegidas
              </h3>
              {historialCitas.length === 0 ? (
                <p className="text-xs text-stone-400 italic text-center py-2">Aún no hay citas sorteadas. ¡Gira la ruleta para registrar la primera!</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {historialCitas.map((cita) => (
                    <div key={cita.id} className="bg-[#FAF7F2] p-3 rounded-xl border border-stone-200 flex items-center justify-between text-xs">
                      <span className="font-semibold text-stone-700">{cita.titulo}</span>
                      <span className="text-stone-400 flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-[#8B3A3A]" />
                        {new Date(cita.fecha).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </FadeInSection>

        {/* SECCIÓN 3: ÁLBUM ETERNO */}
        <FadeInSection>
          <div className="bg-white/90 backdrop-blur-md rounded-3xl shadow-xl p-6 sm:p-8 border border-[#8B3A3A]/20">
            <h3 className="text-2xl font-extrabold text-[#5C1D24] mb-2 flex items-center justify-center gap-2 font-serif"><ImageIcon className="w-7 h-7 text-[#8B3A3A]" /> Álbum Eterno</h3>
            <p className="text-sm text-center text-stone-500 mb-6">Sube fotos o videos de nuestras citas.</p>
            <input type="file" accept="image/*,video/*" multiple className="hidden" ref={fileInputRef} onChange={handleSubirArchivo} />
            <button onClick={() => fileInputRef.current.click()} disabled={subiendo} className="w-full bg-[#FAF7F2] border-2 border-dashed border-[#8B3A3A]/40 text-[#8B3A3A] font-bold py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-[#F3ECE1] transition-colors">
              {subiendo ? <Loader2 className="w-6 h-6 animate-spin" /> : <Camera className="w-6 h-6" />} {subiendo ? 'Guardando...' : 'Subir un recuerdo'}
            </button>
            <div className="grid grid-cols-2 gap-3 mt-6">
              {fotosAlbum.map((item) => (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} key={item.id} className="relative group aspect-square">
                  {item.tipo === 'video' ? <video src={item.url} controls className="w-full h-full object-cover rounded-xl shadow-md" /> : <img src={item.url} alt="Recuerdo" className="w-full h-full object-cover rounded-xl shadow-md" loading="lazy" />}
                  <span className="absolute bottom-2 left-2 bg-black/70 text-white text-[10px] px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition">{item.etiqueta}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </FadeInSection>

        {/* SECCIÓN 4: BOTÓN ESCURRIDIZO */}
        <FadeInSection>
          <div className="text-center py-10">
            <h2 className="text-3xl font-extrabold text-[#5C1D24] mb-10 drop-shadow-sm font-serif">¿Me amas?</h2>
            <div className="flex justify-center items-center h-24 relative w-full max-w-[280px] mx-auto">
              <button onClick={handleSiClick} className="bg-gradient-to-r from-[#8B3A3A] to-[#5C1D24] text-white px-10 py-3 rounded-full font-bold shadow-lg hover:shadow-xl active:scale-95 transition-transform z-10 text-lg">¡Sí!</button>
              <motion.button animate={{ x: noPosition.x, y: noPosition.y }} onMouseEnter={moveNoButton} onClick={moveNoButton} onTouchStart={moveNoButton} className="bg-white text-stone-400 px-8 py-3 rounded-full absolute ml-32 shadow-sm font-semibold border border-stone-200">No</motion.button>
            </div>
          </div>
        </FadeInSection>
        
        <footer className="text-center pb-8 text-[#8B3A3A]/80 text-sm font-medium">
          <p>Hecho con amor, por todo lo que somos.</p>
          <p className="mt-1 font-bold">Leonardo ("bebe")</p>
          <p className="mt-1 font-bold">Desarrollado por TecnoFroy Dev®</p>
        </footer>

      </div>
    </div>
  );
};

export default App;