var map;
        var directionsService;
        var directionsRenderer;
        var inicioMarker;
        var waypoints = [];
        var waypointMarkers = [];
        var distanceLabel;
    
        function initMap() {
            console.log('Inicializando el mapa...');
            map = new google.maps.Map(document.getElementById('map'), {
                center: { lat: 19.8391348, lng: -98.9990375 },
                zoom: 13
            });
            directionsService = new google.maps.DirectionsService();
            directionsRenderer = new google.maps.DirectionsRenderer({ map: map });
            distanceLabel = document.getElementById('distance-label');
            console.log('Mapa y servicios de direcciones inicializados.');
        }
    
        function metrosAKilometros(metros) {
            return metros / 1000;
        }
    
        function calcularRuta() {
            if (!inicioMarker) {
                console.error('Ubicación de inicio no definida.');
                return;
            }
    
            var inicio = inicioMarker.getPosition();
            var destinoSelect = document.getElementById('end-coordinates');
            var destinoCoords = destinoSelect.value.split(',');
            var destino = new google.maps.LatLng(parseFloat(destinoCoords[0]), parseFloat(destinoCoords[1]));
    
            console.log('Calculando la ruta desde', inicio.toString(), 'hasta', destino.toString(), 'con puntos intermedios', waypoints);
    
            obtenerMejorRuta(inicio, destino, waypoints).then(function (mejorRuta) {
                if (mejorRuta) {
                    console.log('Mejor ruta encontrada:', mejorRuta);
                    mostrarRuta(mejorRuta);
                } else {
                    console.error('No se pudo encontrar una ruta válida.');
                }
            });
        }
    
        function obtenerMejorRuta(inicio, destino, waypoints) {
            var permutaciones = permutarPuntos(waypoints);
            var mejorRuta = null;
            var mejorDistancia = Infinity;
    
            var rutasCalculadas = permutaciones.map(function (perm) {
                return new Promise(function (resolve) {
                    calcularYMostrarRuta(null, inicio, destino, perm, function (resultado) {
                        var distanciaMetros = resultado.routes[0].legs.reduce((total, leg) => total + leg.distance.value, 0);
                        if (distanciaMetros < mejorDistancia) {
                            mejorDistancia = distanciaMetros;
                            mejorRuta = { inicio: inicio, destino: destino, waypoints: perm };
                        }
                        resolve();
                    });
                });
            });
    
            return Promise.all(rutasCalculadas).then(function () {
                return mejorRuta;
            });
        }
    
        function permutarPuntos(puntos) {
            if (puntos.length <= 1) return [puntos];
            var permutaciones = [];
            for (var i = 0; i < puntos.length; i++) {
                var punto = puntos[i];
                var restos = puntos.slice(0, i).concat(puntos.slice(i + 1));
                var subPermutaciones = permutarPuntos(restos);
                for (var j = 0; j < subPermutaciones.length; j++) {
                    permutaciones.push([punto].concat(subPermutaciones[j]));
                }
            }
            return permutaciones;
        }
    
        function mostrarRuta(ruta) {
            console.log('Mostrando la ruta en el mapa...');
            calcularYMostrarRuta(directionsRenderer, ruta.inicio, ruta.destino, ruta.waypoints, function (resultado) {
                var distanciaMetros = resultado.routes[0].legs.reduce((total, leg) => total + leg.distance.value, 0);
                var distanciaKilometros = metrosAKilometros(distanciaMetros).toFixed(2);
                console.log('Distancia total de la mejor ruta:', distanciaMetros, 'metros,', distanciaKilometros, 'kilómetros.');
                distanceLabel.innerHTML = 'Distancia Total: ' + distanciaKilometros + ' km';
            });
        }
    
        function calcularYMostrarRuta(renderer, inicio, destino, puntosIntermedios, callback) {
            var solicitud = {
                origin: inicio,
                destination: destino,
                waypoints: puntosIntermedios,
                travelMode: 'DRIVING',
                drivingOptions: {
                    departureTime: new Date(),
                    trafficModel: 'pessimistic'
                }
            };
    
            directionsService.route(solicitud, function (resultado, estado) {
                if (estado === 'OK') {
                    if (renderer) {
                        renderer.setDirections(resultado);
                    }
                    callback(resultado);
                } else {
                    console.error('No se pudo calcular la ruta:', estado);
                }
            });
        }
    
        function obtenerMiUbicacion() {
            console.log('Obteniendo la ubicación del usuario...');
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(function (posicion) {
                    var inicio = new google.maps.LatLng(posicion.coords.latitude, posicion.coords.longitude);
                    map.setCenter(inicio);
                    if (inicioMarker) {
                        inicioMarker.setMap(null);
                    }
                    inicioMarker = new google.maps.Marker({
                        position: inicio,
                        map: map,
                        title: 'Mi Ubicación'
                    });
                }, function () {
                    console.error('Error al obtener la ubicación.');
                });
            } else {
                console.error('La geolocalización no es soportada por este navegador.');
            }
        }
    
        function agregarPuntoIntermedio() {
            var waypointSelect = document.getElementById('waypoint-coordinates');
            var waypointCoords = waypointSelect.value.split(',');
            var waypoint = new google.maps.LatLng(parseFloat(waypointCoords[0]), parseFloat(waypointCoords[1]));
    
            var waypointMarker = new google.maps.Marker({
                position: waypoint,
                map: map,
                title: 'Punto Intermedio'
            });
            waypointMarkers.push(waypointMarker);
    
            waypoints.push({ location: waypoint, stopover: true });
            console.log('Punto intermedio agregado:', waypoint.toString());
            waypointSelect.value = "";
        }
    
        function limpiarPuntosIntermedios() {
            for (var i = 0; i < waypointMarkers.length; i++) {
                waypointMarkers[i].setMap(null);
            }
            waypointMarkers = [];
            waypoints = [];
            console.log('Puntos intermedios limpiados.');
        }
    
        function agregarComoDestino() {
            agregarDesdeURL(true);
        }
    
        function agregarComoPuntoIntermedio() {
            agregarDesdeURL(false);
        }
    
        function agregarDesdeURL(esDestino) {
            var urlInput = document.getElementById('google-maps-url').value;
            var coords = extraerCoordenadasDeURL(urlInput);
    
            if (coords) {
                var newLatLng = new google.maps.LatLng(coords.lat, coords.lng);
    
                if (esDestino) {
                    document.getElementById('end-coordinates').innerHTML = `<option value="${coords.lat},${coords.lng}" selected>Destino desde URL</option>`;
                    new google.maps.Marker({
                        position: newLatLng,
                        map: map,
                        title: 'Destino Final'
                    });
                } else {
                    var waypointMarker = new google.maps.Marker({
                        position: newLatLng,
                        map: map,
                        title: 'Punto Intermedio'
                    });
                    waypointMarkers.push(waypointMarker);
    
                    waypoints.push({ location: newLatLng, stopover: true });
                    console.log('Punto intermedio agregado desde URL:', newLatLng.toString());
                }
    
                map.setCenter(newLatLng);
                map.setZoom(15);
            } else {
                alert("No se pudieron extraer las coordenadas de la URL proporcionada.");
            }
        }
    
        function extraerCoordenadasDeURL(url) {
            var regex = /@(-?\d+\.\d+),(-?\d+\.\d+)/;
            var match = url.match(regex);
    
            if (match) {
                return {
                    lat: parseFloat(match[1]),
                    lng: parseFloat(match[2])
                };
            } else {
                console.error('No se encontraron coordenadas en la URL proporcionada.');
                return null;
            }
        }