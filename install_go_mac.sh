# set version and distro
export VERSION=1.17.5
export DISTRO=darwin-amd64
export INSTALL_PATH=/usr/local
echo "go version: ${VERSION}"
echo "go distro: ${DISTRO}"
echo "go install path: ${INSTALL_PATH}"

# example version(s)
# https://dl.google.com/go/go1.11.4.linux-amd64.tar.gz
# https://dl.google.com/go/go1.11.4.linux-armv6l.tar.gz
echo 'Downloading golang'
wget https://dl.google.com/go/go1.11.4.linux-armv6l.tar.gz
sudo tar -C /usr/local -xzf go$VERSION.$DISTRO.tar.gz
export PATH=$PATH:/usr/local/go/bin
rm go$VERSION.$DISTRO.tar.gz