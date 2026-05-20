const http = require('http');
const { createClient } = require('@supabase/supabase-js');

const API_KEY_CLIMA = '5b3d06f31284fba3606abae88fcc8cc5';
const CIUDAD = 'San Pedro Garza Garcia,MX';
const URL_CLIMA = `https://api.openweathermap.org/data/2.5/weather?q=${CIUDAD}&appid=${API_KEY_CLIMA}&units=metric&lang=es`;

// --- CREDENCIALES DE BASE DE DATOS (SUPABASE) ---
// ⚠️ IMPORTANTE: Pega aquí tu URL y tu Llave que guardaste en el bloc de notas
const supabaseUrl = 'https://jodncjucnpwvwaxhnjex.supabase.co'; 
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// --- CONSTRUCTOR VAST ---
function generarVAST(idCampaña, titulo, videoUrl) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<VAST version="4.0">
  <Ad id="${idCampaña}">
    <InLine>
      <AdSystem version="1.0">MotorDCO_Propietario</AdSystem>
      <AdTitle>${titulo}</AdTitle>
      <Impression id="Impression-1"><![CDATA[https://tu-servidor.com/track/impresion]]></Impression>
      <Creatives>
        <Creative id="1">
          <Linear>
            <Duration>00:00:15</Duration>
            <MediaFiles>
              <MediaFile delivery="progressive" type="video/mp4" width="1920" height="1080" scalable="true" maintainAspectRatio="true">
                <![CDATA[${videoUrl}]]>
              </MediaFile>
            </MediaFiles>
          </Linear>
        </Creative>
      </Creatives>
    </InLine>
  </Ad>
</VAST>`;
}

// --- SERVIDOR WEB CON PROOF OF PLAY ---
const servidor = http.createServer(async (req, res) => {
    if (req.url === '/anuncio') {
        try {
            console.log('\n📡 [NUEVA PETICIÓN] Procesando anuncio y registrando auditoría...');
            
            const respuestaClima = await fetch(URL_CLIMA);
            const datosClima = await respuestaClima.json();

            if (respuestaClima.ok) {
                const temperatura = datosClima.main.temp;
                const condicionClima = datosClima.weather[0].main;
                
                let tituloCampaña = "";
                let videoUrl = "";
                let idCampaña = "";

                // --- MOTOR DE DECISIÓN ---
                if (condicionClima === 'Rain') {
                    idCampaña = "CMP_INDOOR_01";
                    tituloCampaña = "Accesorios Indoor y Overgrips";
                    videoUrl = "https://midominio.com/videos/accesorios-indoor-padel.mp4";
                } else if (temperatura >= 28) {
                    idCampaña = "CMP_VINTAGE_01";
                    tituloCampaña = "Playeras Padel Junky 100% Algodón Vintage";
                    videoUrl = "https://midominio.com/videos/padel-junky-vintage-1080p.mp4";
                } else {
                    idCampaña = "CMP_DEADSTOCK_01";
                    tituloCampaña = "Liquidación Flash Palas y Mochilas";
                    videoUrl = "https://midominio.com/videos/liquidacion-stock-mochilas.mp4";
                }

                const xmlVAST = generarVAST(idCampaña, tituloCampaña, videoUrl);

                // --- INYECCIÓN EN BASE DE DATOS (PROOF OF PLAY) ---
                // Aquí ya está corregido a "prueba_de_juego"
                const { data, error } = await supabase
                    .from('proof_of_play')
                    .insert([
                        { 
                            temperatura: temperatura, 
                            condicion: condicionClima, 
                            campana_servida: tituloCampaña,
                            id_campana: idCampaña 
                        },
                    ]);
                
                if (error) {
                    console.error("❌ Error al guardar en Supabase:", error);
                } else {
                    console.log(`✅ Proof of Play guardado en tabla 'prueba_de_juego': [${tituloCampaña}] a ${temperatura}°C`);
                }

                res.writeHead(200, { 'Content-Type': 'application/xml' });
                res.end(xmlVAST);
                
            } else {
                res.writeHead(500);
                res.end("Error al consultar el clima.");
            }
        } catch (error) {
            console.error(error);
            res.writeHead(500);
            res.end("Error interno del servidor.");
        }
    } else {
        res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end("Motor DCO Activo.");
    }
});

const PUERTO = process.env.PORT || 3000;
servidor.listen(PUERTO, () => {
    console.log(`\n🚀 ¡Ad Server DCO + Base de Datos encendido!`);
    console.log(`🌐 Solicita un anuncio entrando a: http://localhost:${PUERTO}/anuncio`);
});