# execute this on VM by running:
# 'bash <filename>' or 'chmod +x <filename> && ./<filename>'

rm -rf /compass/build/packages/scripts

mkdir -p /compass/build/scripts
unzip -n -d /compass scripts.zip
rm scripts.zip