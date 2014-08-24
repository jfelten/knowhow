connect = require('connect');
socketio = require('socket.io');
var logger = require('winston');
var io;
var fs = require('fs');
fileName = __dirname+'/../public/log-files/agent.log.json';

logger.setLevels({debug:0,info: 1,silly:2,warn: 3,error:4,});
logger.addColors({debug: 'green',info:  'cyan',silly: 'magenta',warn:  'yellow',error: 'red'});
logger.remove(logger.transports.Console);
logger.add(logger.transports.Console, { level: 'debug', colorize:true });
logger.add(logger.transports.File, { filename: fileName });
exports.logger = logger;

LoggerControl = function(io) {
	logger.info('setting event io to:'+io);
	this.io = io.of('/logs');
	logger.info("Logger initializing.");
	fs.exists(fileName, function(exists) {
	    if (exists) {
	    	Tail = require('tail').Tail;
	    	tail = new Tail(fileName);
	    	tail.on('line', function(data) {
	    		io.sockets.emit('new-data', {
	    			channel: 'stdout',
	    			    value: data
	    		});
	    		  
	    	});
	    }
	});
	


	io.sockets.on('connection', function (socket) {
//		getLastXLogs(20, io);
//		logger.info("tail file #{fileName");
//		socket.emit('new-data', {
//			channel: 'stdout',
//			value: "tail file #{fileName"
//		});
	    
	});
	
};

getLastXLogs = function(numLines,callback) {
	
	fs.stat(fileName, function(err, stat) {
		var text = ']}';
        fs.open(fileName, 'r', function(err, fd) {
            if(err) throw err;
            var i = 0;
            lineNum=0;
            
            var readPrevious = function(buf) {
                fs.read(fd, buf, 0, buf.length, stat.size-buf.length-i, function(err, bytesRead, buffer) {
                    if(err) throw err;
                    text = String.fromCharCode(buffer[0]) + text;
                    logger.debug(text);
                    if (buffer[0] === 0x0a) { //0x0a == '\n'
                        logger.debug('line # '+lineNum+' read.');
                        lineNum++;
                        if (lineNum >= numLines) {
                            logger.debug('done retrieving logs');
                            text='{\"messages\": ['+text;
                        	callback(JSON.parse(text));
                        } else {
                        	if (i>0) {
                        		text=','+text;
                        	}
                        	i++;
                        	
                        	readPrevious(new Buffer(1));
                        }
                    } else {
                        logger.debug("char="+String.fromCharCode(buffer[0]));
                        i++;
                        readPrevious(new Buffer(1));
                    }
                });
            };
            readPrevious(new Buffer(1));
        });

	});
}

exports.getLastXLogs = getLastXLogs;