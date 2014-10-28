var logger=require('./log-control').logger;

/*
 * GET home page.
 */

exports.index = function(req, res){
  logger.info('index');
  res.render('index');
};

exports.partials = function (req, res) {
  var name = req.params.name;
  logger.info('getting partial: '+name);
  res.render('partials/' + name);
};