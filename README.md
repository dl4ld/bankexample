# bank example

## run
install rabbitmq using docker
```
docker run -d --hostname my-rabbit --name some-rabbit -p 15672:15672 -p 5672:5672  -e RABBITMQ_DEFAULT_USER=user -e RABBITMQ_DEFAULT_PASS=password rabbitmq:3-management
```
pull repo
```
git clone https://github.com/dl4ld/bankexample.git
```
install dependencies
``` 
npm install
```
run example
```
nodejs index.js -c ./cfg.local.json
```
