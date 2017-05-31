require.config({
  baseUrl: "/assets/javascripts/",
  fileExclusionRegExp: /^lib$/
});

require([
  'ui/common/itemUtils',
  'ui/controls/results/resultList',
  'ui/controls/search/searchPanel',
  'ui/controls/selection/selectionPanel',
  'ui/map/map',
  'ui/state/state',
  'ui/api',
], function(ItemUtils, ResultList, SearchPanel, SelectionPanel, Map, State, API) {

      /** Shorthand for a 'transient query' state update **/
  var NOOP = { pushState: false, makeRequest: false},

      /**
       * A composition helper that puts a function in sequences with a jQuery deferred function.
       * I.e. function b is called after function a is .done(), with the results of a as input.
       */
      seq = function(a, b) { return function(arg) { a(arg).done(b); }; };

  jQuery(document).ready(function() {
    var body = jQuery(document.body),

        mapDiv = jQuery('<div id="map"></div>').appendTo(body),

        controlsDiv = jQuery('<div id="search-controls"></div>').appendTo(body),

        map = new Map(mapDiv[0]),

        searchPanel = new SearchPanel(controlsDiv),

        selectionPanel = new SelectionPanel(controlsDiv),

        resultList = new ResultList(controlsDiv),

        state = new State(),

        currentSelection = false,

        onSearchResponse = function(response) {
          selectionPanel.hide();
             searchPanel.setSearchResponse(response);
              resultList.setSearchResponse(response);
                     map.setSearchResponse(response);
        },

        // Happens on 'Back' button, or on page load (when URL params are set)
        onStateChange = function(e) {
          var state = e.state, // The state, as manipulated by the user (or set by the URL)
              request = e.request; // Promise of the search request triggered by the state change

          searchPanel.setState(state);
                  map.setState(state);

          if (state.selected)
            onSelectIdentifier(state.selected);

          request.done(onSearchResponse);
        },

        deselect = function() {
          var deselectItem = function(item) {
                selectionPanel.hide();
                currentSelection = false;
              },

              deselectPlace = function(item) {
                state.updateFilters({ places : false });
                deselectItem(item);
              };

          if (currentSelection)
            switch(ItemUtils.getItemType(currentSelection)) {
              case 'PLACE':
                deselectPlace(currentSelection);
                break;
              case 'OBJECT':
                deselectItem(currentSelection);
                break;
              case 'PERSON':
                deselectItem(currentSelection);
                break;
              case 'DATASET':
                selectDataset(currentSelection);
                break;
            }
        },

        /** Common select functionality **/
        onSelectItem = function(item) {

          var uri = ItemUtils.getURIs(item)[0],

              /**
               * For places, we fetch the total result count at that place (i.e.
               * the total number of items that link to that place).
               */
              selectPlace = function(place) {

                var fetchRelated  = function() {
                      // Transient search, filtered by URI of the place, but without queryphrase
                      var filter = { places: [ uri ] },
                          origQuery = state.getQueryPhrase();

                      state.setQueryPhrase(false, NOOP);
                      return state.updateFilters(filter, { pushState: false })
                        .then(function(results) {
                          // Change back to original settings
                          state.updateFilters({ places: false }, NOOP);
                          state.setQueryPhrase(origQuery, NOOP);
                          return results;
                        });
                    },

                    setSelection = function(results) {
                      var resultsAt = results.total - 1, // We don't want to count the place itself
                          related = results.top_places.filter(function(p) {
                            // Again, count only the other places
                            return p.doc_id !== place.doc_id;
                          });

                      // TODO redundancy with selectObject!
                      state.setSelectedItem(place);
                      resultList.setSelectedItem(place);
                      selectionPanel.show(place, { results: resultsAt, relatedPlaces: related });
                      // TODO currentSelection = { item: item, references: references }
                      currentSelection = place;

                      // Note: selection may have happend through the map, so technically no
                      // need for this - but the map is designed to handle this situation
                      // map.setSelectedItem(item, references.PLACE);
                    };

                fetchRelated().done(setSelection);
              },

              /**
               * For objects, we fetch their references (e.g. places they link to), plus
               * the total number of other results at that reference.
               */
              selectObject = function(item) {

                var fetchResultCountForReference = function(uri) {
                      var filter = { places : [ uri ] };

                      return state.updateFilters(filter, { pushState: false })
                        .then(function(results) {
                          state.updateFilters({ places: false }, { pushState: false, makeRequest: false });
                          return { 'identifier' : uri, 'resultCount' : results.total };
                        });
                    },

                    fetchReferences = API.getReferences(uri).then(function(references) {
                      // Run filtered searches for the first two references of each type,
                      // so we can display info in the UI
                      var places = (references.PLACE) ? references.PLACE.slice(0, 3) : false,

                          fPlaceCounts; // TODO support persona and period references

                      if (places) {
                        fPlaceCounts = places.map(function(place) {
                          return fetchResultCountForReference(place.identifiers[0]);
                        });

                        return jQuery.when.apply(jQuery, fPlaceCounts).then(function() {
                          return { references: references, resultCounts: arguments };
                        });
                      } else {
                        return jQuery.Deferred().resolve(this).then(function() {
                          return { references: references, resultCounts: [] };
                        });
                      }
                    });

                fetchReferences.done(function(result) {
                  var references = result.references,
                      resultCounts = result.resultCounts;

                  // TODO redundancy with selectPlace!
                  state.setSelectedItem(item);
                  resultList.setSelectedItem(item);
                  selectionPanel.show(item, { references: references, resultCounts: resultCounts });
                  // TODO currentSelection = { item: item, references: references }
                  currentSelection = item;


                  // Note: selection may have happend through the map, so technically no
                  // need for this - but the map is designed to handle this situation
                  map.setSelectedItem(item, references.PLACE);
                });
              },

              selectPerson = function(person) {

              },

              selectDataset = function(dataset) {
                // TODO redundancy with selectPlace!
                state.setSelectedItem(dataset);
                resultList.setSelectedItem(dataset);
                selectionPanel.show(dataset);
                // TODO currentSelection = { item: dataset, references: references }
                currentSelection = dataset;

                // Clear all search params and then set a filter
                state.clearSearch(false, NOOP);
                state.updateFilters({ 'datasets': uri }).done(function(results) {
                  // TODO show all dots on map?
                });
              };

          if (item)
            switch(ItemUtils.getItemType(item)) {
              case 'PLACE':
                selectPlace(item);
                break;
              case 'OBJECT':
                selectObject(item);
                break;
              case 'PERSON':
                selectPerson(item);
                break;
              case 'DATASET':
                selectDataset(item);
                break;
            }
          else
            deselect();
        },

        onSelectMapMarker = function(place) {
          var uri = ItemUtils.getURIs(place)[0],
              filter = { places : [ uri ] };

          return state.updateFilters(filter, { pushState: false })
            .done(function(results) {
              state.updateFilters({ places: false }, { pushState: false, makeRequest: false });
              onSelectItem(results.items[0]);
            });
        },

        /** An identifier was selected (e.g. via suggestions) - fetch item **/
        onSelectIdentifier = function(identifier) {
          API.getItem(identifier)
            .done(onSelectItem)
            .fail(function(error) {
              // TODO shouldn't happen unless connection or backend is down
              // TODO show error popup
            });
        },

        onFilterByReference = function(reference) {
          // TODO support filter by person | period
          state.updateFilters({ places : [ reference.identifiers[0] ] }).done(function(results) {
            resultList.setFilteredResponse(results, reference);
          });
        },

        /** Local search sets a filter to the place, but removes the query **/
        onLocalSearch = function(place) {
          var identifiers = ItemUtils.getURIs(place),
              filter = { places : [ identifiers[0] ] };

          state.setQueryPhrase(false, NOOP);
          state.updateFilters(filter).done(function(results) {
            resultList.setLocalResponse(results, place);
          });
        },

        onExitFilteredSearch = function() {
          state.updateFilters({ places : false }).done(function(results) {
            resultList.setSearchResponse(results);
          });
        },

        onOpenFilterPane = function() {
          state.setFilterPaneOpen(true).done(onSearchResponse);
        },

        onCloseFilterPane = function() {
          // TODO this will internally fire a new search request (whose response
          // TODO gets ignored) - that's not really needed!
          state.setFilterPaneOpen(false);
        },

        onQueryPhraseChanged = function(query) {
          // Remove local search filters first, if any
          state.updateFilters({ places : false }, NOOP);
          state.setQueryPhrase(query).done(function(results) {
            onSearchResponse(results);
            map.fitBounds();
          });
        };

    map.on('selectPlace', onSelectMapMarker);
    // TODO just a hack for now
    map.on('move', state.setViewport);

    searchPanel.on('open', onOpenFilterPane);
    searchPanel.on('close', onCloseFilterPane);
    searchPanel.on('queryChange', onQueryPhraseChanged);
    searchPanel.on('timerangeChange', seq(state.setTimerange, onSearchResponse));
    searchPanel.on('selectSuggestOption', onSelectIdentifier);

    selectionPanel.on('select', onSelectIdentifier);
    selectionPanel.on('filterBy', onFilterByReference);
    selectionPanel.on('localSearch', onLocalSearch);

    resultList.on('select', onSelectItem);
    resultList.on('nextPage', seq(state.loadNextPage, resultList.appendPage));
    resultList.on('exitFilteredSearch', onExitFilteredSearch);

    state.on('stateChange', onStateChange);
    state.init();
  });

});
