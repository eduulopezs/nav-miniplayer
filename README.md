# Nav Miniplayer (Edge y Chrome, Manifest V3)

## Instalar
Mismo código para ambos navegadores (requiere Chrome/Edge 111 o superior).

- **Edge:** abre `edge://extensions`, activa **Modo de desarrollador** y pulsa **Cargar desempaquetada**.
- **Chrome:** abre `chrome://extensions`, activa **Modo de desarrollador** (arriba a la derecha) y pulsa **Cargar descomprimida**.

Elige esta carpeta (`C:\dev\glass-mini-player`) y recarga las pestañas ya abiertas. Al reproducir audio/vídeo aparece el minirreproductor.

## Uso
- Arrastra la tarjeta a cualquier punto de la pantalla (la posición se recuerda).
- Play/pausa, ±10 s, anterior/siguiente (usa Media Session del sitio; en YouTube/Spotify Web funcionan).
- El borde de la tarjeta es la barra de progreso: haz clic o arrastra sobre el borde para saltar.
- Tamaño: arrastra cualquiera de las cuatro esquinas (aparecen al pasar el ratón) para cambiar ancho y alto; el contenido se adapta en tiempo real. Si lo aplastas verticalmente (menos de ~84 px de alto) pasa a un modo fino de una sola fila, hasta ~44 px de alto. En la ventana flotante, redimensiona la propia ventana desde cualquier borde o esquina.
- Aparece solo al pulsar el icono de la extensión (clic izquierdo; otro clic lo oculta, sin cambiar de tipo). Clic derecho en el icono para elegir el tipo de ventana:
  - **Mini**: ventana flotante sin marco, siempre encima aunque minimices el navegador (Picture-in-Picture de vídeo, Chrome/Edge 116+). Se abre en el acto con el clic en el icono; si el navegador la bloquea, se abre con el siguiente clic o tecla en la página. Dibuja carátula, título, artista y barra de progreso; los controles son los nativos de esa ventana. Cerrarla con su X solo la oculta.
  - **Ventana**: ventana flotante con marco (barra de título nativa, no eliminable desde una extensión), con la tarjeta completa y sus botones, redimensionable.
  - **Tarjeta**: la tarjeta en la página, con esquinas muy redondeadas. El botón de la tarjeta pasa a Mini. La elección se recuerda.
  Si el navegador no permite el PiP de vídeo, usa una ventana flotante con marco como respaldo.
- Botón × (al pasar el ratón) o icono de la extensión en la barra: ocultar/mostrar.

## Diseños (desarrollo)
Clic derecho en el icono → **Diseño (desarrollo)** para cambiar el aspecto en caliente (se aplica a Tarjeta, Ventana y Mini):
- **Glass (original)**
- **Cyber Brutalismo / Micrographics**: negro y amarillo ácido, sombra dura, tipografía mono y marcas de micrográfica.
- **Pixel art**: paleta de 16 bits, esquinas escalonadas, carátula pixelada y barra por bloques.
- **Retro Cyber**: synthwave con neón cian/magenta, rejilla, líneas de escaneo y esquinas biseladas.
