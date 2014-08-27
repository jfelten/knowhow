
var env = {
		      "MW_HOME": "/opt/weblogic2",
		      "WL_HOME": "${MW_HOME}/wlserver",
		      "NM_HOME": "${DOMAIN_DIR}/${DOMAIN_NAME}",
		      "DOMAIN_DIR": "${MW_HOME}/user_projects/domain",
		      "DOMAIN_NAME": "leapfrog",
		      "JAVA_HOME": "/usr/java/default/",
		      "WL_ADMIN_USER": "weblogic",
		      "WL_ADMIN_PASSWORD": "welcome1",
		      "TFILE": "out.tmp"
		    };
    
var MW_HOME = 'opt/weblogic';
var WL_HOME = '$MW_HOME/wlserver';   



replaceVar = function(regEx,varName) {
    var iteration=0;
	while( res = regEx.exec(env[variable]) ){
		 for (i=0; i < res.length; i++) {
	        var replaceVal = res[i];
	    	var value = env[replaceVal.replace('\${','').replace('}','')];
	    	env[varName]=env[varName].replace(replaceVal,value);
	      }
	      if (regEx.exec(env[variable])) {
	      	replaceVar(regEx,varName);
	      }
	}
}

var dollarRE = /\$\w+/g
var dollarBracketRE = /\${\w*}/g
for (variable in env) {
	replaceVar(dollarRE,variable);
	replaceVar(dollarBracketRE,variable);
	console.log(variable+'='+env[variable])
}