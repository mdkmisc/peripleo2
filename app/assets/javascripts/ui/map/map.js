define([], function() {

  var Map = function(containerDiv) {

    var Layers = {

          AWMC   : L.tileLayer('http://a.tiles.mapbox.com/v3/isawnyu.map-knmctlkh/{z}/{x}/{y}.png', {
                       attribution: 'Tiles &copy; <a href="http://mapbox.com/" target="_blank">MapBox</a> | ' +
                         'Data &copy; <a href="http://www.openstreetmap.org/" target="_blank">OpenStreetMap</a> and contributors, CC-BY-SA | '+
                         'Tiles and Data &copy; 2013 <a href="http://www.awmc.unc.edu" target="_blank">AWMC</a> ' +
                         '<a href="http://creativecommons.org/licenses/by-nc/3.0/deed.en_US" target="_blank">CC-BY-NC 3.0</a>'
                     })

        },

        map = L.map(containerDiv, {
          center: [ 48, 16 ],
          zoom: 4,
          zoomControl: false,
          layers: [ Layers.AWMC ]
        });
  };

  return Map;

});
