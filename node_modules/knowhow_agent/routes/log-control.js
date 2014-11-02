socketio = require('socket.io');
var logger = require('winston');
var io;
var fs = require('fs');
var pathlib = require('path');
var process = require('process');

var fileName = pathlib.join(fs.realpathSync(process.cwd()), 'agent.log.json');
var stdOutFileName = pathlib.join(fs.realpathSync(process.cwd()), 'agent.out');

//configure winston logger;
logger.setLevels({debug:0,info: 1,silly:2,warn: 3,error:4,});
//logger.addColors({debug: 'green',info:  'cyan',silly: 'magenta',warn:  'yellow',error: 'red'});
logger.remove(logger.transports.Console);
logger.add(logger.transports.Console, { level: 'debug' });
logger.add(logger.transports.File, { filename: fileName });
exports.logger = logger;

hook_writestream = function(stream, callback) {
        var old_write = stream.write;

        stream.write = (function(write) {
            return function(string, encoding, fd) {
                write.apply(stream, arguments);
                callback(string, encoding, fd);
            };
        })(stream.write);

        return function() {
            stream.write = old_write;
        }
};

//create a new stdout file stream
var stdoutFS = fs.createWriteStream(stdOutFileName, {
    encoding: 'utf8',
    flags   : 'a+'
});

//create a new stderr file stream
var stderrFS = fs.createWriteStream(stdOutFileName, {
    encoding: 'utf8',
    flags   : 'a+'
});


//pipe stdout to the log file
var unhookStdout = hook_writestream(process.stdout, function(string, encoding, fd) {
    stdoutFS.write(string, encoding || 'utf8');
});

//pipe stderr to the log file
var unhookStderr = hook_writestream(process.stderr, function(string, encoding, fd) {
    stderrFS.write(string, encoding || 'utf8');
});

logger.info('redirecting standard out and error to: '+stdOutFileName);

LoggerControl = function(io) {
	logger.info('setting event io to:'+io);
	this.io = io.of('/logs');
	logger.info("Logger initializing.");
	fs.exists(fileName, function(exists) {
	    if (exists) {
	    	Tail = require('tail').Tail;
	    	tail = new Tail(stdOutFileName);
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
		var text = '';
        fs.open(stdOutFileName, 'r', function(err, fd) {
            if(err) throw err;
            var i = 0;
            lineNum=0;
            
            var readPrevious = function(buf) {
                fs.read(fd, buf, 0, buf.length, stat.size-buf.length-i, function(err, bytesRead, buffer) {
                    if(err) throw err;
                    text = String.fromCharCode(buffer[0]) + text;
                    //logger.debug(text);
                    if (buffer[0] === 0x0a) { //0x0a == '\n'
                        //logger.debug('line # '+lineNum+' read.');
                        lineNum++;
                        if (lineNum >= numLines) {
                            //logger.debug('done retrieving logs');
                            //text='{\"messages\": ['+text;
                            //logger.debug("tail logs: "+text);
                        	callback(text);
                        } else {
                        	if (i>0) {
                        		text=','+text;
                        	}
                        	i++;
                        	
                        	readPrevious(new Buffer(1));
                        }
                    } else {
                        //logger.debug("decode char="+String.fromCharCode(buffer[0]));
                        //logger.debug("char="+buffer[0]);
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