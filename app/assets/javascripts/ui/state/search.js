define([], function() {

      /** Number of results per page **/
  var PAGE_SIZE = 20,

      // To throttle traffic, we'll stay idle between requests for this time in millis
      IDLE_MS = 200;

  var Search = function() {

    var self = this,

        searchArgs = {

          query: false,

          filters: {}, // key -> [ value, value, value, ...]

          timerange: { from: false, to : false },

          settings: {

            timeHistogram : false,

            termAggregations: false,

            topPlaces: true

          }

        },

        currentOffset = 0,

        // Are we currently waiting for an API response?
        busy = false,

        // Did additional requests arrive while busy?
        requestPending = false,

        /** Returns (a clone of) the current search args **/
        getCurrentArgs = function() {
          return jQuery.extend({}, searchArgs);
        },

        // DRY helper
        appendIfExists = function(param, key, url) {
          if (param) return url + '&' + key + '=' + param;
          else return url;
        },

        buildBaseQuery = function() {
          var url = '/api/search?limit=' + PAGE_SIZE;

          url = appendIfExists(searchArgs.query, 'q', url);

          for (var f in searchArgs.filters) {
            url += '&' + f + '=' + encodeURIComponent(searchArgs.filters[f]);
          }

          url = appendIfExists(searchArgs.timerange.from, 'from', url);
          url = appendIfExists(searchArgs.timerange.to, 'to', url);

          return url;
        },

        buildFirstPageQuery = function() {
          var url = buildBaseQuery(),
              settings = searchArgs.settings;

          // First page query includes aggregations
          url = appendIfExists(settings.timeHistogram, 'time_histogram', url);
          url = appendIfExists(settings.termAggregations, 'facets', url);
          url = appendIfExists(settings.topPlaces, 'top_places', url);

          // Reset offset for subsequent next page queries
          currentOffset = 0;

          return url;
        },

        buildNextPageQuery = function() {
          // TODO more to come later
          return buildBaseQuery() + '&offset=' + (currentOffset + PAGE_SIZE);
        },

        makeRequest = function() {

          var deferred = jQuery.Deferred(),

              handlePending = function() {
                if (requestPending) {
                  request();
                  requestPending = false;
                } else {
                  // Throttling: no request pending right now? Wait a bit
                  setTimeout(function() {
                    if (requestPending)
                      handlePending();
                    else
                      // Still nothing? Clear busy flag.
                      busy = false;
                  }, IDLE_MS);
                }
              },

              request = function() {
                jQuery.getJSON(buildFirstPageQuery(), function(response) {
                  deferred.resolve(response);
                }).always(handlePending);
              };

          if (busy) {
            requestPending = true;
          } else {
            busy = true;
            request();
          }

          return deferred.promise(this);
        },

        loadNextPage = function() {
          var deferred = jQuery.Deferred();

          jQuery.getJSON(buildNextPageQuery(), function(response) {
            currentOffset = response.offset;
            deferred.resolve(response);
          });

          return deferred.promise(this);
        },

        set = function(args) {
          searchArgs = args;
          makeRequest();
        },

        // TODO promise
        clear = function(refreshUI) {
          var refresh = refreshUI !== false; // default true

          searchArgs.query = false;
          searchArgs.filters = {};
          searchArgs.timerange = { from: false, to : false };

          if (refresh)
            makeRequest();
        },

        setQuery = function(query) {
          searchArgs.query = query;
          return makeRequest();
        },

        updateFilters = function(diff, preventDefault) {
          jQuery.extend(searchArgs.filters, diff);
          return makeRequest(preventDefault);
        },

        setTimerange = function(range) {
          searchArgs.timerange = range;
          return makeRequest();
        },

        updateSettings = function(diff) {
          jQuery.extend(searchArgs.settings, diff);
          return makeRequest();
        },

        setAggregationsEnabled = function(enabled) {
          return updateSettings({
            timeHistogram    : enabled,
            termAggregations : enabled,
          });
        };

    this.clear = clear;
    this.getCurrentArgs = getCurrentArgs;
    this.loadNextPage = loadNextPage;
    this.set = set;
    this.setAggregationsEnabled = setAggregationsEnabled;
    this.setQuery = setQuery;
    this.setTimerange = setTimerange;
    this.updateFilters = updateFilters;
    this.updateSettings = updateSettings;
  };

  return Search;

});
