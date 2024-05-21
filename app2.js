async function cargarModelo() {
    return await tf.loadLayersModel('model.json');
}

async function cargarImagen(event) {
    const imagenElemento = document.getElementById('imagen');
    imagenElemento.src = URL.createObjectURL(event.target.files[0]);
    imagenElemento.onload = async function() {
        const modelo = await cargarModelo();
        predecirImagen(modelo, imagenElemento);
    }
}

async function predecirImagen(modelo, imagenElemento) {
    const tensorImagen = tf.browser.fromPixels(imagenElemento).resizeNearestNeighbor([150, 150]).toFloat().expandDims();
    const tensorNormalizado = tensorImagen.div(255.0);

    const resultados = await modelo.predict(tensorNormalizado).data();
    const clases = ['Buena', 'Rebaba', 'Tiro corto']; // Reemplaza con las clases de tu modelo

    const prediccionDiv = document.getElementById('prediccion');
    const mayorIndice = resultados.indexOf(Math.max(...resultados));
    prediccionDiv.textContent = 'Predicción: ' + clases[mayorIndice];
}

cargarModelo(); // Cargar modelo al iniciar la página
