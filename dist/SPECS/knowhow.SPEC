 cat knowhow.SPEC
Summary:	knowhow agent and server bundle
Name:		knowhow
Version:	<version>
Release:	1%{?dist}
Group:		Applications	
URL:		https://github.com/jfelten/knowhow
BuildRoot:	%{_tmppath}/%{name}-root
License:	GPL-3.0+
Source:		knowhow.tar.gz
Packager:       John Felten
BuildArch:	x86_64
AutoReqProv:	no

%global __os_install_post %{nil}
%define __jar_repack %{nil}

%description
knowhow version:<version> install package

%prep
%setup

%install
mkdir -p $RPM_BUILD_ROOT/usr/lib/node_modules/knowhow
cp -r * $RPM_BUILD_ROOT/usr/lib/node_modules/knowhow

%clean
rm -rf %{buildroot}/*

%preun

%postun
rm -fr /usr/lib/node_modules/knowhow/
rm -f /usr/bin/startKH*

%post -p /bin/bash
ln -s /usr/lib/node_modules/knowhow/scripts/startKHServer_inc.sh /usr/bin/startKHServer
ln -s /usr/lib/node_modules/knowhow/scripts/startKHAgent_inc.sh /usr/bin/startKHAgent
echo "knowhow <version> install files have been installed"

%files
/usr/lib/node_modules/knowhow/*