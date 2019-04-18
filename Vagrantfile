
Vagrant.configure("2") do |config|
    config.vm.define 'db' do |node|
        node.vm.provider "virtualbox" do |v|
            v.memory = 256
        end
        node.vm.box = "bento/ubuntu-18.04"

        node.vm.network "forwarded_port", guest: 27017, host: 27017, host_ip: "127.0.0.1"

        node.vm.provision "shell", inline: %Q[
            apt-get install -y mongodb-server;
            /bin/echo -e 'use blockex\n db.createUser( { user: "blockexuser", pwd: "blockex", roles: [ "readWrite" ] } ) ' | mongo;
            echo 'auth = true' >> /etc/mongodb.conf;
            sed -i 's/bind_ip = 127.0.0.1/bind_ip = 0.0.0.0/g' /etc/mongodb.conf;
            systemctl restart mongodb.service;
        ]
    end
end
