
/*
 * GET home page.
 */

exports.index = function(req, res){
  console.log('index');
  res.render('index');
};

exports.partials = function (req, res) {
  var name = req.params.name;
  console.log('getting partial: '+name);
  res.render('partials/' + name);
};