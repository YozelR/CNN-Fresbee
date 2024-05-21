
  var canvas = document.getElementById("canvas");
  var video = document.getElementById("video");
  var ctx = canvas.getContext("2d");
  var modelo = null;
  var size = 400;
  var camaras = [];
  var predicciónActiva = true;

  var currentStream = null;
  var facingMode = "user";
  (async () => {
      console.log("Cargando modelo...");
      modelo = await tf.loadLayersModel("model.json");
      console.log("Modelo cargado...");
  })();

  

    // Función para modificar el color del borde del canvas
    function modificarColorBorde() {
        var resultadoElemento = document.getElementById("resultado");
        var canvasElemento = document.getElementById("canvas");
  
        // Obtener el texto del elemento #resultado
        var resultadoTexto = resultadoElemento.textContent.trim();
  
        // Modificar el color del borde dependiendo del valor de resultadoTexto
        if (resultadoTexto === "Buena") {
          canvasElemento.style.borderColor = "green"; // Color de borde para valor1
        } 
        else {
          canvasElemento.style.borderColor = "red"; // Color de borde predeterminado para otros valores
        }
      }
  
      // Llamar a la función al cargar la página (solo para ejemplo)
      window.onload = modificarColorBorde;
  
      // Crear un observador de mutación para #resultado
      var observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
          // Si hay cambios en #resultado, llamar a modificarColorBorde()
          modificarColorBorde();
        });
      });
  
      // Observar cambios en #resultado
      var resultadoElemento = document.getElementById("resultado");
      observer.observe(resultadoElemento, { childList: true, subtree: true })


      // Variable para almacenar los datos de la consola
    var datosConsola = [];

// Función para capturar los datos de la consola y mostrarlos en un div
    function mostrarDatosConsola() {
    // Obtener el div donde se mostrarán los datos
    var divDatosConsola = document.getElementById("datosConsola");

    // Limpiar el contenido del div antes de mostrar los nuevos datos
    divDatosConsola.innerHTML = "";

    // Iterar sobre los datos de la consola y agregarlos al div
    for (var i = datosConsola.length - 1; i >= 0; i--) {
        var texto = document.createTextNode(datosConsola[i]);
        var parrafo = document.createElement("p");
        parrafo.appendChild(texto);
        divDatosConsola.appendChild(parrafo);
    }

    // Hacer scroll automático hacia abajo para mostrar siempre el último dato
    divDatosConsola.scrollTop = divDatosConsola.scrollHeight;
}

// Sobrescribir la función console.log para capturar los datos
var consolaOriginalLog = console.log;
console.log = function() {
    // Convertir los argumentos a una cadena de texto y agregar un espacio entre cada uno
    var mensaje = Array.from(arguments).join(' ');

    // Agregar el mensaje a los datos de la consola
    datosConsola.push(mensaje);

    // Limitar la cantidad de líneas de datos a mostrar (ajusta este valor según tu preferencia)
    var limite = 10;
    if (datosConsola.length > limite) {
        datosConsola.shift(); // Eliminar el primer elemento si se excede el límite
    }

    // Mostrar los datos en el div
    mostrarDatosConsola();

    // Llamar a la función original de console.log para que los datos se impriman en la consola
    consolaOriginalLog.apply(console, arguments);
    };

    // Llamar a la función para mostrar los datos de la consola inicialmente
    mostrarDatosConsola();





      var opciones = {
          audio: false,
          video: {
              facingMode: "user", width: size, height: size
          }
      };

      if(navigator.mediaDevices.getUserMedia) {
          navigator.mediaDevices.getUserMedia(opciones)
              .then(function(stream) {
                  currentStream = stream;
                  video.srcObject = currentStream;
                  procesarCamara();
                  predecir();
              })
              .catch(function(err) {
                  alert("No se pudo utilizar la camara :(");
                  console.log("No se pudo utilizar la camara :(", err);
                  alert(err);
              })
      } else {
          alert("No existe la funcion getUserMedia... oops :( no se puede usar la camara");
      }

  function cambiarCamara() {
      if (currentStream) {
          currentStream.getTracks().forEach(track => {
              track.stop();
          });
      }

      facingMode = facingMode == "user" ? "environment" : "user";

      var opciones = {
          audio: false,
          video: {
              facingMode: facingMode, width: size, height: size
          }
      };


      navigator.mediaDevices.getUserMedia(opciones)
          .then(function(stream) {
              currentStream = stream;
              video.srcObject = currentStream;
          })
          .catch(function(err) {
              console.log("Oops, hubo un error", err);
          })
  }

  function predecir() {
    if (modelo != null && predicciónActiva) {

          resample_single(canvas, 150, 150, othercanvas);

          var ctx2 = othercanvas.getContext("2d");

          var imgData = ctx2.getImageData(0,0,150,150);
          var arr = []; 
          var arr150 = [];
          for (var p=0, i=0; p < imgData.data.length; p+=4) {
              var red = imgData.data[p]/255;
              var green = imgData.data[p+1]/255;
              var blue = imgData.data[p+2]/255;
              arr150.push([red, green, blue]); 
              if (arr150.length == 150) {
                  arr.push(arr150);
                  arr150 = [];
              }
          }

          arr = [arr]; 
  
          var tensor4 = tf.tensor4d(arr);
          var resultados = modelo.predict(tensor4).dataSync();
          var mayorIndice = resultados.indexOf(Math.max.apply(null, resultados));

          var clases = ['Buena', 'Rebaba', 'Tiro corto'];
          console.log("Prediccion", clases[mayorIndice]);
          document.getElementById("resultado").innerHTML = clases[mayorIndice]
          
      }

      if (predicciónActiva) {
        setTimeout(predecir, 100);
      }
  }

function procesarCamara() {
    var ctx = canvas.getContext("2d");

    ctx.drawImage(video, 0, 0, size, size, 0, 0, size, size);

    // Si la predicción está activa, llamar a la función procesarCamara nuevamente después de 20ms
    if (predicciónActiva) {
      setTimeout(procesarCamara, 20);
    }
}

  /**
   * Hermite resize - fast image resize/resample using Hermite filter. 1 cpu version!
   * 
   * @param {HtmlElement} canvas
   * @param {int} width
   * @param {int} height
   * @param {boolean} resize_canvas if true, canvas will be resized. Optional.
   * Cambiado por RT, resize canvas ahora es donde se pone el chiqitillllllo
   */
  function resample_single(canvas, width, height, resize_canvas) {
      var width_source = canvas.width;
      var height_source = canvas.height;
      width = Math.round(width);
      height = Math.round(height);

      var ratio_w = width_source / width;
      var ratio_h = height_source / height;
      var ratio_w_half = Math.ceil(ratio_w / 2);
      var ratio_h_half = Math.ceil(ratio_h / 2);

      var ctx = canvas.getContext("2d");
      var ctx2 = resize_canvas.getContext("2d");
      var img = ctx.getImageData(0, 0, width_source, height_source);
      var img2 = ctx2.createImageData(width, height);
      var data = img.data;
      var data2 = img2.data;

      for (var j = 0; j < height; j++) {
          for (var i = 0; i < width; i++) {
              var x2 = (i + j * width) * 4;
              var weight = 0;
              var weights = 0;
              var weights_alpha = 0;
              var gx_r = 0;
              var gx_g = 0;
              var gx_b = 0;
              var gx_a = 0;
              var center_y = (j + 0.5) * ratio_h;
              var yy_start = Math.floor(j * ratio_h);
              var yy_stop = Math.ceil((j + 1) * ratio_h);
              for (var yy = yy_start; yy < yy_stop; yy++) {
                  var dy = Math.abs(center_y - (yy + 0.5)) / ratio_h_half;
                  var center_x = (i + 0.5) * ratio_w;
                  var w0 = dy * dy; //pre-calc part of w
                  var xx_start = Math.floor(i * ratio_w);
                  var xx_stop = Math.ceil((i + 1) * ratio_w);
                  for (var xx = xx_start; xx < xx_stop; xx++) {
                      var dx = Math.abs(center_x - (xx + 0.5)) / ratio_w_half;
                      var w = Math.sqrt(w0 + dx * dx);
                      if (w >= 1) {
                          //pixel too far
                          continue;
                      }
                      //hermite filter
                      weight = 2 * w * w * w - 3 * w * w + 1;
                      var pos_x = 4 * (xx + yy * width_source);
                      //alpha
                      gx_a += weight * data[pos_x + 3];
                      weights_alpha += weight;
                      //colors
                      if (data[pos_x + 3] < 255)
                          weight = weight * data[pos_x + 3] / 250;
                      gx_r += weight * data[pos_x];
                      gx_g += weight * data[pos_x + 1];
                      gx_b += weight * data[pos_x + 2];
                      weights += weight;
                  }
              }
              data2[x2] = gx_r / weights;
              data2[x2 + 1] = gx_g / weights;
              data2[x2 + 2] = gx_b / weights;
              data2[x2 + 3] = gx_a / weights_alpha;
          }
      }


      ctx2.putImageData(img2, 0, 0);
  }

