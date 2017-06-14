require.config({
  baseUrl : "/assets/javascripts",
  fileExclusionRegExp : /^lib$/,
  modules : [
    { name : 'admin/datasets/annotations' },
    { name : 'admin/datasets/csv' },
    { name : 'admin/authorities/gazetteers' },
    { name : 'admin/authorities/people' },
    { name : 'ui/app' }
  ]
});
