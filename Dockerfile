FROM node:11.1.0-alpine

# 安装常用工具
RUN cd /etc/apk/ && echo "https://mirrors.ustc.edu.cn/alpine/v3.6/main/" > repositories \
    && echo "https://mirrors.ustc.edu.cn/alpine/v3.6/community/" >> repositories \
    && apk update && apk add curl

WORKDIR /home/www/push

COPY package.json entrypoint.sh ./

RUN npm config set registry https://registry.npm.taobao.org \
    && npm install

COPY . .

RUN chmod +x ./entrypoint.sh \
    && mkdir .runtime \
    && chmod -R a+w .runtime/

ENTRYPOINT ["./entrypoint.sh"]
