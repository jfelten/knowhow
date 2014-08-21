import os
import shutil
import re

from java.util import Properties
from java.io import FileOutputStream,FileInputStream

configPropFile = sys.argv[1]

propInputStream = FileInputStream(configPropFile)
configProps = Properties()
configProps.load(propInputStream)
user=configProps.get("username")
default_password=configProps.get("password")
password=default_password
#override with passed in user/password
if (len(sys.argv) > 2):
    print "overriding user/password through command line."
    user=sys.argv[2]
    password=sys.argv[3]


def createDomainTemplate(domainName):
    templateDir='/opt/weblogic/wlserver_10.3/common/templates/domains'
    templateName = '/opt/weblogic/wlserver_10.3/common/templates/domains/wls.jar'    
    #=======================================================================================
    # Open a domain template.
    #=======================================================================================
    
    readTemplate(templateName)
    
    #=======================================================================================
    # Configure the Administration Server and SSL port.
    #
    # To enable access by both local and remote processes, you should not set the 
    # listen address for the server instance (that is, it should be left blank or not set). 
    # In this case, the server instance will determine the address of the machine and 
    # listen on it. 
    #=======================================================================================
    
    cd('Servers/AdminServer')
    set('ListenAddress','')
    set('ListenPort',7001)

    #=======================================================================================
    # Define the user password for weblogic.
    #=======================================================================================
    
    cd('/')
    cd('Security/base_domain/User/weblogic')
    print('setting password: '+password)
    set('Password',password) 
    
    
    #=======================================================================================
    # Write the domain and close the domain template.
    #=======================================================================================
    newTemplateName=templateDir+os.sep+domainName+'.jar'
    print('writing template: '+newTemplateName)    
    os.system('rm -rf '+newTemplateName)
    writeTemplate(newTemplateName)
    closeTemplate()
    print('done')    
    #=======================================================================================
    # Exit WLST.
    #=======================================================================================
    
    return newTemplateName


def createNMDirectory(wl_home, domainDir, domainName):
    # first create the node manager directory
    print 'creating node manager directory:'

    node_manager_dir=domainDir+os.sep+domainName+os.sep+'nodemanager'
    os.system('mkdir -p '+node_manager_dir)

    input_file=wl_home+os.sep+'server'+os.sep+'bin'+os.sep+'startNodeManager.sh'
    output_file=domainDir+os.sep+domainName+os.sep+'startNodeManager.sh'
    os.system('cp '+input_file+' '+output_file)
    
    #make startNodeManager executeable 
    command = "chmod +x "+output_file
    os.system(command)

    #create the node nmmanager.properties
    nm_prop_file=domainDir+os.sep+domainName+os.sep+'nodemanager.properties'
    nm_props = Properties()
    d = os.path.dirname( node_manager_dir)
    if os.path.exists(nm_prop_file):
        nm_props.load(FileInputStream(nm_prop_file))
    
    #nm_props.put("ListenAddress","localhost")
    nm_props.put("ListenPort",'5556')
    nm_props.put("SecureListener","true")
    #save properties to nodemanager.properties file

    KEYSTORE_PASSWORD="welcome1"
    #keystore configuration
    nm_props.put("KeyStores","CustomIdentityAndCustomTrust")
    nm_props.put("CustomIdentityKeyStoreFileName",domainDir+os.sep+domainName+os.sep+'cert'+os.sep+'LeapFrogIdentity.jks')
    nm_props.put("CustomIdentityKeyStorePassPhrase",KEYSTORE_PASSWORD)
    nm_props.put("CustomIdentityAlias","LEAPFROG")
    nm_props.put("CustomIdentityPrivateKeyPassPhrase",KEYSTORE_PASSWORD)
    
    nm_props.put("DomainsFile","/opt/weblogic/user_projects/domains/leapfrog/nodemanager.domains")
    nm_props.put("LogLimit","0")
    nm_props.put("PropertiesVersion","10.3")
    nm_props.put("DomainsDirRemoteSharingEnabled","false")
    nm_props.put("javaHome","/usr/java/jdk1.6.0_31")
    nm_props.put("AuthenticationEnabled","true")
    nm_props.put("NodeManagerHome","/opt/weblogic/user_projects/domains/leapfrog")
    nm_props.put("JavaHome","/usr/java/jdk1.6.0_31/jre")
    nm_props.put("LogLevel","INFO")
    nm_props.put("DomainsFileEnabled","true")
    nm_props.put("StartScriptName","startWebLogic.sh")
    nm_props.put("NativeVersionEnabled","true")
    nm_props.put("ListenPort","5556")
    nm_props.put("LogToStderr","true")
    nm_props.put("SecureListener","true")
    nm_props.put("LogCount","1")
    nm_props.put("DomainRegistrationEnabled","false")
    nm_props.put("StopScriptEnabled","false")
    nm_props.put("QuitEnabled","false")
    nm_props.put("LogAppend","true")
    nm_props.put("StateCheckInterval","500")
    nm_props.put("CrashRecoveryEnabled","false")
    ##StartScriptEnabled=false
    nm_props.put("StartScriptEnabled","true")
    nm_props.put("LogFile","/opt/weblogic/user_projects/domains/leapfrog/nodemanager/nodemanager.log")
    nm_props.put("LogFormatter","weblogic.nodemanager.server.LogFormatter")
    nm_props.put("ListenBacklog","50")

    #keystore configuration
    # KeyStores=CustomIdentityAndCustomTrust
    # CustomIdentityKeyStoreFileName=/opt/weblogic/user_projects/domains/leapfrog/cert/LeapFrogIdentity.jks
    # CustomIdentityKeyStorePassPhrase={3DES}9fmsjvWqhC9ws/c0VNImWg==
#CustomIdentityAlias=LEAPFROG


    #turn off native libs because of incompatibilities
    nm_props.put("NativeVersionEnabled","false")

    nm_props.store(FileOutputStream(nm_prop_file), None);
#Conditionally import wlstModule only when script is executed with jython
if __name__ == '__main__': 
    from wlstModule import *#@UnusedWildImport

#templateName=createDomainTemplate()
domainName='leapfrog'
mw_home='/opt/weblogic'
wl_home=mw_home+'/wlserver_10.3'

domainDir=mw_home+'/user_projects/domains'
try:
    shutil.rmtree(domainDir+os.sep+domainName)
    print 'removed existing domain dir...'
except:
    print domainDir+os.sep+domainName+' does not currently exist'

templateName=createDomainTemplate(domainName)
os.system('rm -rf '+domainDir+os.sep+domainName)
createDomain(templateName, domainDir+os.sep+domainName, user, password)
createNMDirectory(wl_home, domainDir, domainName)
os.system('echo \"export CLASSPATH=\\\"/opt/weblogic/user_projects/domains/leapfrog/lib/protocol.jar:\\${CLASSPATH}\\\"\" >> /opt/weblogic/user_projects/domains/leapfrog/bin/setDomainEnv.sh')

exit()
