/**
 * jsString
 *
 * Copyright 2007 Alan Kang
 *  - mailto:mail@nathfisher.com
 *  - http://nathfisher.com
 *
 * http://code.google.com/p/jsstring/
 *
 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public
 * License as published by the Free Software Foundation; either
 * version 2.1 of the License, or (at your option) any later version.
 *
 * This library is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with this library; if not, write to the Free Software
 * Foundation, Inc, 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301, USA
 */
 
/**
 * Check out the tests  in /tests for usage examples
 */


String.prototype.$s = function(){

	var dollars = this.match(/\\?\$(\w*)((\.\w*)|\[('|")?\w*('|")?\])*/g);
	var evalString = this;
	if(dollars){
		for(var i=0; i<dollars.length; i++){
			var varName = dollars[i].substring(1,dollars[i].length);
			var escapedDollarRegex = /^\\\$/;
			if(dollars[i].match(escapedDollarRegex)){
				evalString = evalString.replace(dollars[i],dollars[i].replace(escapedDollarRegex,"$"));
			}else{
				evalString = evalString.replace(dollars[i],'"+'+varName+'+"');
			}
		}
	}
	return '"'+evalString+'"';
}

//var $s = eval;


var evaluator = function() {
		
}

evaluator.prototype.substitute = function(input) {
    return $s(input)
}

module.exports = String;