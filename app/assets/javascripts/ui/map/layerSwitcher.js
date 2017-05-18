define(['ui/common/hasEvents'], function(HasEvents) {

  var LayerSwitcher = function() {

    var self = this,

        element = jQuery(
          '<div class="clicktrap">' +
            '<div class="ls-wrapper">' +
              '<div class="layerswitcher">' +
                '<div class="ls-header">' +
                  '<h2>Base Maps</h2>' +
                  '<button class="nostyle outline-icon cancel">&#xe897;</button>' +
                '</div>' +
                '<div class="ls-body">' +
                  '<ul>' +
                    '<li data-name="AWMC">' +
                      '<div class="thumb-container"><img class="map-thumb" src="http://a.tiles.mapbox.com/v3/isawnyu.map-knmctlkh/7/68/47.png"></div>' +
                      '<h3>Empty Basemap</h3>' +
                      '<p>Geographically accurate basemap of the ancient world by the <a href="http://awmc.unc.edu/wordpress/tiles/" target="_blank">Ancient World Mapping Centre</a>, ' +
                      'University of North Caronlina at Chapel Hill.</p>' +
                    '</li>' +

                    '<li data-name="DARE">' +
                      '<div class="thumb-container"><img class="map-thumb" src="http://pelagios.org/tilesets/imperium/7/68/47.png"></div>' +
                      '<h3>Ancient Places</h3>' +
                      '<p>Roman Empire base map by the <a href="http://dare.ht.lu.se/" target="_blank">Digital Atlas of the Roman Empire</a>, Lund University, Sweden.</p>' +
                    '</li>' +

                    '<li data-name="OSM">' +
                      '<div class="thumb-container"><img class="map-thumb" src="http://a.tile.openstreetmap.org/7/68/47.png"></div>' +
                      '<h3>Modern Places</h3>' +
                      '<p>Modern places and roads via <a href="http://www.openstreetmap.org" target="_blank">OpenStreetMap</a>.</p>' +
                    '</li>' +

                    '<li data-name="AERIAL">' +
                      '<div class="thumb-container"><img class="map-thumb" src="http://api.tiles.mapbox.com/v4/mapbox.satellite/7/68/47.png?access_token=pk.eyJ1IjoicGVsYWdpb3MiLCJhIjoiMWRlODMzM2NkZWU3YzkxOGJkMDFiMmFiYjk3NWZkMmUifQ.cyqpSZvhsvBGEBwRfniVrg"></div>' +
                      '<h3>Aerial</h3>' +
                      '<p>Aerial imagery via <a href="https://www.mapbox.com/" target="_blank">Mapbox</a>.</p>' +
                    '</li>' +
                  '</ul>' +
                '</div>' +
              '</div>' +
            '</div>' +
          '</div>').hide().appendTo(document.body),

        btnCancel = element.find('.cancel'),

        open = function() {
          element.show();
        },

        close = function() {
          element.hide();
        };

    btnCancel.click(close);

    element.on('click', 'li', function(e) {
      var target = jQuery(e.target),
          li = target.closest('li'),
          layerName = li.data('name');

      self.fireEvent('changeLayer', layerName);
      close();
    });

    this.open = open;

    HasEvents.apply(this);
  };
  LayerSwitcher.prototype = Object.create(HasEvents.prototype);

  return LayerSwitcher;

});
